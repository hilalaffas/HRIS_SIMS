package sys.hris.sims.profile.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProfileResponse {
    String namaLengkap;
    String nikKaryawan;
    String jabatan;
    String alamatLengkap;
    String email;
    String nomorTelepon;
    String divisi;
    String tanggalBergabung;
    String nomorTeleponDarurat;
    String hubunganDarurat;
    String photoUrl;
}
