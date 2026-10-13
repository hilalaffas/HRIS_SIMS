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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

// [UBAH] Mengubah koordinat GPS jadi nama lokasi. Sekarang mendukung 3 provider:
//   - GOOGLE      : Google Geocoding API (butuh key + billing Google Cloud)
//   - LOCATIONIQ  : LocationIQ (free plan 5.000 req/hari, tanpa kartu, key SERVER-side)
//   - NOMINATIM   : OpenStreetMap Nominatim (gratis, TANPA key; maks 1 req/detik)
//
// Pemilihan provider (properti geocoding.provider / env GEOCODING_PROVIDER):
//   auto (default) -> GOOGLE bila key Google diisi, lalu LOCATIONIQ bila key LocationIQ
//                     diisi, selain itu NOMINATIM.
//   google | locationiq | nominatim -> paksa provider tertentu (bila key-nya kosong,
//                     otomatis kembali ke mode auto).
//
// KEAMANAN (tidak berubah):
// - API key hanya ada di server, tidak pernah dikirim ke browser.
// - URL request memuat key, jadi pesan exception SENGAJA tidak di-log
//   (RestClientException bisa menyertakan URL lengkap); hanya jenis error.
// - Hasil di-cache per titik (dibulatkan 4 desimal ~11 m) dan dibatasi per-user lewat
//   tryAcquire() agar endpoint tidak bisa dipakai membakar kuota.
// - Kegagalan geocoding TIDAK PERNAH menggagalkan absensi: hasilnya kosong.
//
// KEBIJAKAN NOMINATIM (nominatim.openstreetmap.org): maks 1 request/detik untuk seluruh
// aplikasi (dijaga di reserveNominatimSlot), User-Agent wajib mengidentifikasi aplikasi,
// hasil wajib di-cache. Ubah geocoding.nominatim.base-url bila server perlu diganti.
@Service
public class ReverseGeocodingService {

    private static final Logger log = LoggerFactory.getLogger(ReverseGeocodingService.class);

    private enum Provider { GOOGLE, LOCATIONIQ, NOMINATIM }

    private static final String GOOGLE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
    private static final String LOCATIONIQ_URL = "https://us1.locationiq.com/v1/reverse";
    private static final String DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org";
    private static final String DEFAULT_USER_AGENT = "SIMS-HRIS/1.0";

    private static final int MAX_NAME_LENGTH = 255; // = attendances.location_name VARCHAR(255)
    private static final long CACHE_TTL_MILLIS = 6L * 60 * 60 * 1000;
    private static final int CACHE_MAX_ENTRIES = 1000;

    private static final long RATE_WINDOW_MILLIS = 60_000L;
    private static final int RATE_MAX_PER_WINDOW = 15;

    // Nominatim: jeda minimal antar request (1 detik + sedikit toleransi) dan batas tunggu.
    private static final long NOMINATIM_MIN_GAP_MILLIS = 1_100L;
    private static final long NOMINATIM_MAX_WAIT_MILLIS = 3_000L;

    private record CachedName(String name, long expiresAt) {}

    private final boolean enabled;
    private final Provider provider;
    private final String googleKey;
    private final String locationIqKey;
    private final String nominatimBaseUrl;
    private final String userAgent;

    private final RestTemplate restTemplate = createRestTemplate();
    private final Map<String, CachedName> cache = new ConcurrentHashMap<>();
    private final Map<String, long[]> rateWindows = new ConcurrentHashMap<>(); // username -> {windowStart, count}
    private long nextNominatimSlotAt = 0L; // dijaga oleh synchronized reserveNominatimSlot()

