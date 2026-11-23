// constants/leaveCover.js
// [BARU] Pilihan "Dicover Oleh" untuk form cuti (karyawan & Cuti Susulan HR).
// "-" = tidak ada cover. Nilai ini disimpan apa adanya di kolom covered_by,
// dan backend (LeaveService.validateCoveredBy) mengizinkannya.
export const NO_COVER_VALUE = '-';

// Gabungkan opsi "-" (paling atas) dengan daftar rekan satu divisi.
export const buildCoverDropdownOptions = (coverOptions = []) => [
  { value: NO_COVER_VALUE, label: '- (Tanpa cover)' },
  ...coverOptions.map((person) => ({ value: person.fullName, label: person.fullName })),
];
