// src/pages/Profile/components/ProfileSkeleton.jsx
//
// [BARU] Menggantikan teks polos "Memuat data..." yang sebelumnya tampil di
// ProfilePageBase.jsx selagi loading. Bentuknya sengaja meniru layout asli
// ProfileViewSection.jsx (banner hijau, avatar bulat, nama, grid 2 kolom)
// supaya tidak ada "lompatan" tata letak begitu data asli selesai dimuat.
import React from 'react';
import Skeleton from '../../../components/Skeleton';

// 5 baris per kolom -- perkiraan jumlah field rata-rata (FIELD_CONFIG bisa
// beda-beda jumlahnya per role, skeleton tidak perlu presisi jumlah baris).
const FIELD_ROWS = Array.from({ length: 5 });

export default function ProfileSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="profile-banner-top"></div>
      <div className="profile-card-content">
        <div className="profile-header-block">
          <Skeleton variant="circle" size={96} />
          <div className="profile-title-wrapper" style={{ marginTop: 12 }}>
            <Skeleton width={220} height={22} style={{ marginBottom: 8 }} />
            <Skeleton width={160} height={13} />
          </div>
        </div>

        <div className="profile-info-grid">
          <div className="info-column">
            <Skeleton width={140} height={12} style={{ marginBottom: 24 }} />
            {FIELD_ROWS.map((_, i) => (
              <div className="info-group" key={`kiri-${i}`}>
                <Skeleton width={90} height={10} style={{ marginBottom: 8 }} />
                <Skeleton width="70%" height={14} />
              </div>
            ))}
          </div>
          <div className="info-column">
            <Skeleton width={180} height={12} style={{ marginBottom: 24 }} />
            {FIELD_ROWS.map((_, i) => (
              <div className="info-group" key={`kanan-${i}`}>
                <Skeleton width={90} height={10} style={{ marginBottom: 8 }} />
                <Skeleton width="80%" height={14} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
