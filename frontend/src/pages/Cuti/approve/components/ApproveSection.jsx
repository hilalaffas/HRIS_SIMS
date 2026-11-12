import React from 'react';
import './ApproveSection.css';
import { dayText } from '../../../../services/CutiService';
import { getUserRole } from '../../../../utils/roles';

/**
 * PerluDiprosesSection.jsx  ("bagianApproval")
 * ------------------------------------------------------------------
 * Sesuai gambar `bagianApproval.PNG` + `button_detail_approval.PNG`.
 *
 * Perubahan sesuai catatan:
 * Info "Sisa Cuti Tahunan" yang tadinya jadi card hijau besar di
 * headline, sekarang ditaruh di sini sebagai baris info kecil
 * (tidak mencolok), berdampingan dengan jumlah total permohonan.
 *
 * Props:
 *  - data: array permohonan cuti yang perlu diproses. Tiap item punya
 *      karyawan.totalRemainingLeave -- Total Sisa Cuti (Tahunan + Lama)
 *      milik KARYAWAN PEMOHON di baris itu (di-merge di ApproveLeave.jsx
 *      dari /api/cuti/balance/all), BUKAN saldo milik approver yang login.
 *  - onRequestAction: (item, 'acc' | 'revisi' | 'tolak') => void
 *      Dipanggil saat tombol ACC/Revisi/Tolak diklik. TIDAK langsung
 *      mengubah status — hanya membuka ActionReasonModal di komponen
 *      induk (ApproveLeave.jsx). Status baru benar-benar berubah
 *      setelah approver mengisi alasan & submit modal tersebut.
 *  - onOpenDetail: (item) => void
 * ------------------------------------------------------------------
 */
const ApprovalSection = ({ data, user, onRequestAction, onOpenDetail }) => {
  const currentRole = getUserRole(user).toUpperCase();
  const statusBadgeClass = (status) => {
    const value = String(status || '').toUpperCase();
    if (value.includes('DITOLAK')) return 'statusBadge--rose';
    if (value.includes('REVISI') || value.includes('DIKEMBALIKAN')) return 'statusBadge--amber';
    if (value.includes('SUDAH DI-ACC') || value.includes('DISETUJUI') || value.includes('DISETUJUI (ACC)')) return 'statusBadge--green';
    return 'statusBadge--blue';
  };
  const activeRoleFromStatus = (item) => {
    const status = String(item.approvalProgressStatus || '').toUpperCase();
    if (status.includes('MENUNGGU PERSETUJUAN LEADER')) return 'LEADER';
    if (status.includes('MENUNGGU PERSETUJUAN SPV')) return 'SPV';
    if (status.includes('MENUNGGU PERSETUJUAN MANAGER')) return 'MANAGER';
    return null;
  };
  return (
    <div className="approvalSection">
      <div className="approvalSection__toolbar">
        <div className="approvalSection__count">
          Total Perlu diproses : <strong>{data.length} Permohonan</strong>
        </div>  
      </div>

      {data.length === 0 ? (
        <div className="approvalSection__empty">
          Tidak ada permohonan cuti yang perlu diproses saat ini.
        </div>
      ) : (
        <div className="approvalSection__table" role="table">
          <div className="approvalSection__row approvalSection__row--head" role="row">
            <div role="columnheader">Karyawan Pemohon</div>
            <div role="columnheader">Detail Cuti</div>
            <div role="columnheader">Keterangan</div>
            <div role="columnheader">Kuota Cuti</div>
            <div role="columnheader">Status Persetujuan</div>
            <div role="columnheader" className="approvalSection__colActions">
              Aksi Tindakan
            </div>
          </div>

          {data.map((item) => {
            const activeRole = activeRoleFromStatus(item);
            const canAct = activeRole === currentRole;
            return (
            <div className="approvalSection__row" role="row" key={item.id}>
              <div role="cell">
                <div className="approvalSection__name">
                  {item.karyawan.nama}{" "}
                  <span className="approvalSection__code">({item.karyawan.kode})</span>
                </div>
                <div className="approvalSection__position">{item.karyawan.jabatan}</div>
              </div>

              <div role="cell">
                <div className="approvalSection__type">{item.jenisCuti}</div>
                <div className="approvalSection__duration">{item.durasi}</div>
              </div>

              <div role="cell">
                <span className="approvalSection__note">&ldquo;{item.keterangan}&rdquo;</span>
              </div>

              <div role="cell">
                <span className="approvalSection__quota">
                  {item.karyawan?.totalRemainingLeave != null ? (
                    <strong>{dayText(item.karyawan.totalRemainingLeave)} hari</strong>
                  ) : (
                    <strong>-</strong>
                  )}
                </span>
              </div>

              <div role="cell">
                <span className={`approvalSection__status statusBadge ${statusBadgeClass(item.approvalProgressStatus)}`}>{item.approvalProgressStatus || 'Dalam proses persetujuan'}</span>
              </div>

              <div role="cell" className="approvalSection__colActions">
                <div className="approvalSection__actions">
                  <button
                    type="button"
                    className="alvBtnPill alvBtnPill--green"
                    disabled={!canAct}
                    title={!canAct ? `Menunggu persetujuan ${activeRole || 'tahap sebelumnya'}` : 'ACC'}
                    onClick={() => onRequestAction(item, "acc")}
                  >
                    ACC
                  </button>
                  <button
                    type="button"
                    className="alvBtnPill alvBtnPill--amber"
                    disabled={!canAct}
                    title={!canAct ? `Menunggu persetujuan ${activeRole || 'tahap sebelumnya'}` : 'Revisi'}
                    onClick={() => onRequestAction(item, "revisi")}
                  >
                    Revisi
                  </button>
                  <button
                    type="button"
                    className="alvBtnPill alvBtnPill--rose"
                    disabled={!canAct}
                    title={!canAct ? `Menunggu persetujuan ${activeRole || 'tahap sebelumnya'}` : 'Tolak'}
                    onClick={() => onRequestAction(item, "tolak")}
                  >
                    Tolak
                  </button>

                  <button
                    type="button"
                    className="approvalSection__detailBtn"
                    title="Lihat rincian dan alur approval"
                    onClick={() => onOpenDetail(item)}
                  >
                    {/* [UBAH] Dulu ikon jam saja; kini "Rincian" + ikon mata, sama persis dengan List Cuti (ListSection.jsx) */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    Rincian
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalSection;