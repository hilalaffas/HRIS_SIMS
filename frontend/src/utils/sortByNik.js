// [BARU] Pembanding urutan NIK untuk tabel karyawan (tab List Karyawan dan Ringkasan Cuti).
// NIK berupa angka berawalan nol (mis. "0071"), jadi dibandingkan sebagai angka agar
// "0100" tidak muncul sebelum "0043". NIK kosong ditaruh paling akhir.
export const compareByNik = (a, b) => {
  const nikA = a?.nikKaryawan ?? a?.nik ?? '';
  const nikB = b?.nikKaryawan ?? b?.nik ?? '';
  if (!nikA && !nikB) return 0;
  if (!nikA) return 1;
  if (!nikB) return -1;
  return String(nikA).localeCompare(String(nikB), undefined, { numeric: true });
};
