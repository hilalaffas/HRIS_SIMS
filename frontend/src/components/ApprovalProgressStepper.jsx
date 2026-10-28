// src/components/ApprovalProgressStepper.jsx
//
// [BARU] Stepper progres persetujuan berjenjang (Leader -> SPV -> Manager, dst.) untuk popup detail.
// Menjawab satu pertanyaan sekilas: "persetujuan sudah sampai mana?" -- chip ringkasan di atas
// ("Menunggu SPV", "Tahap 2 dari 3"), progress bar segmen, lalu node tiap tahap dengan garis
// penghubung beranimasi (centang = ACC, jam pasir berdenyut = sedang ditinjau, abu putus-putus =
// belum giliran, silang = ditolak). Semua animasi mati bila pengguna memilih reduced motion.
//
// Data per tahap disiapkan pemanggil (lihat utils/approvalProgress.js):
//   { key, label, name?, caption?, state }
//   state: 'done' | 'current' | 'upcoming' | 'rejected' | 'returned' | 'cancelled'
//
// Contoh pemakaian:
// <ApprovalProgressStepper steps={buildLeaveProgressSteps(detailData)} />
import React, { useMemo } from 'react';
import { Ban, Check, CircleCheck, CircleX, Hourglass, RotateCcw, X } from 'lucide-react';
import './ApprovalProgressStepper.css';

const NODE_ICON = { done: Check, current: Hourglass, rejected: X, returned: RotateCcw, cancelled: Ban };
const STOP_STATES = ['rejected', 'returned', 'cancelled'];

// Ringkasan keseluruhan dari daftar tahap: warna chip, teks utama, dan teks tahap.
function summarizeSteps(steps) {
  const total = steps.length;
  const stopIndex = steps.findIndex((step) => STOP_STATES.includes(step.state));
  if (stopIndex >= 0) {
    const stop = steps[stopIndex];
    const progress = `Berhenti di tahap ${stopIndex + 1} dari ${total}`;
    if (stop.state === 'rejected') return { tone: 'danger', Icon: CircleX, label: `Ditolak oleh ${stop.label}`, progress };
    if (stop.state === 'returned') return { tone: 'info', Icon: RotateCcw, label: `Dikembalikan oleh ${stop.label}`, progress };
    return { tone: 'muted', Icon: Ban, label: 'Dibatalkan', progress };
  }
  const currentIndex = steps.findIndex((step) => step.state === 'current');
  if (currentIndex >= 0) {
    return {
      tone: 'warning',
      Icon: Hourglass,
      label: `Menunggu ${steps[currentIndex].label}`,
      progress: `Tahap ${currentIndex + 1} dari ${total}`,
    };
  }
  const isAllDone = steps.every((step) => step.state === 'done');
  return {
    tone: isAllDone ? 'success' : 'warning',
    Icon: isAllDone ? CircleCheck : Hourglass,
    label: isAllDone ? 'Disetujui' : 'Dalam proses',
    progress: isAllDone ? 'Semua tahap selesai' : `${total} tahap`,
  };
}

export default function ApprovalProgressStepper({ steps }) {
  const summary = useMemo(() => summarizeSteps(steps), [steps]);
  if (!steps || steps.length === 0) return null;
  const SummaryIcon = summary.Icon;

  return (
    <div className="aps" role="group" aria-label="Progres persetujuan berjenjang">
      <div className="aps__top">
        <span className={`aps__chip aps__chip--${summary.tone}`} aria-live="polite">
          <SummaryIcon aria-hidden="true" />
          {summary.label}
        </span>
        <span className="aps__count">{summary.progress}</span>
      </div>

      <div className="aps__bar" aria-hidden="true">
        {steps.map((step) => <i key={step.key} className={`aps__seg aps__seg--${step.state}`} />)}
      </div>

      <ol className="aps__grid" style={{ '--aps-cols': steps.length }}>
        {steps.map((step, index) => {
          const NodeIcon = NODE_ICON[step.state];
          const next = steps[index + 1];
          // Garis ke tahap berikutnya: terisi hijau bila tahap ini ACC; bergerak (putus-putus + titik)
          // bila tahap berikutnya sedang ditinjau.
          let railState = '';
          if (step.state === 'done') railState = next?.state === 'current' ? 'go' : 'on';
          return (
            <li
              key={step.key}
              className={`aps__item aps__item--${step.state}`}
              style={{ '--i': index }}
              aria-current={step.state === 'current' ? 'step' : undefined}
            >
              <span className="aps__node">
                {NodeIcon ? <NodeIcon aria-hidden="true" /> : index + 1}
              </span>
              {next && (
                <span className={`aps__rail${railState ? ` aps__rail--${railState}` : ''}`} aria-hidden="true">
                  <b />
                  <u />
                </span>
              )}
              <span className="aps__role">{step.label}</span>
              {step.name && <span className="aps__name" title={step.name}>{step.name}</span>}
              {step.caption && <span className="aps__caption">{step.caption}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
