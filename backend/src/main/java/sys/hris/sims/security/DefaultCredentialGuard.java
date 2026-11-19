package sys.hris.sims.security;

import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

/**
 * [BARU] Mendeteksi akun yang MASIH memakai password bawaan migration Flyway
 * (V3 admin, V16 SUPERADMIN & akun contoh, V34 supersecret/sys_dev = '1234').
 * Hash-nya ada di repo publik, jadi siapa pun tahu password aslinya.
 *
 * Perilaku: selalu mencatat ERROR di log. Bila FAIL_ON_DEFAULT_CREDENTIALS=true
 * (disarankan di production setelah password diganti), server menolak jalan.
 * Hash tidak pernah dicatat, hanya username.
 */
@Component
public class DefaultCredentialGuard {

    private static final Logger log = LoggerFactory.getLogger(DefaultCredentialGuard.class);

    private static final Set<String> KNOWN_SEED_HASHES = Set.of(
            "$2a$10$B./MAOenqjvMpBuZKPt4Ge4V0oUnxLOW3SwYWJVisNZgSBl7REara", // V3
            "$2a$10$zR2XS6Ch3EBZ1Vg14xFu3.6cKzY2aebrnrt3r6rf6Ss/nHRtub53K", // V16
            "$2b$10$Q0h7HR1YtzGIhA8RcvGHjuOk1efExXx0NZI3y3l4.kwcAcm757eNy"  // V34
    );

    private final UserRepository userRepository;
    private final boolean failOnDefaultCredentials;

    public DefaultCredentialGuard(UserRepository userRepository,
            @Value("${security.fail-on-default-credentials:false}") boolean failOnDefaultCredentials) {
        this.userRepository = userRepository;
        this.failOnDefaultCredentials = failOnDefaultCredentials;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void checkDefaultCredentials() {
        List<String> flagged = userRepository.findAll().stream()
                .filter(user -> user.getPassword() != null && KNOWN_SEED_HASHES.contains(user.getPassword()))
                .map(User::getUsername)
                .toList();

        if (flagged.isEmpty()) {
            return;
        }
        log.error("KEAMANAN: {} akun masih memakai password bawaan repo publik: {}. Ganti password sekarang.",
                flagged.size(), flagged);
        if (failOnDefaultCredentials) {
            throw new IllegalStateException(
                    "Akun dengan password bawaan terdeteksi. Ganti password, atau matikan FAIL_ON_DEFAULT_CREDENTIALS.");
        }
    }
}
