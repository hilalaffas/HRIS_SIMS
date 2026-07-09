  import React, { useMemo, useState } from 'react';
  import './ListSection.css';
  import FilterStatusDropdown from './FilterStatusDropdown';

  /**
   * ListCutiSection.jsx
   * ------------------------------------------------------------------
   * Sesuai gambar `listcuti.PNG` + `filterlistcuti.PNG`.
   *
   * Props:
   *  - data: array seluruh riwayat permohonan cuti
   *  - sisaCuti: objek sisa cuti global (jika ada)
   *  - onOpenDetail: (item) => void  -> buka popup `popuplistcuti.PNG`
   * ------------------------------------------------------------------
   */
  const STATUS_OPTIONS = [
    { value: "ALL", label: "Semua Status" },
    { value: "PROSES", label: "Dalam Proses" },
    { value: "DISETUJUI", label: "Disetujui (ACC)" },
    { value: "DIKEMBALIKAN", label: "Dikembalikan (Revisi)" },
    { value: "DITOLAK", label: "Ditolak" },
  ];

  const STATUS_BADGE_CLASS = {
    PROSES: "statusBadge--blue",
    DISETUJUI: "statusBadge--green",
    DIKEMBALIKAN: "statusBadge--amber",
    DITOLAK: "statusBadge--rose",
  };

  const STATUS_BADGE_LABEL = {
    PROSES: "Proses",
    DISETUJUI: "Disetujui",
    DIKEMBALIKAN: "Dikembalikan",
    DITOLAK: "Ditolak",
  };

  const LeaveListSection = ({ data, sisaCuti, onOpenDetail }) => {
    const [statusFilter, setStatusFilter] = useState("ALL");

    const filteredData = useMemo(() => {
      if (!data) return [];
      if (statusFilter === "ALL") return data;
      return data.filter((item) => item.statusBerkas === statusFilter);
    }, [data, statusFilter]);

    return (
      <div className="leaveList">
        <div className="leaveList__toolbar">
          <div className="leaveList__total">
            Total Riwayat: <strong>{filteredData.length} Data</strong>
          </div>

          <FilterStatusDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
        </div>

        {filteredData.length === 0 ? (
          <div className="leaveList__empty">Belum ada riwayat cuti untuk status ini.</div>
        ) : (
          <div className="leaveList__table" role="table">
            <div className="leaveList__row leaveList__row--head" role="row">
              <div role="columnheader">Karyawan Pemohon</div>
              <div role="columnheader">Detail Cuti</div>
              <div role="columnheader">Sisa Cuti</div>
              <div role="columnheader" className="leaveList__colStatus">
                Status Berkas
              </div>
              <div role="columnheader" className="leaveList__colLog">
                Log Detail
              </div>
            </div>

            {filteredData.map((item) => {
              // Mengambil kuota dari item (mock data Anda menggunakan nama 'KuotaCuti')
              // Jika item tidak punya KuotaCuti, dia akan fallback ke prop global 'sisaCuti'
              const infoCuti = item.KuotaCuti || sisaCuti;

              return (
                <div className="leaveList__row" role="row" key={item.id}>
                  <div role="cell">
                    <div className="leaveList__name">{item.karyawan?.nama}</div>
                    <div className="leaveList__code">{item.karyawan?.kode}</div>
                  </div>

                  <div role="cell">
                    <div className="leaveList__type">{item.jenisCuti}</div>
                    <div className="leaveList__duration">{item.durasi}</div>
                  </div>

                  <div role="cell">
                    {infoCuti ? (
                      <span className="leaveList__quota">
                        <strong>{infoCuti.totalHari} hari</strong>
                      </span>
                    ) : (
                      <span className="leaveList__quota">-</span>
                    )}
                  </div>

                  <div role="cell" className="leaveList__colStatus">
                    <span className={`statusBadge ${STATUS_BADGE_CLASS[item.statusBerkas]}`}>
                      {STATUS_BADGE_LABEL[item.statusBerkas]}
                    </span>
                  </div>

                  <div role="cell" className="leaveList__colLog">
                    <button
                      type="button"
                      className="leaveList__detailsBtn"
                      onClick={() => onOpenDetail(item)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                      Rincian
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  export default LeaveListSection;