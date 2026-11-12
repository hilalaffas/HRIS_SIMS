package sys.hris.sims.notification.service;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.notification.dto.NotificationPageResponse;
import sys.hris.sims.notification.dto.NotificationResponse;
import sys.hris.sims.notification.entity.Notification;
import sys.hris.sims.notification.repository.NotificationRepository;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    // Tipe notifikasi (sama persis dengan kunci di frontend config/notificationRoutes.js)
    public static final String TYPE_LEAVE_APPROVED = "approved";
    public static final String TYPE_LEAVE_STEP_APPROVED = "step-approved";
    public static final String TYPE_LEAVE_RETURNED = "returned";
    public static final String TYPE_LEAVE_REJECTED = "rejected";
    public static final String TYPE_LEAVE_APPROVAL = "leave-approval";
    public static final String TYPE_PASSWORD_RESET = "password-reset";
    public static final String TYPE_SICK_APPROVED = "sick-approved";
    public static final String TYPE_SICK_REJECTED = "sick-rejected";

    private static final int MAX_PAGE_SIZE = 50;
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // ===================== MEMBUAT NOTIFIKASI =====================

    /**
     * Simpan satu notifikasi dalam transaksi pemanggil (approval cuti, dst), jadi
     * notifikasi ikut batal kalau prosesnya batal -- tidak ada notifikasi "hantu".
     * Hanya kegagalan serialisasi params yang ditelan (diganti JSON kosong).
     */
    public void notifyUser(User recipient, String type, Long referenceId, Map<String, Object> params) {
        if (recipient == null || recipient.getUserId() == null) {
            return;
        }
        String json = "{}";
        try {
            json = objectMapper.writeValueAsString(params == null ? Map.of() : params);
        } catch (Exception ex) {
            log.warn("Params notifikasi {} gagal diserialisasi: {}", type, ex.getMessage());
        }
        notificationRepository.save(Notification.builder()
                .userId(recipient.getUserId())
                .type(type)
                .referenceId(referenceId)
                .params(json)
                .createdAt(LocalDateTime.now())
                .build());
    }

    public void notifyUsers(Collection<User> recipients, String type, Long referenceId, Map<String, Object> params) {
        if (recipients == null) {
            return;
        }
        recipients.stream().distinct().forEach(user -> notifyUser(user, type, referenceId, params));
    }

    /** Penerima untuk permintaan reset sandi: seluruh akun HRD_ADMIN & SUPER_ADMIN. */
    public List<User> findPasswordResetRecipients() {
        return userRepository.findByRoleNamesUpper(List.of("HRD_ADMIN", "SUPER_ADMIN"));
    }

    // ===================== MEMBACA =====================

    @Transactional(readOnly = true)
    public NotificationPageResponse list(String username, int page, int size) {
        Long userId = requireUserId(username);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

        Page<Notification> result = notificationRepository.findByUserId(userId,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));

        return new NotificationPageResponse(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                notificationRepository.countByUserIdAndReadAtIsNull(userId),
                notificationRepository.findTop5ByUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(userId)
                        .stream().map(this::toResponse).toList());
    }

    // ===================== MENGUBAH =====================

    @Transactional
    public void markRead(String username, Long id) {
        Long userId = requireUserId(username);
        notificationRepository.markRead(id, userId, LocalDateTime.now());
    }

    @Transactional
    public int markAllRead(String username) {
        return notificationRepository.markAllRead(requireUserId(username), LocalDateTime.now());
    }

    /** Hapus satu notifikasi -- hanya boleh kalau sudah dibaca. */
    @Transactional
    public void deleteRead(String username, Long id) {
        Long userId = requireUserId(username);
        int deleted = notificationRepository.deleteIfRead(id, userId);
        if (deleted == 0) {
            if (!notificationRepository.existsByIdAndUserId(id, userId)) {
                throw new IllegalArgumentException("Notifikasi tidak ditemukan.");
            }
            throw new IllegalStateException("Hanya notifikasi yang sudah dibaca yang dapat dihapus.");
        }
    }

    @Transactional
    public int deleteAllRead(String username) {
        return notificationRepository.deleteAllRead(requireUserId(username));
    }

    /** Dipanggil job pembersihan. Mengembalikan jumlah baris yang dihapus. */
    @Transactional
    public int purgeOlderThan(LocalDateTime cutoff) {
        return notificationRepository.deleteOlderThan(cutoff);
    }

    // ===================== HELPER =====================

    private Long requireUserId(String username) {
        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new IllegalArgumentException("User tidak ditemukan.");
        }
        return user.getUserId();
    }

    private NotificationResponse toResponse(Notification n) {
        Map<String, Object> params = new LinkedHashMap<>();
        if (n.getParams() != null && !n.getParams().isBlank()) {
            try {
                params = objectMapper.readValue(n.getParams(), MAP_TYPE);
            } catch (Exception ex) {
                log.warn("Params notifikasi {} tidak valid: {}", n.getId(), ex.getMessage());
            }
        }
        return new NotificationResponse(n.getId(), n.getType(), n.getReferenceId(), params,
                n.getCreatedAt(), n.getReadAt() != null);
    }
}
