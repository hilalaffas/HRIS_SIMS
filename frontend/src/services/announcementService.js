import { api } from './api';

const mapNews = (news) => ({
  id: news.id,
  judul: news.title,
  label: news.category || 'info',
  isi: news.content,
  author: news.createdBy || 'HRD',
  createdAt: news.createdAt,
  updatedAt: news.updatedAt,
  // [BARU] Jadwal tayang dari backend (lihat NewsResponse.java) --
  // dipakai AnnouncementModal untuk pre-fill form Edit, dan
  // AnnouncementSection (mode admin) untuk badge status Terjadwal/
  // Tayang/Berakhir.
  publishAt: news.publishAt,
  expiresAt: news.expiresAt,
});

// [UBAH] Label "update" (SISTEM UPDATE) dihapus dari pilihan yang bisa
// dipilih user -- lihat AnnouncementModal.jsx. Entry-nya TETAP dipertahankan
// di sini supaya berita LAMA yang kadung tersimpan dengan category='update'
// masih tampil dengan gaya yang benar, bukan fallback ke style 'info'.
export function getLabelStyle(label) {
  const map = {
    penting: { text: 'PENTING', className: 'bg-red-50 text-red-500' },
    update: { text: 'SISTEM UPDATE', className: 'bg-emerald-50 text-emerald-600' },
    info: { text: 'INFO', className: 'bg-blue-50 text-blue-600' },
  };
  return map[label] || map.info;
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '-';
  const diffMinutes = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} Menit Lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} Jam Lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} Hari Lalu`;
  return `${Math.floor(diffDays / 7)} Minggu Lalu`;
}

// [BARU] Format tanggal singkat (Indonesia) untuk badge jadwal tayang,
// mis. "23 Sep 2026, 14.00".
export function formatScheduleDate(isoString) {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// [BARU] Status jadwal tayang satu berita, dipakai badge di mode admin
// (AnnouncementSection) supaya HR bisa lihat mana yang masih menunggu
// jadwal, sedang tayang, atau sudah berakhir -- tanpa ini ketiganya
// kelihatan sama padahal backend sudah membedakan lewat publishAt/expiresAt.
export function getScheduleStatus(item) {
  const now = Date.now();
  const publishAt = item.publishAt ? new Date(item.publishAt).getTime() : null;
  const expiresAt = item.expiresAt ? new Date(item.expiresAt).getTime() : null;

  if (publishAt && publishAt > now) {
    return { text: 'TERJADWAL', className: 'bg-amber-50 text-amber-600' };
  }
  if (expiresAt && expiresAt < now) {
    return { text: 'BERAKHIR', className: 'bg-gray-100 text-gray-500' };
  }
  return { text: 'TAYANG', className: 'bg-emerald-50 text-emerald-600' };
}

// [UBAH] Tambah parameter config opsional ({ silent }) -- diteruskan ke
// api.get. Dipakai Navbar.jsx (polling badge, selalu silent) dan
// AnnouncementSection.jsx (widget Dashboard, polling 30 detik selalu
// silent). Lihat services/api.js.
//
// [UBAH] Endpoint GET /api/news sekarang SUDAH difilter jendela tayang
// (publishAt..expiresAt) di backend -- lihat NewsServiceImpl.getAllNews().
// Filter `published !== false` di sisi frontend dipertahankan sebagai
// jaring pengaman kedua, bukan lagi satu-satunya filter.
export async function getAnnouncements(config = {}) {
  const news = await api.get('/api/news', config);
  return news
    .filter((item) => item.published !== false)
    .map(mapNews)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// [BARU] Untuk dashboard manajemen HR/SuperAdmin (AnnouncementSection
// mode="admin") -- berbeda dari getAnnouncements(), TIDAK difilter jendela
// tayang, supaya berita yang masih terjadwal atau sudah berakhir tetap
// kelihatan & bisa diedit/dihapus. Lihat NewsController.getAllNewsForManagement().
export async function getAllAnnouncementsForManagement(config = {}) {
  const news = await api.get('/api/news/all', config);
  return news
    .map(mapNews)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// [BARU] Upload satu gambar untuk disisipkan ke konten (editor rich-text
// di AnnouncementModal). Dipanggil terpisah SEBELUM submit form -- gambar
// perlu sudah punya URL Cloudinary dulu sebelum disisipkan ke HTML `isi`
// lewat document.execCommand('insertImage', ...).
export async function uploadAnnouncementImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const { url } = await api.postForm('/api/news/upload-image', formData);
  return url;
}

export async function addAnnouncement({ judul, label, isi, publishAt, expiresAt }) {
  return mapNews(await api.post('/api/news', {
    title: judul,
    category: label,
    content: isi,
    published: true,
    publishAt,
    expiresAt,
  }));
}

export async function updateAnnouncement(id, { judul, label, isi, publishAt, expiresAt }) {
  return mapNews(await api.put(`/api/news/${id}`, {
    title: judul,
    category: label,
    content: isi,
    published: true,
    publishAt,
    expiresAt,
  }));
}

export const deleteAnnouncement = (id) => api.delete(`/api/news/${id}`);
