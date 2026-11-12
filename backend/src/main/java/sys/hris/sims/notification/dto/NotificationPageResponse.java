package sys.hris.sims.notification.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

// content        : halaman yang diminta (default 10 terbaru)
// unreadCount    : total belum dibaca (untuk badge lonceng), bukan hanya di halaman ini
// latestUnread   : sampai 5 notifikasi belum dibaca terbaru -- dipakai frontend untuk
//                  memunculkan popup lonceng HANYA untuk notifikasi yang belum dibaca
@Data
@AllArgsConstructor
public class NotificationPageResponse {
    private List<NotificationResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private long unreadCount;
    private List<NotificationResponse> latestUnread;
}
