// src/utils/validation.js
//
// Helper validasi form yang dipakai BERSAMA di semua halaman (Login,
// Ajukan Cuti, Tambah Karyawan, Hari Libur, Pengumuman, dll) supaya:
//   1. Pesan error selalu spesifik per-field ("Nama perlu diisi.",
//      bukan pesan umum "Lengkapi field yang wajib diisi").
//   2. Field yang error bisa langsung ditandai border merah lewat
//      className "input-error" (untuk <input>/<textarea>) atau
//      "dropdown--invalid" (untuk komponen <Dropdown>).
//
// Dengan begini, aturan "wajib diisi" tidak perlu ditulis ulang manual
// di setiap form -- cukup panggil validateRequired([...]).

/**
 * Mengecek apakah sebuah nilai dianggap "kosong" (belum diisi).
 * Menangani string (di-trim dulu supaya spasi kosong tetap dianggap
 * kosong), null/undefined, dan array kosong (mis. tanggal range).
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

/**
 * Menjalankan sekumpulan aturan "wajib diisi" terhadap field-field form.
 *
 * @param {Array<{ field: string, label: string, value: any, verb?: string }>} rules
 *   - field : nama field, dipakai sebagai key di object `errors` (mis. untuk
 *             className="{errors.namaLengkap ? 'input-error' : ''}").
 *   - label : nama field versi tampilan, dipakai di pesan error.
 *   - value : nilai field saat ini.
 *   - verb  : opsional, default 'diisi'. Pakai 'dipilih' untuk dropdown/opsi
 *             supaya kalimatnya lebih natural (mis. "Divisi perlu dipilih.").
 *
 * @returns {{ errors: Record<string,string>, isValid: boolean,
 *             firstErrorField: string|null, firstErrorMessage: string|null }}
 *
 * Contoh pakai di dalam handleSubmit:
 *   const { errors, isValid, firstErrorMessage } = validateRequired([
 *     { field: 'fullName', label: 'Nama lengkap', value: formData.fullName },
 *     { field: 'gender', label: 'Jenis kelamin', value: formData.gender, verb: 'dipilih' },
 *   ]);
 *   if (!isValid) {
 *     setErrors(errors);
 *     triggerToast(firstErrorMessage, 'error');
 *     return;
 *   }
 */
export const validateRequired = (rules) => {
  const errors = {};
  rules.forEach(({ field, label, value, verb = 'diisi' }) => {
    if (isEmpty(value)) {
      errors[field] = `${label} perlu ${verb}.`;
    }
  });
  const errorFields = Object.keys(errors);
  return {
    errors,
    isValid: errorFields.length === 0,
    firstErrorField: errorFields[0] || null,
    firstErrorMessage: errorFields.length ? errors[errorFields[0]] : null,
  };
};

/**
 * Helper kecil untuk dipakai langsung di className, supaya konsisten dan
 * tidak ada lagi penulisan ternary manual berulang di tiap form:
 *   className={inputErrorClass(errors.namaLengkap)}
 *   className={inputErrorClass(errors.namaLengkap, 'form-control')}
 */
export const inputErrorClass = (hasError, baseClassName = '') =>
  `${baseClassName} ${hasError ? 'input-error' : ''}`.trim();

/**
 * Sama seperti inputErrorClass, tapi untuk komponen <Dropdown> yang
 * pakai class "dropdown--invalid" (lihat components/Dropdown.css).
 */
export const dropdownErrorClass = (hasError, baseClassName = '') =>
  `${baseClassName} ${hasError ? 'dropdown--invalid' : ''}`.trim();
