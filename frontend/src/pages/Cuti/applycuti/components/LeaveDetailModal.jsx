import React, { useEffect, useState } from 'react';
import { getApprovalDetail, getMyLeaveDetail, takeApprovalAction, mapApproval } from '../../../../services/CutiService'; // PERBAIKAN: Import Service API Nyata
import LeaveDetailLogHistory from './LeaveDetailLogHistory';
import './LeaveDetailModal.css'; 

const STATUS_LABEL = {
  'PROSES': "Proses",
  'PENDING': "Proses",
  'DALAM PROSES': "Proses",
  'DISETUJUI': "Disetujui",
  'APPROVED': "Disetujui",
  'DIKEMBALIKAN': "Dikembalikan",
  'RETURNED': "Dikembalikan",
  'DITOLAK': "Ditolak",
  'REJECTED': "Ditolak",
};

// Ubah "3 Agu 2026 - 3 Agu 2026 (1 Hari)" menjadi "3 Agu - 3 Agu 2026 (1 Hari)"
// (tahun pada tanggal awal disembunyikan jika sama dengan tahun tanggal akhir)
const formatShortDateRange = (fullStr) => {
  if (!fullStr) return fullStr;
  const suffixMatch = fullStr.match(/\s*(\(.*\))\s*$/);
  const suffix = suffixMatch ? ` ${suffixMatch[1]}` : '';
  const rangePart = suffixMatch ? fullStr.slice(0, suffixMatch.index).trim() : fullStr.trim();

  const match = rangePart.match(/^(\d{1,2}\s+\S+)\s+(\d{4})\s*-\s*(\d{1,2}\s+\S+)\s+(\d{4})$/);
  if (!match) return fullStr;

  const [, startPart, startYear, endPart, endYear] = match;
  const shortRange = startYear === endYear
    ? `${startPart} - ${endPart} ${endYear}`
    : `${startPart} ${startYear} - ${endPart} ${endYear}`;

  return `${shortRange}${suffix}`;
};

