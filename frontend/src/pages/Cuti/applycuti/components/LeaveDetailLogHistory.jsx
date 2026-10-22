import React from 'react';
import './LeaveDetailLogHistory.css';

/**
 * Bagian: Riwayat Log Pemeriksaan Berjenjang + Semua Riwayat Pengajuan Cuti Anda
 * (dipecah dari LeaveDetailModal.jsx supaya file utama tidak melebihi 300 baris)
 */
const LeaveDetailLogHistory = ({ finalLogs = [], allHistory = [], currentId }) => {
  // Urutkan riwayat: berkas yang masih dalam proses ditaruh di atas, sisanya berdasarkan id terbaru
  const sortedHistory = [...allHistory].sort((a, b) => {
    const aIsPending = !a.status?.toLowerCase().includes('setujui') && !a.status?.toLowerCase().includes('tolak') && a.status !== 'APPROVED' && a.status !== 'REJECTED';
    const bIsPending = !b.status?.toLowerCase().includes('setujui') && !b.status?.toLowerCase().includes('tolak') && b.status !== 'APPROVED' && b.status !== 'REJECTED';

    if (aIsPending && !bIsPending) return -1;
    if (!aIsPending && bIsPending) return 1;

    return (b.id || 0) - (a.id || 0);
  });

  return (
    <>
      {/* Riwayat Log Pemeriksaan Berjenjang */}
      <div className="form-cuti__section">
        <h3 className="form-cuti__title">Riwayat Log Pemeriksaan Berjenjang</h3>
        <div className="form-cuti__log-list">
          {finalLogs.map((log, idx) => (
            <div className="form-cuti__log-item" key={idx}>
              <div className="form-cuti__log-dot" />
              <div className="form-cuti__log-content">
                <div className="form-cuti__log-top">
                  <span className="form-cuti__log-role">{log.nama}</span>
                  <span className="form-cuti__log-time">{log.tanggal}</span>
                </div>
                <div className="form-cuti__log-bottom">
                  Status &middot; {log.aksi} ({log.catatan})
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Riwayat Pengajuan Cuti Sebelumnya */}
      <div className="form-cuti__section">
        <span className="form-cuti__label">Semua Riwayat Pengajuan Cuti Anda</span>
        <div className="form-cuti__log-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {sortedHistory.length > 0 ? (
            sortedHistory.map((item, idx) => {
              const isAcc = item.status?.toLowerCase().includes('setujui') || item.status === 'APPROVED';
              const isDitolak = item.status?.toLowerCase().includes('tolak') || item.status === 'REJECTED';
              const isDikembalikan = item.status?.toLowerCase().includes('kembali') || item.status === 'RETURNED';

              let dotColor = '#eab308';
              if (isAcc) dotColor = '#22c55e';
              if (isDitolak) dotColor = '#ef4444';
              if (isDikembalikan) dotColor = '#f97316';

              const historyDateOnly = (item.stringTanggal || '').split('(')[0].trim();
              const isThisRecord = item.id === currentId;

              return (
                <div className="form-cuti__log-item" key={idx} style={{ opacity: isThisRecord ? 1 : 0.75 }}>
                  <div className="form-cuti__log-dot" style={{ backgroundColor: dotColor }} />
                  <div className="form-cuti__log-content">
                    <div className="form-cuti__log-top">
                      <span className="form-cuti__log-role" style={{ fontWeight: isThisRecord ? '700' : '600' }}>
                        {item.jenisCuti} {isThisRecord && <span style={{ fontSize: '11px', color: 'var(--dk-text-blue, #0284c7)' }}>(Berkas Ini)</span>}
                      </span>
                      <span className="form-cuti__log-time">{historyDateOnly}</span>
                    </div>
                    <div className="form-cuti__log-bottom" style={{ marginTop: '2px' }}>
                      Durasi: {item.totalHari} &middot; Status: <strong style={{ color: dotColor }}>{item.status}</strong>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="form-cuti__box" style={{ color: 'var(--dk-text-3, #6b7280)', textAlign: 'center', fontSize: '14px' }}>
              Belum ada riwayat pengajuan cuti sebelumnya.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LeaveDetailLogHistory;
