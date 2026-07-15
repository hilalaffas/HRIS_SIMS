import React, { useEffect, useState } from 'react';
import { getDetailCutiById, updateStatusCuti } from '../../../../services/CutiService';
import './LeaveDetailModal.css'; 

const STATUS_LABEL = {
  'PROSES': "Proses",
  'DALAM PROSES': "Proses",
  'DISETUJUI': "Disetujui",
  'DIKEMBALIKAN': "Dikembalikan",
  'DITOLAK': "Ditolak",
};

// MAPPING DATA JENIS CUTI BERDASARKAN DATABASE
const LEAVE_TYPES = {
  1: "Cuti tahunan",
  2: "Cuti setengah hari",
  3: "Cuti nikah (Khusus)",
  4: "Cuti meninggal",
  5: "Cuti melahirkan (Khusus)",
  6: "Cuti Urgent"
};

const LeaveDetailModal = ({ selectedDetail, onClose, currentUserRole, onRefreshData, handleEditKembali }) => {
  const [detailData, setDetailData] = useState(selectedDetail);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (selectedDetail?.id) {
      const fetchLatestDetail = async () => {
        setIsLoading(true);
        try {
          const response = await getDetailCutiById(selectedDetail.id); 
          setDetailData(response);
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

  const statusKey = (detailData.globalStatus || 'PROSES').toUpperCase();
  const statusTercetak = STATUS_LABEL[statusKey] || detailData.globalStatus || "Proses";

  // RESOLVER JENIS PERMOHONAN: 
  // Mengecek apakah backend mengirimkan ID (leaveTypeId / leave_type_id) 
  // Jika berupa ID angka, cari namanya di LEAVE_TYPES. Jika tidak ada/berupa string lama, gunakan nilai fallback text.
  const dbLeaveTypeId = detailData.leaveTypeId || detailData.leave_type_id;
  const jenisPermohonanTercetak = LEAVE_TYPES[dbLeaveTypeId] || detailData.leaveType || "Cuti";

  const generateDynamicLogs = () => {
    const logs = [
      {
        nama: detailData.pemohon || 'Member',
        tanggal: detailData.stringTanggal,
        aksi: 'DIAJUKAN',
        catatan: 'Mengajukan awal'
      }
    ];

    const leaderNama = detailData.leader?.nama || detailData.leaderEmployeeId;
    const leaderStatus = detailData.leader?.status || (detailData.leaderEmployeeId ? 'Approved' : null);
    if (leaderNama && leaderStatus && leaderStatus !== 'Pending') {
      logs.push({
        nama: `${leaderNama} (Leader)`,
        tanggal: detailData.stringTanggal,
        aksi: leaderStatus.toUpperCase(),
        catatan: detailData.leader?.catatan || (leaderStatus.toLowerCase() === 'approved' ? 'Meneruskan ke SPV' : 'Menolak berkas')
      });
    }

    const spvNama = detailData.spv?.nama || detailData.spvEmployeeId;
    const spvStatus = detailData.spv?.status || (detailData.spvEmployeeId ? 'Approved' : null);
    if (spvNama && spvStatus && spvStatus !== 'Pending') {
      logs.push({
        nama: `${spvNama} (SPV)`,
        tanggal: detailData.stringTanggal,
        aksi: spvStatus.toUpperCase(),
        catatan: detailData.spv?.catatan || (spvStatus.toLowerCase() === 'approved' ? 'Meneruskan ke Manager' : 'Mengembalikan berkas')
      });
    }

    const managerNama = detailData.manager?.nama || detailData.managerEmployeeId;
    const managerStatus = detailData.manager?.status || (detailData.managerEmployeeId ? 'Approved' : null);
    if (managerNama && managerStatus && managerStatus !== 'Pending') {
      logs.push({
        nama: `${managerNama} (Manager)`,
        tanggal: detailData.stringTanggal,
        aksi: managerStatus.toUpperCase(),
        catatan: detailData.manager?.catatan || (managerStatus.toLowerCase() === 'approved' ? 'Menyetujui cuti (ACC)' : 'Menolak berkas')
      });
    }

    return logs;
  };

  const finalLogs = detailData.logPemeriksaan && detailData.logPemeriksaan.length > 0
    ? detailData.logPemeriksaan 
    : generateDynamicLogs();

  const handleActionApproval = async (statusAksi, catatanAtasan = '') => {
    try {
      const payload = {
        cutiId: detailData.id,
        roleAtasan: currentUserRole,
        status: statusAksi,          
        catatan: catatanAtasan,
        isUpdateOnly: true,
      };

      await updateStatusCuti(payload);
      alert(`Berkas berhasil diperbarui ke status: ${statusAksi}!`);
      if (onRefreshData) onRefreshData(); 
      onClose(); 
    } catch (error) {
      alert("Gagal memperbarui status persetujuan.");
    }
  };

  const isAtasan = currentUserRole === 'leader' || currentUserRole === 'spv' || currentUserRole === 'manager';
  const leaderSudahAksi = !detailData.leader?.nama || (detailData.leader?.status && detailData.leader.status !== 'Pending');
  const spvSudahAksi = !detailData.spv?.nama || (detailData.spv?.status && detailData.spv.status !== 'Pending');

  const bisaBertindakSesuaiUrutan =
    currentUserRole === 'leader' ||
    (currentUserRole === 'spv' && leaderSudahAksi) ||
    (currentUserRole === 'manager' && leaderSudahAksi && spvSudahAksi);

  const levelPengembali = ['leader', 'spv', 'manager']
    .map((lvl) => detailData[lvl])
    .find((lvl) => lvl?.status?.toLowerCase() === 'returned' && lvl?.catatan);

  return (
    <div className="form-cuti__overlay" onMouseDown={onClose}>
      <div className="form-cuti__modal" role="dialog" aria-modal="true" aria-labelledby="form-cuti-title" onMouseDown={(e) => e.stopPropagation()}>
        {/* HEADER MODAL */}
        <div className="form-cuti__header">
          <div>
            <h2 id="form-cuti-title" className="form-cuti__title">
              Informasi Detail Berkas Cuti {isLoading && "(Memuat...)"}
            </h2>
            <p className="form-cuti__subtitle">Pantau alur verifikasi berkas secara berjenjang</p>
          </div>
          <button type="button" className="form-cuti__close" aria-label="Tutup" onClick={onClose}>&times;</button>
        </div>

        {/* BODY MODAL */}
        <div className="form-cuti__body">
          <div className="form-cuti__grid">
            <div className="form-cuti__field">
              <span className="form-cuti__label">Pemohon</span>
              <span className="form-cuti__value">{detailData.pemohon}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Jenis Permohonan</span>
              {/* SEKARANG SUDAH MENGGUNAKAN DATA SINKRON DATABASE */}
              <span className="form-cuti__value">{jenisPermohonanTercetak}</span>
            </div>

            <div className="form-cuti__field">
              <span className="form-cuti__label">Durasi Kerja</span>
              <span className="form-cuti__value form-cuti__value--accent">{detailData.stringTanggal}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Status Sekarang</span>
              <span className="form-cuti__value">{statusTercetak}</span>
            </div>
          </div>

          <div className="form-cuti__divider" />

          <div className="form-cuti__grid form-cuti__grid--three">
            <div className="form-cuti__field">
              <span className="form-cuti__label">App. Leader</span>
              <span className="form-cuti__value">{detailData.leader?.nama || detailData.leaderEmployeeId || '-'}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">App. SPV</span>
              <span className="form-cuti__value">{detailData.spv?.nama || detailData.spvEmployeeId || '-'}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">App. Manager</span>
              <span className="form-cuti__value">{detailData.manager?.nama || detailData.managerEmployeeId || '-'}</span>
            </div>
          </div>

          <div className="form-cuti__section">
            <span className="form-cuti__label">Alasan Keterangan</span>
            <div className="form-cuti__box">{detailData.reason || '-'}</div>
          </div>

          {detailData.pendingWork && (
            <div className="form-cuti__section">
              <span className="form-cuti__label">Pekerjaan Tertunda</span>
              <div className="form-cuti__box form-cuti__box--warn form-cuti__box--italic">{detailData.pendingWork}</div>
            </div>
          )}

          {detailData.coveredBy && (
            <div className="form-cuti__section">
              <span className="form-cuti__label">Dicover Oleh</span>
              <div className="form-cuti__box form-cuti__box--blue form-cuti__box--bold">{detailData.coveredBy}</div>
            </div>
          )}

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
                    <div className="form-cuti__log-bottom">Status &middot; {log.aksi} ({log.catatan})</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {detailData.globalStatus?.toLowerCase() === 'dikembalikan' && levelPengembali && (
            <div className="form-cuti__section form-cuti__section--feedback">
              <div className="form-cuti__box form-cuti__box--danger">
                <strong>Catatan Pengembalian:</strong> {levelPengembali.catatan}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MODAL & TOMBOL AKSI */}
        <div className="form-cuti__footer">
          {isAtasan ? (
            bisaBertindakSesuaiUrutan ? (
              <div className="action-approval-buttons">
                <button type="button" className="btn-approve" onClick={() => handleActionApproval('Approved')}>Setujui (ACC)</button>
                <button type="button" className="btn-return" onClick={() => handleActionApproval('Returned', 'Mohon perbaiki berkas')}>Kembalikan</button>
                <button type="button" className="btn-close-mute" onClick={onClose}>Batal</button>
              </div>
            ) : (
              <div className="action-approval-buttons">
                <div className="form-cuti__box form-cuti__box--warn" style={{ flex: 1 }}>
                  Menunggu persetujuan level sebelumnya sebelum Anda dapat bertindak.
                </div>
                <button type="button" className="btn-close-mute" onClick={onClose}>Tutup</button>
              </div>
            )
          ) : (
            <div className="action-employee-buttons">
              {handleEditKembali && statusKey === 'DIKEMBALIKAN' && (
                <button 
                  type="button" 
                  className="form-cuti__edit-btn" 
                  onClick={() => {
                    handleEditKembali(detailData.id || detailData.rawId);
                    onClose();
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