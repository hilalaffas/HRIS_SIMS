package sys.hris.sims.common.cache;

import java.util.function.Supplier;

// [BARU] Cache SATU nilai dengan masa berlaku singkat (TTL), tanpa dependency tambahan.
// Dipakai untuk data kecil yang sering dibaca tetapi jarang berubah (mis. feature flag, jenis cuti).
// Aman terhadap perubahan di luar aplikasi: paling lama data basi selama TTL, dan service pemiliknya
// memanggil clear() tepat setelah data diubah sehingga perubahan lewat aplikasi langsung terlihat.
public final class TtlCache<V> {

    private final long ttlMillis;
    private volatile V value;
    private volatile long expiresAt;

    public TtlCache(long ttlMillis) {
        this.ttlMillis = ttlMillis;
    }

    public V get(Supplier<V> loader) {
        V current = value;
        if (current != null && System.currentTimeMillis() < expiresAt) {
            return current;
        }
        synchronized (this) {
            current = value;
            if (current != null && System.currentTimeMillis() < expiresAt) {
                return current; // sudah dimuat thread lain
            }
            V loaded = loader.get();
            value = loaded;
            expiresAt = System.currentTimeMillis() + ttlMillis;
            return loaded;
        }
    }

    public void clear() {
        synchronized (this) {
            value = null;
            expiresAt = 0L;
        }
    }
}
