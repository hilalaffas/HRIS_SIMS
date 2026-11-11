package sys.hris.sims.featureflag.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sys.hris.sims.featureflag.entity.FeatureFlag;
import sys.hris.sims.common.cache.TtlCache;
import sys.hris.sims.featureflag.repository.FeatureFlagRepository;

@Service
public class FeatureFlagService {

    // Whitelist key yang dikenal. Fitur baru: tambahkan di sini DAN seed-nya
    // lewat migration baru. Key di luar daftar ini ditolak.
    private static final Set<String> MANAGED_KEYS = Set.of("themeToggle");

    // [BARU] Performa: flag di-poll tiap 60 detik oleh SETIAP klien. Hasilnya di-cache 30 detik dan
    // otomatis dibersihkan saat flag diubah lewat setEnabled(), jadi perubahan tetap langsung terlihat.
    private static final long CACHE_TTL_MILLIS = 30_000L;
    private final TtlCache<Map<String, Boolean>> flagsCache = new TtlCache<>(CACHE_TTL_MILLIS);

    private final FeatureFlagRepository featureFlagRepository;

    public FeatureFlagService(FeatureFlagRepository featureFlagRepository) {
        this.featureFlagRepository = featureFlagRepository;
    }

    // Semua flag sebagai peta { key: boolean }. Key yang barisnya belum ada
    // di database dianggap NYALA (sama dengan default seed).
    public Map<String, Boolean> getAll() {
        return new LinkedHashMap<>(flagsCache.get(this::loadAll)); // [UBAH] salinan, supaya cache tidak bisa diubah pemanggil
    }

    private Map<String, Boolean> loadAll() {
        Map<String, Boolean> flags = new LinkedHashMap<>();
        for (String key : MANAGED_KEYS) {
            flags.put(key, true);
        }
        for (FeatureFlag flag : featureFlagRepository.findAll()) {
            if (MANAGED_KEYS.contains(flag.getFlagKey())) {
                flags.put(flag.getFlagKey(), Boolean.TRUE.equals(flag.getEnabled()));
            }
        }
        return flags;
    }

    @Transactional
    public Map<String, Boolean> setEnabled(String key, boolean enabled, String updatedBy) {
        if (!MANAGED_KEYS.contains(key)) {
            throw new IllegalArgumentException("Fitur tidak dikenal: " + key);
        }

        FeatureFlag flag = featureFlagRepository.findById(key).orElseGet(() -> {
            FeatureFlag created = new FeatureFlag();
            created.setFlagKey(key);
            return created;
        });
        flag.setEnabled(enabled);
        flag.setUpdatedBy(updatedBy);
        featureFlagRepository.save(flag);
        flagsCache.clear(); // [BARU] perubahan langsung terlihat

        return getAll();
    }
}
