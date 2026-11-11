// src/pages/Cuti/approve/components/PendingQueueSection.jsx
//
// [BARU] Isi tab "Perlu Diproses" di Pusat Persetujuan. SEMUA aksi ACC dipusatkan di sini:
//   - Cuti             -> ApproveSection (ACC / Revisi / Tolak + alasan, tidak berubah)
//   - Lembur           -> ApprovalTable (Setujui / Tolak), detail = OvertimeDetailModal
//   - Koreksi Absensi  -> ApprovalTable (Setujui / Tolak)
// Hanya Leader/SPV/Manager yang punya antrean Lembur & Koreksi (props `overtime` /
// `corrections` bernilai null untuk role lain), jadi role lain tetap melihat daftar cuti saja
// tanpa pilihan jenis.
//
// ACC berjenjang: baris antrean sudah difilter `isActionableRow` (utils/approvalQueue.js),
// yaitu hanya yang gilirannya tiba menurut backend. Komponen ini tidak menentukan urutan.
//
// Contoh pemakaian:
// <PendingQueueSection user={user} leaveData={pending} onRequestAction={fn} onOpenLeaveDetail={fn}
//   overtime={overtime} overtimeRows={rows} corrections={corrections} correctionRows={rows}
//   onOpenOvertimeDetail={fn} />
import React, { useMemo, useState } from 'react';
import ApproveSection from './ApproveSection';
import ApprovalTable from '../../../../components/ApprovalTable';
import Toast from '../../../../components/Toast';
import './PendingQueueSection.css';

const QUEUE = { LEAVE: 'cuti', OVERTIME: 'lembur', CORRECTION: 'koreksi' };

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
}) {
  const [activeQueue, setActiveQueue] = useState(QUEUE.LEAVE);

  // Pilihan jenis hanya tampil kalau role punya lebih dari satu antrean.
  const queues = useMemo(
    () => [
      { key: QUEUE.LEAVE, label: 'Cuti', count: leaveData.length },
      ...(overtime ? [{ key: QUEUE.OVERTIME, label: 'Lembur', count: overtimeRows.length }] : []),
      ...(corrections ? [{ key: QUEUE.CORRECTION, label: 'Koreksi Absensi', count: correctionRows.length }] : []),
    ],
    [leaveData.length, overtime, overtimeRows.length, corrections, correctionRows.length],
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
            onDecision={overtime.handleDecision}
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
            onDecision={corrections.handleDecision}
            detailTitle="Detail Koreksi Absensi"
          />
          <Toast show={!!corrections.toast} message={corrections.toast?.message} type={corrections.toast?.type} />
        </div>
      )}
    </div>
  );
}
