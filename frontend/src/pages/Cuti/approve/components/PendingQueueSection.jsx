// src/pages/Cuti/approve/components/PendingQueueSection.jsx
//
// [BARU] Isi tab "Perlu Diproses" di Pusat Persetujuan. SEMUA aksi ACC dipusatkan di sini:
//   - Cuti             -> ApproveSection (ACC / Revisi / Tolak + alasan, tidak berubah)
//   - Lembur           -> ApprovalTable (Setujui / Tolak), detail = OvertimeDetailModal;
//                         [UBAH] Setujui & Tolak sama-sama membuka ActionReasonModal dulu
//                         (Setujui = konfirmasi, catatan opsional; Tolak = alasan wajib)
//   - Koreksi Absensi  -> ApprovalTable (Setujui / Tolak), detail = AttendanceCorrectionDetailModal;
//                         [UBAH] alur konfirmasi sama seperti Lembur
//   - Sakit & Izin     -> PersetujuanIzin (verifikasi surat + bukti, ACC massal) -- hanya HRD
// Props `overtime` / `corrections` / `permission` bernilai null untuk role yang tidak berhak,
// jadi role tersebut tidak melihat pilihan jenisnya (role tanpa antrean lain melihat daftar cuti saja).
//
// ACC berjenjang: baris antrean sudah difilter `isActionableRow` (utils/approvalQueue.js),
// yaitu hanya yang gilirannya tiba menurut backend. Komponen ini tidak menentukan urutan.
//
// Contoh pemakaian:
// <PendingQueueSection user={user} leaveData={pending} onRequestAction={fn} onOpenLeaveDetail={fn}
//   overtime={overtime} overtimeRows={rows} corrections={corrections} correctionRows={rows}
//   permission={permission} initialQueue="sakit"
//   onOpenOvertimeDetail={fn} onOpenCorrectionDetail={fn} />
import React, { useMemo, useState } from 'react';
import ApproveSection from './ApproveSection';
import ActionReasonModal from './ActionReasonModal'; // [BARU] konfirmasi Setujui/Tolak (alasan wajib saat Tolak)
import ApprovalTable from '../../../../components/ApprovalTable';
import PersetujuanIzin from '../../../PersetujuanIzin/PersetujuanIzin'; // [BARU] isi pilihan "Sakit & Izin"
import Toast from '../../../../components/Toast';
import { APPROVAL_COPY } from '../../../../constants/approvalCopy'; // [UBAH] teks popup lembur & koreksi
import { formatDateLabel } from '../../../../services/attendanceService'; // [BARU]
import './PendingQueueSection.css';

const QUEUE = { LEAVE: 'cuti', OVERTIME: 'lembur', CORRECTION: 'koreksi', PERMISSION: 'sakit' };

