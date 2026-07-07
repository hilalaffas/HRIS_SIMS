import React from 'react';

const LeaveHistory = ({
  riwayatCuti,
  filterStatus,
  setFilterStatus,
  formatDateDisplay,
  handleOpenDetail,
  handleEditKembali
}) => {
  // Menangani filter "Dalam Proses" yang memetakan ke status string 'Proses'
  const filteredRiwayat = riwayatCuti.filter(item => {
    if (filterStatus === 'Semua Berkas') return true;
    if (filterStatus === 'Dalam Proses') return item.status?.toLowerCase() === 'proses';
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
              const classCleanStatus = item.status ? item.status.toLowerCase().replace(/[^a-z]/g, '') : 'proses';
              const isProses = item.status?.toLowerCase() === 'proses' || item.status?.toLowerCase() === 'dalam proses';
              const isDikembalikan = classCleanStatus === 'dikembalikan';

              return (
                <div key={item.id} className={`history-item-card ${isDikembalikan ? 'border-alert-red' : ''}`}>
                  
                  {/* SISI KIRI: Memakai tag bawaan asli agar style CSS memunculkan teks tanggal kembali */}
                  <div className="history-item-left" onClick={() => handleOpenDetail(item)} style={{ cursor: 'pointer' }}>
                    {item.isUnread && <span className="dot-badge-item"></span>}
                    <div className="history-item-info">
                      <span className="history-item-leave-type">{item.jenisCuti}</span>
                      {/* PERBAIKAN: Menggunakan tag <p> bawaan CSS asli Anda */}
                      <p className="history-item-dates">
                        {item.stringTanggal} {item.totalHari && `(${item.totalHari})`}
                      </p>
                    </div>
                  </div>

                  {/* SISI KANAN: Tempat Badge Status & Tombol Edit */}
                  <div className="history-item-actions">
                    {isProses ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span 
                          className="status-badge-list dalam-proses"
                          onClick={() => handleOpenDetail(item)}
                          style={{ cursor: 'pointer' }}
                        >
                          DALAM PROSES
                        </span>
                        <button 
                          type="button" 
                          className="btn-edit-inline" 
                          onClick={() => handleEditKembali(item.id)}
                        >
                          <i className="fa-regular fa-pen-to-square"></i> Edit
                        </button>
                      </div>
                    ) : isDikembalikan ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span 
                          className="status-badge-list dikembalikan"
                          onClick={() => handleOpenDetail(item)}
                          style={{ cursor: 'pointer' }}
                        >
                          DIKEMBALIKAN
                        </span>
                        <button 
                          type="button" 
                          className="btn-edit-inline" 
                          onClick={() => handleEditKembali(item.id)}
                        >
                          <i className="fa-regular fa-pen-to-square"></i> Edit
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        className={`status-badge-btn ${classCleanStatus}`}
                        onClick={() => handleOpenDetail(item)}
                      >
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