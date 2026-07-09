import React, { useMemo, useState } from 'react';
import './LeaveListHr.css';
import FilterStatusDropdown from './FilterStatusDropdown'; // Pastikan path ini benar di project Anda

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "PROSES", label: "Dalam Proses" },
  { value: "DISETUJUI", label: "Disetujui (ACC)" },
  { value: "DIKEMBALIKAN", label: "Dikembalikan (Revisi)" },
  { value: "DITOLAK", label: "Ditolak" },
];

const STATUS_BADGE_CLASS = {
  PROSES: "statusBadge--blue_leaveListHr",
  DISETUJUI: "statusBadge--green_leaveListHr",
  DIKEMBALIKAN: "statusBadge--amber_leaveListHr",
  DITOLAK: "statusBadge--rose_leaveListHr",
};

const STATUS_BADGE_LABEL = {
  PROSES: "Proses",
  DISETUJUI: "Disetujui",
  DIKEMBALIKAN: "Dikembalikan",
  DITOLAK: "Ditolak",
};

const LeaveListHr = ({ data, sisaCuti, onOpenDetail, currentUserRole, onRevokeLeave }) => {
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // State untuk modal revoke
  const [revokeItem, setRevokeItem] = useState(null);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "ALL") return data;
    return data.filter((item) => item.statusBerkas === statusFilter);
  }, [data, statusFilter]);

  const canRevoke = currentUserRole === 'hrd_karyawan' || currentUserRole === 'hrd_admin' || currentUserRole === 'superadmin' || currentUserRole === 'admin';

  const handleConfirmRevoke = () => {
    if (revokeItem && onRevokeLeave) {
      onRevokeLeave(revokeItem.id);
    }
    setRevokeItem(null);
  };

  return (
    <div className="leaveList_leaveListHr">
      <div className="leaveList__toolbar_leaveListHr">
        <div className="leaveList__total_leaveListHr">
          Total Riwayat: <strong>{filteredData.length} Data</strong>
        </div>
        <FilterStatusDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
      </div>

      {filteredData.length === 0 ? (
        <div className="leaveList__empty_leaveListHr">Belum ada riwayat cuti untuk status ini.</div>
      ) : (
        <div className="leaveList__table_leaveListHr">
          <div className="leaveList__row_leaveListHr leaveList__row--head_leaveListHr">
            <div>Karyawan Pemohon</div>
            <div>Detail Cuti</div>
            <div>Sisa Cuti</div>
            <div className="leaveList__colStatus_leaveListHr">Status Berkas</div>
            <div className="leaveList__colLog_leaveListHr">Aksi</div>
          </div>

          {filteredData.map((item) => {
            const infoCuti = item.KuotaCuti || sisaCuti;
            const isDitolak = item.statusBerkas === 'DITOLAK';

            return (
              <div className="leaveList__row_leaveListHr" key={item.id}>
                <div>
                  <div className="leaveList__name_leaveListHr">{item.karyawan?.nama}</div>
                  <div className="leaveList__code_leaveListHr">{item.karyawan?.kode}</div>
                </div>
                <div>
                  <div className="leaveList__type_leaveListHr">{item.jenisCuti}</div>
                  <div className="leaveList__duration_leaveListHr">{item.durasi}</div>
                </div>
                <div>
                  <span className="leaveList__quota_leaveListHr">
                    {infoCuti ? <strong>{infoCuti.totalHari} hari</strong> : "-"}
                  </span>
                </div>
                <div className="leaveList__colStatus_leaveListHr">
                  <span className={`statusBadge_leaveListHr ${STATUS_BADGE_CLASS[item.statusBerkas]}`}>
                    {STATUS_BADGE_LABEL[item.statusBerkas]}
                  </span>
                </div>
                <div className="leaveList__colLog_leaveListHr">
                  <button type="button" className="leaveList__detailsBtn_leaveListHr" onClick={() => onOpenDetail(item)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" /></svg>
                    Rincian
                  </button>
                  
                  {/* Tampilkan Tombol Pulihkan Khusus HR jika status Ditolak */}
                  {isDitolak && canRevoke && (
                    <button type="button" className="leaveList__revokeBtn_leaveListHr" onClick={() => setRevokeItem(item)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                      Pulihkan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PEMULIHAN BERKAS */}
      {revokeItem && (
        <div className="modal-overlay_leaveListHr">
          <div className="modal-content_leaveListHr">
            <div className="modal-header_leaveListHr">
              <div className="icon-wrapper-blue_leaveListHr">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h3>Memulihkan Berkas?</h3>
            </div>
            <div className="modal-body_leaveListHr">
              <p>Anda akan memulihkan berkas (Revoke) ini agar kembali ke antrean persetujuan Atasan (Status: Proses).</p>
            </div>
            <div className="modal-footer_leaveListHr">
              <button className="btn-batal_leaveListHr" onClick={() => setRevokeItem(null)}>Batal</button>
              <button className="btn-pulihkan_leaveListHr" onClick={handleConfirmRevoke}>Pulihkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveListHr;