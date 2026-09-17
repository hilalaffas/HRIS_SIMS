// Aturan validasi file foto profil (dipakai di FormKaryawan.jsx dan
// useProfileForm.js) supaya batas ukuran & tipe file konsisten di semua
// tempat upload foto, dan sinkron dengan batas di backend
// (application.properties + CloudinaryService.java).
export const MAX_PHOTO_SIZE_BYTES = 1024 * 1024; // 1MB
export const MAX_PHOTO_SIZE_LABEL = '1MB';

export const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png'];
export const ALLOWED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// Dipakai langsung sebagai atribut `accept` pada <input type="file">.
// Selain membatasi tampilan preview ikon, ini juga membuat dialog pemilih
// file di Windows/File Explorer otomatis menyaring hanya file JPG/PNG.
export const PHOTO_INPUT_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';

/**
 * Validasi file foto sebelum dikirim ke server.
 * @param {File} file
 * @returns {string|null} pesan error, atau null kalau file valid
 */
export function validatePhotoFile(file) {
  if (!file) return null;

  const fileName = file.name || '';
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  const mimeOk = ALLOWED_PHOTO_MIME_TYPES.includes(file.type);
  const extensionOk = ALLOWED_PHOTO_EXTENSIONS.includes(extension);

  if (!mimeOk || !extensionOk) {
    return 'Tipe file tidak didukung. Hanya file JPG atau PNG yang diperbolehkan.';
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return `Ukuran file foto melebihi batas maksimal ${MAX_PHOTO_SIZE_LABEL}.`;
  }

  return null;
}
