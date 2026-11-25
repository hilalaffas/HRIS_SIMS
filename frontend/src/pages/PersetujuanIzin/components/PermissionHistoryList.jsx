import MobileRecords from '../../../components/MobileRecords';
import React, { useMemo, useState } from 'react';
import { Eye, ClipboardCheck } from 'lucide-react';
import PermissionProcessModal from './PermissionProcessModal';
import FilterStatusDropdown from '../../Cuti/approve/components/FilterStatusDropdown';
import RequestDetailModal from '../../Pengajuan/components/RequestDetailModal';
import { buildRequestDetail, buildPengajuanItems } from '../../Pengajuan/utils/pengajuanItems';
import { buildSickCardModel } from '../../../utils/approvalCardModels';
import { toDisplayRecord } from '../../../services/attendanceService';
import { buildPermissionLogs, permissionFileStatus } from '../../../utils/permissionReviewLog';
import { formatPeriod } from '../utils/permissionRequest';
import '../../Cuti/approve/components/ListSection.css';
import '../../Cuti/approve/components/ApproveSection.css';
import './PermissionHistoryList.css';

const OPTIONS = [
  { value: 'ALL', label: 'Semua Status' }, { value: 'PENDING', label: 'Menunggu ACC' },
  { value: 'INCOMPLETE', label: 'Disetujui (Belum Lengkap)' },
  { value: 'VERIFICATION', label: 'Verifikasi Surat' }, { value: 'REVISION', label: 'Revisi Surat' }, { value: 'COMPLETE', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' }, { value: 'EXPIRED', label: 'Batas Surat Terlewati' }, { value: 'RECORDED', label: 'Tercatat' },
];

export default function PermissionHistoryList({ approvals, mode = 'history' }) {
  const isQueue = mode === 'queue';
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const rows = useMemo(() => approvals.rows.filter((row) => !isQueue || row.status === 'PENDING' || row.documentReviewPending).map((row) => ({ ...row, fileStatus: permissionFileStatus(row) })), [approvals.rows, isQueue]);
  const filtered = rows.filter((row) => filter === 'ALL' || row.fileStatus.code === filter);
  const selected = rows.find((row) => row.id === selectedId);
  let detail = null;
  if (selected && !isQueue) {
    const record = toDisplayRecord(selected.source);
    const item = buildPengajuanItems({ attendanceRecords: [record] })[0];
    if (item) {
      detail = buildRequestDetail(item, selected.type === 'SAKIT' ? buildSickCardModel(record) : undefined);
      detail = { ...detail, subtitle: `${selected.employeeName} · ${selected.division}`, statusLabel: selected.fileStatus.label,
        statusTone: selected.fileStatus.statusTone,
        logs: buildPermissionLogs(record) };
    }
  }
  return <div className="leaveList permission-history">
    <div className="leaveList__toolbar">
      <div className="leaveList__total">{isQueue ? 'Total Antrean' : 'Total Riwayat'}: <strong>{filtered.length} Data</strong></div>
      <FilterStatusDropdown value={filter} onChange={setFilter} options={isQueue ? OPTIONS.filter((option) => ['ALL', 'PENDING', 'VERIFICATION', 'EXPIRED'].includes(option.value)) : OPTIONS} />
    </div>
    {approvals.loadError && <p role="alert" className="leaveList__empty">{approvals.loadError}</p>}
    {approvals.loading ? <div className="leaveList__empty">Memuat riwayat sakit &amp; izin...</div>
      : !filtered.length ? <div className="leaveList__empty">Belum ada riwayat untuk status ini.</div>
        : <div className="permission-history__scroll"><MobileRecords labels={['Karyawan pemohon', 'Detail', 'Status berkas', isQueue ? 'Aksi' : 'Log detail']} statusIndex={2} actionIndex={3} ariaLabel={isQueue ? 'Sakit dan izin perlu diproses' : 'Riwayat sakit dan izin'}>
<div className="leaveList__table" role="table" aria-label={isQueue ? "Antrean sakit dan izin" : "Riwayat sakit dan izin"}>
          <div className="leaveList__row leaveList__row--head" role="row">
            {['Karyawan Pemohon', 'Detail', 'Status Berkas', isQueue ? 'Aksi' : 'Log Detail'].map((label) => <div role="columnheader" key={label}>{label}</div>)}
          </div>
          {filtered.map((row) => <div className="leaveList__row" role="row" key={row.id}>
            <div role="cell"><div className="leaveList__name">{row.employeeName}</div><div className="leaveList__code">{row.division}</div></div>
            <div role="cell"><div className="leaveList__type">{row.typeLabel}</div><div className="leaveList__duration">{formatPeriod(row.startDate, row.endDate)} ({row.workDays} {row.durationUnit})</div></div>
            <div role="cell" className="permission-history__status"><span className={`statusBadge statusBadge--${row.fileStatus.tone}`}>{row.fileStatus.label}</span>
              {row.type === 'SAKIT' && <><small>{row.fileStatus.condition}</small><small>{row.fileStatus.nextAction}</small></>}
            </div>
            <div role="cell"><button type="button" className={isQueue ? "alvBtnPill alvBtnPill--green permission-history__process" : "leaveList__detailsBtn"} onClick={() => setSelectedId(row.id)}>{isQueue ? <ClipboardCheck size={15} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}{isQueue ? 'Proses' : 'Rincian'}</button></div>
          </div>)}
        </div>
</MobileRecords></div>}
    {isQueue && selected && <PermissionProcessModal row={selected} processing={approvals.processingIds?.has(selected.id) || false} onDecision={approvals.decide} onClose={() => setSelectedId(null)} />}
    {detail && <RequestDetailModal detail={detail} onClose={() => setSelectedId(null)} />}
  </div>;
}
