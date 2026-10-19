package sys.hris.sims.devtools.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

// [BARU] Satu-satunya tempat yang tahu akun mana yang berstatus "dev".
// Username akun dev TIDAK ditulis di kode / repo: dibaca dari properti
// `dev.access.username` yang diisi environment variable DEV_ACCESS_USERNAME
// (lihat application.properties). Kalau variabel itu kosong, TIDAK ADA akun
// yang dianggap dev -- panel /devAccess dan semua endpoint /api/dev/** tertutup.
@Service
public class DevAccessService {

    private final String devUsername;

    public DevAccessService(@Value("${dev.access.username:}") String devUsername) {
        this.devUsername = devUsername == null ? "" : devUsername.trim();
    }

    public boolean isDevAccount(String username) {
        return !devUsername.isEmpty()
                && username != null
                && devUsername.equalsIgnoreCase(username.trim());
    }
}
