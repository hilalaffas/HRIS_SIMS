package sys.hris.sims.user.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String username;
    private String email;
    private Long idRole;
    private String password;

    // [BARU] Opsional. Dikirim frontend saat modal edit karyawan dibuka dari
    // notifikasi "Lupa Sandi" (lonceng HR). Kalau field ini terisi DAN
    // `password` di atas juga terisi, backend otomatis menandai permintaan
    // reset dengan id ini sebagai selesai -- HR tidak perlu buka form approve
    // terpisah. Lihat UserController.updateUser().
    private Long passwordResetRequestId;
}