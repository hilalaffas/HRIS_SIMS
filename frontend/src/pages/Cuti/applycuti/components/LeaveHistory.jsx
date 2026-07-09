import React from 'react';
import './LeaveHistory.css';

// PINDAHAN DARI ApplyCuti.jsx (Data dummy panjang dialihkan ke sini)
export const getFallbackDummyRiwayat = (userId, userName) => [
  {
    userId: 'karyawan_01',
    userName: 'Andi Wijaya',            
    id: 101,
    jenisCuti: 'CUTI TAHUNAN',
    stringTanggal: '25 June - 27 June 2026',
    totalHari: '3 Hari',
    status: 'Dikembalikan',
    isUnread: true,
    rawDetail: {
      jenisCuti: 'Cuti tahunan',
      dariTanggal: '2026-06-25',
      sampaiTanggal: '2026-06-27',
      totalHari: '3 Hari',
      alasan: 'Ada keperluan keluarga yang mendesak',
      pekerjaanTertunda: 'Pekerjaan harian di-handle oleh Tim A',
      leader: { nama: 'Aden', status: 'Approved' },
      spv: { nama: 'Mandala', status: 'Returned', catatan: 'Mohon reschedule kembali jadwal backup pekerjaan agar tidak tabrakan dengan perilisan fitur baru.' },
      manager: { nama: 'Ade Mulya', status: 'Pending' }
    }
  },
  {
    userId: userId,
    userName: userName,
    id: 102,
    jenisCuti: 'CUTI TAHUNAN',
    stringTanggal: '10 June - 12 June 2026',
    totalHari: '3 Hari',
    status: 'Disetujui (ACC)',
    isUnread: false,
    rawDetail: {
      jenisCuti: 'Cuti tahunan',
      dariTanggal: '2026-06-10',
      sampaiTanggal: '2026-06-12',
      totalHari: '3 Hari',
      alasan: 'Acara pernikahan saudara kandung',
      pekerjaanTertunda: 'Semua task sprint sudah diclose dan dimonitor oleh Kak Guntur',
      leader: { nama: 'Guntur', status: 'Approved' },
      spv: { nama: 'Mandala', status: 'Approved' },
      manager: { nama: 'Ade Mulya', status: 'Approved' }
    }
  }
];

const LeaveHistory = ({
  riwayatCuti,
  filterStatus,
  setFilterStatus,
  handleOpenDetail,
  handleEditKembali
}) => {
  // MODIFIKASI 1: Amankan pencocokan filter status (termasuk toleransi "proses" dan "dalam proses")
  const filteredRiwayat = riwayatCuti.filter(item => {
    if (filterStatus === 'Semua Berkas') return true;
    const statusLower = item.status?.toLowerCase() || '';
    if (filterStatus === 'Dalam Proses') {
      return statusLower === 'proses' || statusLower === 'dalam proses';
    }
    return item.status === filterStatus;
  });

  const adakahNotifikasiGlobal = riwayatCuti.some(item => item.isUnread);

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="history-title-container">
          <i className="fa-solid fa-clock-rotate-left history-header-icon"></i>
          <h3 className="history-title">
            Riwayat & Status Pengajuan 
            {adakahNotifikasiGlobal && <span className="dot-badge-global"></span>}
          </h3>
        </div>
        <div className="history-filter-container">
          <span className="filter-label">FILTER:</span>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-dropdown">
            <option value="Semua Berkas">Semua Berkas</option>
            <option value="Dalam Proses">Dalam Proses</option>
            <option value="Disetujui (ACC)">Disetujui (ACC)</option>
            <option value="Dikembalikan">Dikembalikan</option>
          </select>
        </div>
      </div>

      <div className="history-body">
        {filteredRiwayat.length === 0 ? (
          <div className="empty-history-box">Belum ada riwayat pengajuan.</div>
        ) : (
          <div className="history-list">
            {filteredRiwayat.map((item) => {
              const statusLower = item.status ? item.status.toLowerCase() : 'proses';
              const classCleanStatus = statusLower.replace(/[^a-z]/g, '');
              
              // MODIFIKASI 2: Normalisasi deteksi status proses agar pengajuan baru langsung klop
              const isProses = statusLower === 'proses' || statusLower === 'dalam proses';
              const isDikembalikan = classCleanStatus === 'dikembalikan';

              return (
                <div key={item.id} className={`history-item-card ${isDikembalikan ? 'border-alert-red' : ''}`}>
                  <div className="history-item-left" onClick={() => handleOpenDetail(item)} style={{ cursor: 'pointer' }}>
                    {item.isUnread && <span className="dot-badge-item"></span>}
                    <div className="history-item-info">
                      <span className="history-item-leave-type">{item.jenisCuti}</span>
                      <p className="history-item-dates">
                        {item.stringTanggal} {item.totalHari && `(${item.totalHari})`}
                      </p>
                    </div>
                  </div>

                  <div className="history-item-actions">
                    {isProses ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="status-badge-list dalam-proses" onClick={() => handleOpenDetail(item)} style={{ cursor: 'pointer' }}>
                          DALAM PROSES
                        </span>
                        <button type="button" className="btn-edit-inline" onClick={() => handleEditKembali(item.id)}>
                          <i className="fa-regular fa-pen-to-square"></i> Edit
                        </button>
                      </div>
                    ) : isDikembalikan ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="status-badge-list dikembalikan" onClick={() => handleOpenDetail(item)} style={{ cursor: 'pointer' }}>
                          DIKEMBALIKAN
                        </span>
                        <button type="button" className="btn-edit-inline" onClick={() => handleEditKembali(item.id)}>
                          <i className="fa-regular fa-pen-to-square"></i> Edit
                        </button>
                      </div>
                    ) : (
                      <button type="button" className={`status-badge-btn ${classCleanStatus}`} onClick={() => handleOpenDetail(item)}>
                        {classCleanStatus === 'disetujuiacc' ? 'DISETUJUI' : item.status.toUpperCase()}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveHistory;