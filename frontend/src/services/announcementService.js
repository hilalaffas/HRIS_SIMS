import { api } from './api';

const mapNews = (news) => ({
  id: news.id,
  judul: news.title,
  label: news.category || 'info',
  isi: news.content,
  author: news.createdBy || 'HRD',
  createdAt: news.createdAt,
});

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

export async function getAnnouncements() {
  const news = await api.get('/api/news');
  return news
    .filter((item) => item.published !== false)
    .map(mapNews)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function addAnnouncement({ judul, label, isi }) {
  return mapNews(await api.post('/api/news', {
    title: judul,
    category: label,
    content: isi,
    published: true,
  }));
}

export async function updateAnnouncement(id, { judul, label, isi }) {
  return mapNews(await api.put(`/api/news/${id}`, {
    title: judul,
    category: label,
    content: isi,
    published: true,
  }));
}

export const deleteAnnouncement = (id) => api.delete(`/api/news/${id}`);