    public ReverseGeocodingService(
            @Value("${geocoding.enabled:true}") boolean enabled,
            @Value("${geocoding.provider:auto}") String configuredProvider,
            @Value("${google.maps.geocoding-api-key:}") String googleKey,
            @Value("${locationiq.api-key:}") String locationIqKey,
            @Value("${geocoding.nominatim.base-url:" + DEFAULT_NOMINATIM_URL + "}") String nominatimBaseUrl,
            @Value("${geocoding.nominatim.user-agent:" + DEFAULT_USER_AGENT + "}") String userAgent) {
        this.enabled = enabled;
        this.googleKey = clean(googleKey);
        this.locationIqKey = clean(locationIqKey);

        String baseUrl = clean(nominatimBaseUrl);
        if (baseUrl.isEmpty()) {
            baseUrl = DEFAULT_NOMINATIM_URL;
        }
        this.nominatimBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;

        String agent = clean(userAgent);
        this.userAgent = agent.isEmpty() ? DEFAULT_USER_AGENT : agent;

        this.provider = chooseProvider(clean(configuredProvider));
        log.info("Reverse geocoding: enabled={}, provider={}", this.enabled, this.provider);
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private Provider chooseProvider(String configured) {
        Provider forced = switch (configured.toLowerCase(Locale.ROOT)) {
            case "google" -> googleKey.isEmpty() ? null : Provider.GOOGLE;
            case "locationiq" -> locationIqKey.isEmpty() ? null : Provider.LOCATIONIQ;
            case "nominatim" -> Provider.NOMINATIM;
            default -> null;
        };
        if (forced != null) {
            return forced;
        }
        if (!configured.isEmpty() && !"auto".equalsIgnoreCase(configured)) {
            log.warn("geocoding.provider='{}' tidak valid atau key-nya kosong; memakai mode auto", configured);
        }
        if (!googleKey.isEmpty()) {
            return Provider.GOOGLE;
        }
        if (!locationIqKey.isEmpty()) {
            return Provider.LOCATIONIQ;
        }
        return Provider.NOMINATIM;
    }

    private static RestTemplate createRestTemplate() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(4000);
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
        if (!enabled) {
            return Optional.empty(); // dimatikan lewat geocoding.enabled=false
        }

        String cacheKey = String.format(Locale.ROOT, "%.4f,%.4f", latitude, longitude);
        long now = System.currentTimeMillis();
        CachedName cached = cache.get(cacheKey);
        if (cached != null && cached.expiresAt() > now) {
            return Optional.of(cached.name());
        }

        try {
            String name = switch (provider) {
                case GOOGLE -> fetchGoogle(latitude, longitude);
                case LOCATIONIQ -> fetchLocationIq(latitude, longitude);
                case NOMINATIM -> fetchNominatim(latitude, longitude);
            };
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
            log.warn("Reverse geocoding gagal (provider={}, {})", provider, e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private static String coord(double value) {
        return String.format(Locale.ROOT, "%.7f", value);
    }

    // ---------------------------------------------------------------- Google

    private String fetchGoogle(double latitude, double longitude) {
        URI uri = UriComponentsBuilder.fromUriString(GOOGLE_URL)
                .queryParam("latlng", coord(latitude) + "," + coord(longitude))
                .queryParam("language", "id")
                .queryParam("key", googleKey)
                .build()
                .toUri();

        Map<?, ?> body = restTemplate.getForObject(uri, Map.class);
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
        return normalizeName(first.get("formatted_address"));
    }

    // ------------------------------------------------------------ LocationIQ

    private String fetchLocationIq(double latitude, double longitude) {
        URI uri = UriComponentsBuilder.fromUriString(LOCATIONIQ_URL)
                .queryParam("key", locationIqKey)
                .queryParam("lat", coord(latitude))
                .queryParam("lon", coord(longitude))
                .queryParam("format", "json")
                .queryParam("accept-language", "id")
                .build()
                .toUri();

        Map<?, ?> body = restTemplate.getForObject(uri, Map.class);
        return extractDisplayName(body, "LocationIQ");
    }

    // ------------------------------------------------------------- Nominatim

    // Jaga 1 request/detik untuk seluruh aplikasi. Mengembalikan lama tunggu (ms) sebelum
    // request boleh dikirim, atau -1 bila antrean terlalu panjang (request dilewati).
    private synchronized long reserveNominatimSlot() {
        long now = System.currentTimeMillis();
        long slot = Math.max(now, nextNominatimSlotAt);
        long wait = slot - now;
        if (wait > NOMINATIM_MAX_WAIT_MILLIS) {
            return -1;
        }
        nextNominatimSlotAt = slot + NOMINATIM_MIN_GAP_MILLIS;
        return wait;
    }

    private String fetchNominatim(double latitude, double longitude) {
        long waitMillis = reserveNominatimSlot();
        if (waitMillis < 0) {
            log.warn("Nominatim: antrean penuh, nama lokasi dilewati");
            return null;
        }
        if (waitMillis > 0) {
            try {
                Thread.sleep(waitMillis);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        }

        URI uri = UriComponentsBuilder.fromUriString(nominatimBaseUrl + "/reverse")
                .queryParam("format", "jsonv2")
                .queryParam("lat", coord(latitude))
                .queryParam("lon", coord(longitude))
                .queryParam("zoom", "18")
                .queryParam("accept-language", "id")
                .build()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, userAgent); // wajib: User-Agent bawaan library ditolak
        headers.set(HttpHeaders.ACCEPT_LANGUAGE, "id");

        var response = restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        return extractDisplayName(response.getBody(), "Nominatim");
    }

    // ---------------------------------------------------------------- Umum

    // Format respons LocationIQ & Nominatim sama: { "display_name": "..." } atau { "error": "..." }.
    private String extractDisplayName(Map<?, ?> body, String providerName) {
        if (body == null) {
            return null;
        }
        if (body.get("error") != null) {
            log.warn("Reverse geocoding ditolak {}: {}", providerName, body.get("error"));
            return null;
        }
        return normalizeName(body.get("display_name"));
    }

    private String normalizeName(Object value) {
        if (!(value instanceof String text) || text.isBlank()) {
            return null;
        }
        String trimmed = text.trim();
        return trimmed.length() > MAX_NAME_LENGTH ? trimmed.substring(0, MAX_NAME_LENGTH) : trimmed;
    }
}
