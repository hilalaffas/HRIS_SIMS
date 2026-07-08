import React from 'react';
import './ApproveSection.css';

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
 *  - data: array permohonan cuti yang perlu diproses
 *  - sisaCuti: { totalHari, berlakuHingga }
 *  - onAction: (id, 'acc' | 'revisi' | 'tolak') => void
 *  - onOpenDetail: (item) => void
 * ------------------------------------------------------------------
 */
const ApprovalSection = ({ data, sisaCuti, onAction, onOpenDetail }) => {
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
            <div role="columnheader" className="approvalSection__colActions">
              Aksi Tindakan
            </div>
          </div>

          {data.map((item) => (
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
                <span className="approvalSection__quota"> &nbsp;<strong>{sisaCuti.totalHari} hari</strong>
                </span>
              </div>

              <div role="cell" className="approvalSection__colActions">
                <div className="approvalSection__actions">
                  <button
                    type="button"
                    className="alvBtnPill alvBtnPill--green"
                    onClick={() => onAction(item.id, "acc")}
                  >
                    ACC
                  </button>
                  <button
                    type="button"
                    className="alvBtnPill alvBtnPill--amber"
                    onClick={() => onAction(item.id, "revisi")}
                  >
                    Revisi
                  </button>
                  <button
                    type="button"
                    className="alvBtnPill alvBtnPill--rose"
                    onClick={() => onAction(item.id, "tolak")}
                  >
                    Tolak
                  </button>

                  <button
                    type="button"
                    className="approvalSection__detailBtn"
                    aria-label="Lihat riwayat detail"
                    title="Lihat riwayat detail"
                    onClick={() => onOpenDetail(item)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalSection;