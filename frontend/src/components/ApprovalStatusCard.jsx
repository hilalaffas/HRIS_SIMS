// src/components/ApprovalStatusCard.jsx
//
// [BARU] Kartu alur persetujuan generik (sebelumnya OvertimeStatusCard.jsx yang
// khusus lembur). Satu tampilan untuk semua pengajuan yang butuh ACC
// Leader/SPV/Manager: lembur, cuti, dan izin sakit. Komponen ini murni
// presentasi -- data per jenis pengajuan disiapkan adapter masing-masing
// (lihat pages/Pengajuan/utils/approvalCardModels.js).
//
// Bentuk `model`:
// {
//   tone: 'warning' | 'success' | 'danger' | 'info' | 'muted',
//   eyebrow: 'Pengajuan Lembur Terbaru',
//   title: '20 Okt 2026',
//   sentLabel: 'Dikirim 20 Okt 2026, 10:34 WIB',   // opsional
//   badgeLabel: 'Ditolak',
//   stats: [{ label: 'Mulai', value: '14:33' }, { label: 'Total', value: '8 Jam', emphasis: true }],
//   note: { label: 'Pekerjaan', text: 'Closing laporan' },   // opsional
//   steps: [{ key: 'submitted', label: 'Diajukan', state: 'done' }],
//   hint: 'Pengajuan ditolak oleh Leader.',
//   cancellable: false,
// }
// state langkah: 'done' | 'current' | 'rejected' | 'returned' | 'cancelled' | 'upcoming'
//
// variant: 'default' (halaman Lembur) | 'compact' (halaman Pengajuan: metrik & alur
// satu baris, teks pekerjaan diringkas 50 karakter + tooltip teks lengkap).
//
// Contoh pemakaian:
// <ApprovalStatusCard model={model} variant="compact" onClose={fn} onCancel={fn} />
import React from 'react';
import './ApprovalStatusCard.css';

function StepIcon({ state, index }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (state === 'done') {
    return (
      <svg {...common}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  }
  if (state === 'current') {
    return (
      <svg {...common} strokeWidth={2.4}>
        <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />
      </svg>
    );
  }
  if (state === 'rejected') {
    return (
      <svg {...common}>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  if (state === 'returned') {
    // panah "kembali" untuk pengajuan yang dikembalikan ke pemohon
    return (
      <svg {...common} strokeWidth={2.6}>
        <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />
      </svg>
    );
  }
  if (state === 'cancelled') {
    return (
      <svg {...common}>
        <path d="M6 12h12" />
      </svg>
    );
  }
  return <span className="approvalStep__number">{index + 1}</span>;
}

// Ringkas teks panjang untuk varian compact; teks lengkap tetap ada di atribut title.
const NOTE_PREVIEW_LENGTH = 50;
const truncateNote = (text) => (
  text && text.length > NOTE_PREVIEW_LENGTH ? `${text.slice(0, NOTE_PREVIEW_LENGTH).trimEnd()}...` : text
);

function ApprovalStatusCard({ model, variant = 'default', onCancel, onClose }) {
  if (!model) return null;

  const { tone, eyebrow, title, sentLabel, badgeLabel, stats = [], note, steps = [], hint, cancellable } = model;
  const canCancel = Boolean(cancellable) && typeof onCancel === 'function';

  return (
    <section
      className={`approvalCard approvalCard--${tone}${variant === 'compact' ? ' approvalCard--compact' : ''}`}
      aria-label="Detail alur persetujuan"
    >
      <header className="approvalCard__header">
        <div className="approvalCard__title">
          <span className="approvalCard__eyebrow">{eyebrow}</span>
          <strong className="approvalCard__date">{title}</strong>
          {sentLabel && <span className="approvalCard__sent">{sentLabel}</span>}
        </div>

        <div className="approvalCard__headerActions">
          <span className={`approvalBadge approvalBadge--${tone}`}>{badgeLabel}</span>
          {typeof onClose === 'function' && (
            <button
              type="button"
              className="approvalCard__close"
              onClick={onClose}
              aria-label="Tutup detail alur"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* __main membungkus metrik + alur: varian compact menyejajarkannya dalam satu baris,
          varian default memakai display: contents sehingga tata letak lama tidak berubah. */}
      <div className="approvalCard__main">
        <div className="approvalCard__body">
          {stats.map((stat) => (
            <dl
              key={stat.label}
              className={`approvalCard__stat${stat.emphasis ? ' approvalCard__stat--total' : ''}`}
            >
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </dl>
          ))}
          {note && (
            <p className="approvalCard__job" title={note.text}>
              <strong>{note.label}:</strong>&nbsp;
              <span>{variant === 'compact' ? truncateNote(note.text) : note.text}</span>
            </p>
          )}
        </div>

        <ol
          className="approvalTimeline"
          style={{ gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, 1fr)` }}
        >
          {steps.map((step, index) => (
            <li
              key={step.key}
              className={`approvalStep approvalStep--${step.state}`}
              style={{ '--stepIndex': index }}
            >
              {index > 0 && <span className="approvalStep__line" aria-hidden="true" />}
              <span className="approvalStep__node">
                <StepIcon state={step.state} index={index} />
              </span>
              <span className="approvalStep__label">{step.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <footer className="approvalCard__footer">
        <span className="approvalCard__hint">
          <span className="approvalCard__hintDot" aria-hidden="true">
            i
          </span>
          {hint}
        </span>

        {canCancel && (
          <button type="button" className="approvalCard__cancel" onClick={onCancel}>
            Batalkan
          </button>
        )}
      </footer>
    </section>
  );
}

export default ApprovalStatusCard;