export default function PendingQueueSection({
  user,
  leaveData,
  onRequestAction,
  onOpenLeaveDetail,
  overtime = null,
  overtimeRows = [],
  corrections = null,
  correctionRows = [],
  onOpenOvertimeDetail,
  onOpenCorrectionDetail, // [BARU] buka popup Informasi Detail Berkas Koreksi Absensi
  permission = null, // [BARU] hasil usePermissionApprovals() -- hanya untuk HRD
  initialQueue = QUEUE.LEAVE, // [BARU] pilihan awal (mis. dari ?queue=sakit)
}) {
  const [activeQueue, setActiveQueue] = useState(() => (initialQueue === QUEUE.PERMISSION && !permission ? QUEUE.LEAVE : initialQueue));
  // [UBAH] Keputusan yang menunggu konfirmasi (lembur / koreksi, Setujui / Tolak). null = popup tertutup.
  // Bentuknya { kind: 'overtime' | 'correction', row, status: 'APPROVED' | 'REJECTED' }.
  const [pendingDecision, setPendingDecision] = useState(null);

  // [BARU] Wajib di-memo: ActionReasonModal mereset isian setiap `request` berganti referensi,
  // jadi objek baru di tiap render akan menghapus alasan yang sedang diketik.
  const decisionRequest = useMemo(() => {
    if (!pendingDecision) return null;
    const { kind, row, status } = pendingDecision;
    const isApprove = status === 'APPROVED';
    return {
      item: row,
      action: isApprove ? 'acc' : 'tolak',
      subject: { name: row.employeeName, meta: `${formatDateLabel(row.date)} \u00b7 ${row.subDetail}` },
      copy: APPROVAL_COPY[kind][isApprove ? 'approve' : 'reject'],
    };
  }, [pendingDecision]);

  // [UBAH] Tombol Setujui/Tolak TIDAK lagi langsung memproses; hanya membuka popup konfirmasi.
  const requestDecision = (kind) => (row, status) => setPendingDecision({ kind, row, status });

  // [UBAH] Popup ditutup hanya jika server menerima keputusan; bila gagal, isian catatan tetap ada.
  const submitDecision = async (rowId, action, note) => {
    if (!pendingDecision) return;
    const source = pendingDecision.kind === 'overtime' ? overtime : corrections;
    const success = await source.handleDecision(pendingDecision.row, pendingDecision.status, note);
    if (success) setPendingDecision(null);
  };

  // Pilihan jenis hanya tampil kalau role punya lebih dari satu antrean.
  const queues = useMemo(
    () => [
      { key: QUEUE.LEAVE, label: 'Cuti', count: leaveData.length },
      ...(overtime ? [{ key: QUEUE.OVERTIME, label: 'Lembur', count: overtimeRows.length }] : []),
      ...(corrections ? [{ key: QUEUE.CORRECTION, label: 'Koreksi Absensi', count: correctionRows.length }] : []),
      ...(permission ? [{ key: QUEUE.PERMISSION, label: 'Sakit & Izin', count: permission.stats.pending }] : []),
    ],
    [leaveData.length, overtime, overtimeRows.length, corrections, correctionRows.length, permission],
  );

  return (
    <div className="pendingQueue">
      {queues.length > 1 && (
        <div className="pendingQueue__filter" role="tablist" aria-label="Jenis pengajuan">
          {queues.map((queue) => (
            <button
              key={queue.key}
              type="button"
              role="tab"
              aria-selected={activeQueue === queue.key}
              className={`pendingQueue__pill${activeQueue === queue.key ? ' is-active' : ''}`}
              onClick={() => setActiveQueue(queue.key)}
            >
              {queue.label}
              {queue.count > 0 && <span className="pendingQueue__count">{queue.count}</span>}
            </button>
          ))}
        </div>
      )}

      {activeQueue === QUEUE.LEAVE && (
        <ApproveSection
          data={leaveData}
          user={user}
          onRequestAction={onRequestAction}
          onOpenDetail={onOpenLeaveDetail}
        />
      )}

      {activeQueue === QUEUE.OVERTIME && overtime && (
        <div className="pendingQueue__panel">
          <ApprovalTable
            rows={overtimeRows}
            loading={overtime.loading}
            processingKey={overtime.processingKey}
            emptyMessage="Tidak ada pengajuan lembur yang perlu Anda proses saat ini."
            onDecision={requestDecision('overtime')}
            onOpenDetail={onOpenOvertimeDetail}
          />
          <Toast show={!!overtime.toast} message={overtime.toast?.message} type={overtime.toast?.type} />
        </div>
      )}

      {activeQueue === QUEUE.CORRECTION && corrections && (
        <div className="pendingQueue__panel">
          <ApprovalTable
            rows={correctionRows}
            loading={corrections.loading}
            processingKey={corrections.processingKey}
            emptyMessage="Tidak ada koreksi absensi yang perlu Anda proses saat ini."
            onDecision={requestDecision('correction')}
            onOpenDetail={onOpenCorrectionDetail}
          />
          <Toast show={!!corrections.toast} message={corrections.toast?.message} type={corrections.toast?.type} />
        </div>
      )}

      {activeQueue === QUEUE.PERMISSION && permission && (
        <PersetujuanIzin approvals={permission} embedded mode="queue" />
      )}

      {/* [UBAH] Satu popup konfirmasi dipakai bersama oleh antrean Lembur & Koreksi Absensi */}
      <ActionReasonModal
        request={decisionRequest}
        isSubmitting={Boolean(overtime?.processingKey || corrections?.processingKey)}
        onCancel={() => setPendingDecision(null)}
        onSubmit={submitDecision}
      />
    </div>
  );
}
