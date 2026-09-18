// src/pages/Dashboard/components/AnnouncementSection.jsx
import React, { useState, useEffect } from 'react';
import { getAnnouncements, getLabelStyle, formatRelativeTime } from '../../../services/announcementService';
import Skeleton from '../../../components/Skeleton'; // [BARU]

export default function AnnouncementSection({ onEdit, onDelete }) {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // [BARU] Skeleton cuma boleh tampil di load PERTAMA. Tanpa flag ini,
    // setIsLoading(true) akan terpanggil ulang tiap poll 30 detik dan
    // skeleton "berkedip" lagi walau data sudah ada -- regresi, bukan
    // perbaikan. Pola sama seperti flag `silent` di Karyawan.jsx/RiwayatCuti.jsx,
    // hanya di sini dijaga via ref lokal karena loadAnnouncements() dipanggil
    // otomatis oleh setInterval, bukan lewat parameter dari luar.
    let isFirstLoad = true;
    const loadAnnouncements = async () => {
      if (isFirstLoad) setIsLoading(true);
      try {
        // [UBAH] { silent: true } -- widget sekunder di Dashboard (bukan
        // konten utama halaman), jadi polling 30 detiknya tidak boleh
        // memicu LoadingScreen global. Lihat services/api.js.
        const data = await getAnnouncements({ silent: true });
        setAnnouncements(data);
      } catch (error) {
        console.error('Gagal memuat pengumuman:', error);
        setAnnouncements([]);
      } finally {
        if (isFirstLoad) {
          setIsLoading(false);
          isFirstLoad = false;
        }
      }
    };
    loadAnnouncements();
    const refreshTimer = window.setInterval(loadAnnouncements, 30000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  if (isLoading) {
    // [UBAH] Skeleton 2 kartu mengikuti bentuk kartu pengumuman asli
    // (label pill, meta, judul, body) -- bukan lagi teks "Memuat pengumuman...".
    return (
      <div className="flex flex-col gap-5" aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[180px]">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Skeleton variant="pill" width={64} height={18} />
                <Skeleton width={140} height={11} />
              </div>
              <Skeleton width="55%" height={16} style={{ marginBottom: 10 }} />
              <Skeleton width="100%" height={11} style={{ marginBottom: 6 }} />
              <Skeleton width="90%" height={11} style={{ marginBottom: 6 }} />
              <Skeleton width="70%" height={11} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center text-sm text-gray-400 italic">
        Belum ada pengumuman.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {announcements.map((item) => {
        const labelStyle = getLabelStyle(item.label);
        return (
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[180px]">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`${labelStyle.className} text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wide`}>
                    {labelStyle.text}
                  </span>
                  <span className="text-xs text-gray-400">
                    Diposting oleh {item.author} • {formatRelativeTime(item.createdAt)}
                  </span>
                </div>

                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-3 shrink-0">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1"
                      >
                        <i className="fa-solid fa-pen"></i> Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                      >
                        <i className="fa-solid fa-trash"></i> Hapus
                      </button>
                    )}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">{item.judul}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {item.isi}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
