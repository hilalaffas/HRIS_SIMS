package sys.hris.sims.notification.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

// [BARU] Ringkasan ringan untuk polling saat dropdown lonceng tertutup:
// hanya jumlah belum dibaca + sampai 5 notifikasi belum dibaca terbaru
// (tanpa hitung total & tanpa halaman penuh).
@Data
@AllArgsConstructor
public class NotificationSummaryResponse {
    private long unreadCount;
    private List<NotificationResponse> latestUnread;
}
