import React, { useEffect, useState } from 'react';
import './LeaveDetailModal.css'; 

const STATUS_LABEL = {
  'PROSES': "Proses",
  'DALAM PROSES': "Proses",
  'DISETUJUI': "Disetujui",
  'DIKEMBALIKAN': "Dikembalikan",
  'DITOLAK': "Ditolak",
};

// Pastikan untuk mengimpor service API Anda jika ada, contoh:
// import { getDetailCutiById, updateStatusCuti } from '../../../services/cutiService';

const LeaveDetailModal = ({ selectedDetail, onClose, currentUserRole, onRefreshData, handleEditKembali }) => {
  // State tambahan untuk menampung data riwayat log/status terupdate dari database
  const [detailData, setDetailData] = useState(selectedDetail);
  const [isLoading, setIsLoading] = useState(false);

  // Menjaga fitur bawaan agar modal bisa ditutup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // =========================================================================
  // 1. KONEKSI API: GET LOG DAN DETAIL TERBARU (REAL-TIME FETCH)
  // =========================================================================
  // Keterangan Fungsi: Mengambil data status approval terbaru dari database 
  // setiap kali modal dibuka, agar user melihat status aslinya secara real-time.
  useEffect(() => {
    if (selectedDetail?.id) {
      const fetchLatestDetail = async () => {
        setIsLoading(true);
        try {
          // Contoh pemanggilan API Database:
          // const response = await getDetailCutiById(selectedDetail.id);
          // setDetailData(response.data);
          
          // Sementara menggunakan data props bawaan jika API belum dipasang
          setDetailData(selectedDetail); 
        } catch (error) {
          console.error("Gagal mengambil data detail terbaru:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchLatestDetail();
    }
  }, [selectedDetail]);

  if (!detailData) return null;

  // Normalisasi pembacaan status agar singkron ke kamus label pendukung gambar
  const statusKey = (detailData.globalStatus || 'PROSES').toUpperCase();
  const statusTercetak = STATUS_LABEL[statusKey] || detailData.globalStatus || "Proses";

  // =========================================================================
  // LOGIKA TAMBAHAN: GENERATE LOG DINAMIS AGAR RIWAYAT LOG SELALU TERUPDATE
  // =========================================================================
  const generateDynamicLogs = () => {
    const logs = [
      {
        nama: detailData.pemohon || 'Karyawan',
        tanggal: detailData.stringTanggal,
        aksi: 'DIAJUKAN',
        catatan: 'Mengajukan awal'
      }
    ];

    // Cek status Verifikasi Leader
    const leaderNama = detailData.leader?.nama || detailData.leaderApproval;
    const leaderStatus = detailData.leader?.status || (detailData.leaderApproval ? 'Approved' : null);
    if (leaderNama && leaderStatus && leaderStatus !== 'Pending') {
      logs.push({
        nama: `${leaderNama} (Leader)`,
        tanggal: detailData.stringTanggal,
        aksi: leaderStatus.toUpperCase(),
        catatan: leaderStatus.toLowerCase() === 'approved' ? 'Meneruskan ke SPV' : 'Menolak berkas'
      });
    }

    // Cek status Verifikasi SPV
    const spvNama = detailData.spv?.nama || detailData.spvApproval;
    const spvStatus = detailData.spv?.status || (detailData.spvApproval ? 'Approved' : null);
    if (spvNama && spvStatus && spvStatus !== 'Pending') {
      logs.push({
        nama: `${spvNama} (SPV)`,
        tanggal: detailData.stringTanggal,
        aksi: spvStatus.toUpperCase(),
        catatan: detailData.spv?.catatan || (spvStatus.toLowerCase() === 'approved' ? 'Meneruskan ke Manager' : 'Mengembalikan berkas')
      });
    }

    // Cek status Verifikasi Manager
    const managerNama = detailData.manager?.nama || detailData.managerApproval;
    const managerStatus = detailData.manager?.status || (detailData.managerApproval ? 'Approved' : null);
    if (managerNama && managerStatus && managerStatus !== 'Pending') {
      logs.push({
        nama: `${managerNama} (Manager)`,
        tanggal: detailData.stringTanggal,
        aksi: managerStatus.toUpperCase(),
        catatan: managerStatus.toLowerCase() === 'approved' ? 'Menyetujui cuti (ACC)' : 'Menolak berkas'
      });
    }

    return logs;
  };

  // Tentukan apakah menggunakan log pemeriksaan statis bawaan atau log dinamis terupdate
  const finalLogs = detailData.logPemeriksaan && detailData.logPemeriksaan.length > 1 
    ? detailData.logPemeriksaan 
    : generateDynamicLogs();

  // =========================================================================
  // 2. KONEKSI API: AKSI PERSETUJUAN / APPROVAL (POST/PUT) - (OPSIONAL)
  // =========================================================================
  // Keterangan Fungsi: Fungsi ini mendengarkan aksi dari atasan jika menekan 
  // tombol Approve / Reject, lalu memperbarui statusnya langsung ke dalam database.
  const handleActionApproval = async (statusAksi, catatanAtasan = '') => {
    try {
      const payload = {
        cutiId: detailData.id,
        roleAtasan: currentUserRole,
        status: statusAksi,          
        catatan: catatanAtasan,
        isUpdateOnly: true, // Flag instruksi ke backend agar hanya mengupdate status tanpa trigger kirim ulang data/log notice
      };

      console.log("Mengupdate data status ke Database:", payload);
      // Contoh pemanggilan API:
      // await updateStatusCuti(payload);
      
      alert(`Berkas berhasil diperbarui ke status: ${statusAksi}!`);
      if (onRefreshData) onRefreshData(); // Memperbarui list riwayat di halaman induk ApplyCuti
      onClose(); // Tutup modal
    } catch (error) {
      alert("Gagal memperbarui status persetujuan.");
    }
  };

  // Modal ini dipakai pada "Manajemen Cuti Saya" (berkas milik pemohon).
  // Aksi approval hanya dilakukan di Pusat Persetujuan agar selalu melalui
  // modal catatan dan endpoint approval yang benar.
  const isAtasan = false;

  return (
    <div className="form-cuti__overlay" onMouseDown={onClose}>
      <div
        className="form-cuti__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-cuti-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="form-cuti__header">
          <div>
            <h2 id="form-cuti-title" className="form-cuti__title">
              Informasi Detail Berkas Cuti {isLoading && "(Memuat...)"}
            </h2>
            <p className="form-cuti__subtitle">Pantau alur verifikasi berkas secara berjenjang</p>
          </div>
          <button
            type="button"
            className="form-cuti__close"
            aria-label="Tutup"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* BODY MODAL */}
        <div className="form-cuti__body">
          {/* Baris 1: Pemohon & Jenis Permohonan */}
          <div className="form-cuti__grid">
            <div className="form-cuti__field">
              <span className="form-cuti__label">Pemohon</span>
              <span className="form-cuti__value">{detailData.pemohon}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Jenis Permohonan</span>
              <span className="form-cuti__value">{detailData.jenisCuti}</span>
            </div>

            {/* Baris 2: Durasi Kerja & Status Sekarang */}
            <div className="form-cuti__field">
              <span className="form-cuti__label">Durasi Kerja</span>
              <span className="form-cuti__value form-cuti__value--accent">
                {detailData.stringTanggal}
              </span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Status Sekarang</span>
              <span className="form-cuti__value">{statusTercetak}</span>
            </div>
          </div>

          <div className="form-cuti__divider" />

          {/* Baris 3: Alur Approval Menyamping */}
          <div className="form-cuti__grid form-cuti__grid--three">
            <div className="form-cuti__field">
              <span className="form-cuti__label">App. Leader</span>
              <span className="form-cuti__value">
                {detailData.leader?.nama || detailData.leaderApproval || '-'}
              </span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">App. SPV</span>
              <span className="form-cuti__value">
                {detailData.spv?.nama || detailData.spvApproval || '-'}
              </span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">App. Manager</span>
              <span className="form-cuti__value">
                {detailData.manager?.nama || detailData.managerApproval || '-'}
              </span>
            </div>
          </div>

          {/* Alasan Keterangan */}
          <div className="form-cuti__section">
            <span className="form-cuti__label">Alasan Keterangan</span>
            <div className="form-cuti__box">{detailData.alasan || '-'}</div>
          </div>

          {/* Pekerjaan Tertunda & Backup PIC */}
          {(detailData.pekerjaanTertunda || detailData.coverOleh) && (
            <div className="form-cuti__section">
              <span className="form-cuti__label">Pekerjaan Tertunda &amp; Dicover Oleh</span>
              <div className="form-cuti__box form-cuti__box--warn">
                {detailData.pekerjaanTertunda || ''}  
                {detailData.pekerjaanTertunda && detailData.coverOleh ? ' - ' : ''}
                {detailData.coverOleh ? `Dicover Oleh: ${detailData.coverOleh}` : ''}
              </div>
            </div>
          )}

          {/* Riwayat Log Pemeriksaan Berjenjang */}
          <div className="form-cuti__section">
            <span className="form-cuti__label">Riwayat Log Pemeriksaan Berjenjang</span>
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

          {/* Catatan Feedback Tambahan Khusus Jika Dikembalikan */}
          {detailData.globalStatus?.toLowerCase() === 'dikembalikan' && detailData.spv?.catatan && (
            <div className="form-cuti__section" style={{ marginTop: '4px' }}>
              <div className="form-cuti__box form-cuti__box--warn" style={{ color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2' }}>
                <strong>Catatan Pengembalian (SPV):</strong> {detailData.spv.catatan}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MODAL & TOMBOL AKSI DATABASE */}
        <div className="form-cuti__footer">
          {/* JIKA USER ADALAH ATASAN, TAMPILKAN TOMBOL APPROVAL SUNGGUHAN */}
          {isAtasan ? (
            <div className="action-approval-buttons" style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button 
                type="button" 
                className="btn-approve" 
                style={{ background: '#16a34a', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => handleActionApproval('Approved')}
              >
                Setujui (ACC)
              </button>
              <button 
                type="button" 
                className="btn-return" 
                style={{ background: '#ea580c', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => handleActionApproval('Returned', 'Mohon perbaiki berkas')}
              >
                Kembalikan
              </button>
              <button 
                type="button" 
                className="btn-close-mute" 
                style={{ marginLeft: 'auto', background: '#ccc', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={onClose}
              >
                Batal
              </button>
            </div>
          ) : (
           // JIKA USER ADALAH KARYAWAN BIASA, TAMPILKAN TOMBOL EDIT DAN TUTUP
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
              {/* TOMBOL EDIT BARU: Mengirimkan ID berkas ke fungsi edit bawaan induk */}
              {handleEditKembali && statusKey === 'DIKEMBALIKAN' && (
                <button 
                  type="button" 
                  className="form-cuti__edit-btn" 
                  style={{ background: '#ea580c', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                  onClick={() => {
                    handleEditKembali(selectedDetail.id || selectedDetail.rawId); // Mengisi form otomatis
                    onClose(); // Menutup modal detail setelah mengisi form
                  }}
                >
                  Edit Berkas
                </button>
              )}
              <button type="button" className="form-cuti__close-btn" onClick={onClose}>
                Tutup Detail
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveDetailModal;
