// src/pages/Dashboard/components/AnnouncementSection.jsx
import React, { useState, useEffect } from 'react';
import { getAnnouncements, getLabelStyle, formatRelativeTime } from '../../../services/announcementService';

export default function AnnouncementSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncements = async () => {
      setIsLoading(true);
      const data = await getAnnouncements();
      setAnnouncements(data);
      setIsLoading(false);
    };
    loadAnnouncements();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center text-sm text-gray-400">
        Memuat pengumuman...
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
              <div className="flex items-center gap-3 mb-3">
                <span className={`${labelStyle.className} text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wide`}>
                  {labelStyle.text}
                </span>
                <span className="text-xs text-gray-400">
                  Diposting oleh {item.author} • {formatRelativeTime(item.createdAt)}
                </span>
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">{item.judul}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {item.isi}
              </p>
            </div>
            <div className="flex justify-between items-center mt-4 border-t border-gray-50 pt-3">
              <span className="text-xs text-gray-400 italic">Konfirmasi pembaca otomatis</span>
              <button className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors">
                Tandai Sudah Baca
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}