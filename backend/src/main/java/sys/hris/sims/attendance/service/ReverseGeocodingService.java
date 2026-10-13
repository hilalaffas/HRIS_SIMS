package sys.hris.sims.attendance.service;

import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

// [BARU] Mengubah koordinat GPS jadi nama lokasi lewat Google Geocoding API.
//
// KEAMANAN:
// - API key hanya ada di server (env GOOGLE_MAPS_GEOCODING_API_KEY), tidak
//   pernah dikirim ke browser.
// - URL request memuat key, jadi pesan exception SENGAJA tidak di-log
//   (RestClientException bisa menyertakan URL lengkap); hanya jenis error.
// - Hasil di-cache per titik (dibulatkan 4 desimal ~11 m) supaya popup
//   Dashboard + proses submit tidak membayar dua kali, dan dibatasi
//   per-user lewat tryAcquire() agar endpoint tidak bisa dipakai membakar kuota.
// - Kegagalan geocoding TIDAK PERNAH menggagalkan absensi: hasilnya kosong.
@Service
public class ReverseGeocodingService {

    private static final Logger log = LoggerFactory.getLogger(ReverseGeocodingService.class);

    private static final String GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
    private static final int MAX_NAME_LENGTH = 255; // = attendances.location_name VARCHAR(255)
    private static final long CACHE_TTL_MILLIS = 6L * 60 * 60 * 1000;
    private static final int CACHE_MAX_ENTRIES = 1000;

    private static final long RATE_WINDOW_MILLIS = 60_000L;
    private static final int RATE_MAX_PER_WINDOW = 15;

    private record CachedName(String name, long expiresAt) {}

    private final String apiKey;
    private final RestTemplate restTemplate = createRestTemplate();
    private final Map<String, CachedName> cache = new ConcurrentHashMap<>();
    private final Map<String, long[]> rateWindows = new ConcurrentHashMap<>(); // username -> {windowStart, count}

    public ReverseGeocodingService(@Value("${google.maps.geocoding-api-key:}") String apiKey) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    private static RestTemplate createRestTemplate() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(3000);
        return new RestTemplate(factory);
    }

    // Pembatas sederhana (jendela tetap 1 menit) per username.
    public boolean tryAcquire(String username) {
        long now = System.currentTimeMillis();
        boolean[] allowed = new boolean[1];
        rateWindows.compute(username, (key, window) -> {
            if (window == null || now - window[0] >= RATE_WINDOW_MILLIS) {
                allowed[0] = true;
                return new long[] { now, 1 };
            }
            if (window[1] < RATE_MAX_PER_WINDOW) {
                window[1]++;
                allowed[0] = true;
            }
            return window;
        });
        return allowed[0];
    }

    public Optional<String> resolveName(double latitude, double longitude) {
        if (apiKey.isEmpty()) {
            return Optional.empty(); // fitur nonaktif sampai key diatur
        }

        String cacheKey = String.format(Locale.ROOT, "%.4f,%.4f", latitude, longitude);
        long now = System.currentTimeMillis();
        CachedName cached = cache.get(cacheKey);
        if (cached != null && cached.expiresAt() > now) {
            return Optional.of(cached.name());
        }

        try {
            URI uri = UriComponentsBuilder.fromUriString(GEOCODE_URL)
                    .queryParam("latlng", String.format(Locale.ROOT, "%.7f,%.7f", latitude, longitude))
                    .queryParam("language", "id")
                    .queryParam("key", apiKey)
                    .build()
                    .toUri();

            Map<?, ?> body = restTemplate.getForObject(uri, Map.class);
            String name = extractFormattedAddress(body);
            if (name == null) {
                return Optional.empty();
            }

            if (cache.size() >= CACHE_MAX_ENTRIES) {
                cache.clear(); // batas memori sederhana
            }
            cache.put(cacheKey, new CachedName(name, now + CACHE_TTL_MILLIS));
            return Optional.of(name);
        } catch (RuntimeException e) {
            // Jangan log e.getMessage(): bisa memuat URL beserta API key.
            log.warn("Reverse geocoding gagal ({})", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private String extractFormattedAddress(Map<?, ?> body) {
        if (body == null) {
            return null;
        }
        Object status = body.get("status");
        if (!"OK".equals(status)) {
            // Mis. REQUEST_DENIED (key salah/dibatasi), OVER_QUERY_LIMIT, ZERO_RESULTS.
            log.warn("Reverse geocoding ditolak Google: status={}", status);
            return null;
        }
        if (!(body.get("results") instanceof List<?> results) || results.isEmpty()) {
            return null;
        }
        if (!(results.get(0) instanceof Map<?, ?> first)) {
            return null;
        }
        if (!(first.get("formatted_address") instanceof String address) || address.isBlank()) {
            return null;
        }
        String trimmed = address.trim();
        return trimmed.length() > MAX_NAME_LENGTH ? trimmed.substring(0, MAX_NAME_LENGTH) : trimmed;
    }
}