const LeaveDetailModal = ({ selectedDetail, onClose, currentUserRole, onRefreshData, allHistory = [], employeeLookup = {}, handleEditKembali }) => {
  const [detailData, setDetailData] = useState(selectedDetail);
  const [isLoading, setIsLoading] = useState(false);

  const pemohon = detailData.karyawan?.nama || detailData.pemohon || 'Karyawan';
  const jenisCuti = detailData.jenisCuti;
  const durasi = detailData.durasi || detailData.stringTanggal;
  const statusKey = (detailData.statusBerkas || detailData.globalStatus || 'PROSES').toUpperCase();
  const statusTercetak = STATUS_LABEL[statusKey] || detailData.statusBerkas || detailData.globalStatus || "Proses";

  const leaderName = detailData.approvalChain?.leader || detailData.leader?.nama || detailData.leaderEmployeeId || '-';
  const spvName = detailData.approvalChain?.spv || detailData.spv?.nama || detailData.spvEmployeeId || '-';
  const managerName = detailData.approvalChain?.manager || detailData.manager?.nama || detailData.managerEmployeeId || '-';

  const alasan = detailData.keterangan || detailData.alasan || '-';
  const pekerjaanTertunda = detailData.pendingWork || detailData.pekerjaanTertunda || '';
  const coverOleh = detailData.coveredBy || detailData.coverOleh || '';


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // =========================================================================
  // 1. KONEKSI API NYATA: GET DETAIL REAL-TIME FETCH
  // =========================================================================
  useEffect(() => {
    if (selectedDetail?.id) {
      const fetchLatestDetail = async () => {
        setIsLoading(true);
        try {
          const isAtasan = ['LEADER', 'SPV', 'MANAGER'].includes(
            String(currentUserRole).toUpperCase().replace(/^ROLE_/, '')
          );

          // Panggil API sesuai dengan Role User yang sedang login
          const rawData = isAtasan 
            ? await getApprovalDetail(selectedDetail.id)
            : await getMyLeaveDetail(selectedDetail.id);

          const formattedData = mapApproval(rawData, employeeLookup);
          setDetailData(formattedData); 
        } catch (error) {
          console.error("Gagal mengambil data detail terbaru:", error);
          // Fallback ke data bawaan yang dilempar dari props jika API error
          setDetailData(selectedDetail);
        } finally {
          setIsLoading(false);
        }
      };

      fetchLatestDetail();
    }
  }, [selectedDetail, currentUserRole]);

  if (!detailData) return null;

  // Normalisasi data kompatibilitas
  // =========================================================================
  // LOGIKA TAMBAHAN: GENERATE LOG DINAMIS SEBAGAI FALLBACK
  // =========================================================================
  const generateDynamicLogs = () => {
    const logs = [
      {
        nama: pemohon,
        tanggal: durasi.split('(')[0].trim(),
        aksi: 'DIAJUKAN',
        catatan: 'Mengajukan awal'
      }
    ];

    const leaderStatus = detailData.leader?.status || (detailData.leaderEmployeeId ? 'Approved' : null);
    if (leaderName && leaderName !== '-' && leaderStatus && leaderStatus !== 'Pending') {
      logs.push({
        nama: `${leaderName} (Leader)`,
        tanggal: durasi.split('(')[0].trim(),
        aksi: leaderStatus.toUpperCase(),
        catatan: leaderStatus.toLowerCase() === 'approved' ? 'Meneruskan ke SPV' : 'Menolak berkas'
      });
    }

    const spvStatus = detailData.spv?.status || (detailData.spvEmployeeId ? 'Approved' : null);
    if (spvName && spvName !== '-' && spvStatus && spvStatus !== 'Pending') {
      logs.push({
        nama: `${spvName} (SPV)`,
        tanggal: durasi.split('(')[0].trim(),
        aksi: spvStatus.toUpperCase(),
        catatan: detailData.spv?.catatan || (spvStatus.toLowerCase() === 'approved' ? 'Meneruskan ke Manager' : 'Mengembalikan berkas')
      });
    }

    const managerStatus = detailData.manager?.status || (detailData.managerEmployeeId ? 'Approved' : null);
    if (managerName && managerName !== '-' && managerStatus && managerStatus !== 'Pending') {
      logs.push({
        nama: `${managerName} (Manager)`,
        tanggal: durasi.split('(')[0].trim(),
        aksi: managerStatus.toUpperCase(),
        catatan: managerStatus.toLowerCase() === 'approved' ? 'Menyetujui cuti (ACC)' : 'Menolak berkas'
      });
    }

    return logs;
  };

  const finalLogs = detailData.riwayatLog && detailData.riwayatLog.length > 0
    ? detailData.riwayatLog.map(log => ({
        nama: log.nama,
        tanggal: log.waktu,
        aksi: log.statusBadge,
        catatan: log.catatan
      }))
    : generateDynamicLogs();

  // =========================================================================
  // 2. KONEKSI API NYATA: AKSI PERSETUJUAN / APPROVAL 
  // =========================================================================
  const handleActionApproval = async (statusAksi) => {
    const catatanAtasan = prompt(`Masukkan alasan/catatan untuk tindakan ${statusAksi}:`);
    if (catatanAtasan === null) return; // Batal jika menekan cancel pada prompt

    try {
      const actionEndpoint = statusAksi.toLowerCase() === 'approved' ? 'approve' : 
                             statusAksi.toLowerCase() === 'returned' ? 'return' : 'reject';

      await takeApprovalAction(detailData.id, actionEndpoint, catatanAtasan);
      
      alert(`Berkas berhasil diperbarui!`);
      if (onRefreshData) onRefreshData(); 
      onClose(); 
    } catch (error) {
      alert("Gagal memperbarui status persetujuan: " + (error.message || 'Error Server'));
    }
  };

  // Cek apakah user saat ini adalah atasan yang berwenang di alur dokumen ini
  const isAtasan = ['LEADER', 'SPV', 'MANAGER'].includes(String(currentUserRole).toUpperCase());

  return (
    <div className="form-cuti__overlay" onMouseDown={onClose}>
      <div className="form-cuti__modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        
        {/* HEADER MODAL */}
        <div className="form-cuti__header">
          <div>
            <h2 className="form-cuti__title">Informasi Detail Berkas Cuti {isLoading && "(Memuat...)"}</h2>
            <p className="form-cuti__subtitle">Pantau alur verifikasi berkas secara berjenjang</p>
          </div>
          <button type="button" className="form-cuti__close" onClick={onClose}>&times;</button>
        </div>

        {/* BODY MODAL */}
        <div className="form-cuti__body">
          <div className="form-cuti__grid">
            <div className="form-cuti__field">
              <span className="form-cuti__label">Pemohon</span>
              <span className="form-cuti__value">{pemohon}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Jenis Permohonan</span>
              <span className="form-cuti__value">{jenisCuti}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Durasi Kerja</span>
              <span className="form-cuti__value form-cuti__value--accent">
                {formatShortDateRange(durasi)}
              </span>            
             </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Status Sekarang</span>
              <span className="form-cuti__value">{statusTercetak}</span>
            </div>
          </div>

          <div className="form-cuti__divider" />

          {/* Alur Approval Menyamping */}
          <div className="form-cuti__grid form-cuti__grid--three">
            <div className="form-cuti__field">
              <span className="form-cuti__label">Leader</span>
              <span className="form-cuti__value">{leaderName}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">SPV</span>
              <span className="form-cuti__value">{spvName}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Manager</span>
              <span className="form-cuti__value">{managerName}</span>
            </div>
          </div>

          {/* Keterangan & Alasan */}
          <div className="form-cuti__section">
            <span className="form-cuti__label">Alasan Keterangan</span>
            <div className="form-cuti__box">{alasan}</div>
          </div>

          {/* Pekerjaan Tertunda & Backup PIC */}
          {(pekerjaanTertunda || coverOleh) && (
            <div className="form-cuti__section">
              <span className="form-cuti__label">Pekerjaan Tertunda &amp; Dicover Oleh</span>
              <div className="form-cuti__box form-cuti__box--warn">
                {pekerjaanTertunda || '-'}
                {pekerjaanTertunda && coverOleh ? ' - ' : ''}
                {coverOleh ? `Dicover Oleh: ${coverOleh}` : ''}
              </div>
            </div>
          )}

          {/* Riwayat Log Pemeriksaan Berjenjang + Semua Riwayat Pengajuan Cuti Anda */}
          <LeaveDetailLogHistory
            finalLogs={finalLogs}
            allHistory={allHistory}
            currentId={detailData.id}
          />

          {/* Catatan Feedback Tambahan Khusus Jika Dikembalikan */}
          {statusKey === 'DIKEMBALIKAN' && detailData.reviewNote && (
            <div className="form-cuti__section form-cuti__section--feedback">
              <div className="form-cuti__box form-cuti__box--warn form-cuti__box--feedback">
                <strong>Catatan Pengembalian:</strong> {detailData.reviewNote}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="form-cuti__footer">
          {isAtasan && statusKey === 'PROSES' ? (
            <div className="action-approval-buttons">
              <button type="button" className="btn-approve" onClick={() => handleActionApproval('Approved')}>Setujui (ACC)</button>
              <button type="button" className="btn-return" onClick={() => handleActionApproval('Returned')}>Kembalikan</button>
              <button type="button" className="btn-reject" onClick={() => handleActionApproval('Rejected')}>Tolak</button>
              <button type="button" className="btn-cancel-detail" onClick={onClose}>Batal</button>
            </div>
          ) : (
            <div className="form-cuti__footer-actions">
              {handleEditKembali && statusKey === 'DIKEMBALIKAN' && (
                <button 
                  type="button" 
                  className="form-cuti__edit-btn" 
                  onClick={() => {
                    handleEditKembali(detailData.id || selectedDetail.id); // Mengisi form otomatis
                    onClose(); // Menutup modal detail setelah mengisi form
                  }}
                >
                  Edit Berkas
                </button>
              )}
              <button type="button" className="form-cuti__close-btn" onClick={onClose}>Tutup Detail</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LeaveDetailModal;