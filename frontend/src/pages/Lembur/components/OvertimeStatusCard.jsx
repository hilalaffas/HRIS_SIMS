import { buildTimeline, getStatusMeta } from '../constants/overtimeFlow';
import './OvertimeStatusCard.css';

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
  if (state === 'cancelled') {
    return (
      <svg {...common}>
        <path d="M6 12h12" />
      </svg>
    );
  }
  return <span className="overtimeStep__number">{index + 1}</span>;
}

function OvertimeStatusCard({ request, onCancel, onClose }) {
  const statusMeta = getStatusMeta(request);
  const timeline = buildTimeline(request);
  const canCancel = request.status === 'pending';

  return (
    <section
      className={`overtimeCard overtimeCard--${statusMeta.tone}`}
      aria-label="Detail alur persetujuan lembur"
    >
      <header className="overtimeCard__header">
        <div className="overtimeCard__title">
          <span className="overtimeCard__eyebrow">Pengajuan Lembur</span>
          <strong className="overtimeCard__date">{request.dateLabel}</strong>
          {request.submittedAtLabel && (
            <span className="overtimeCard__sent">
              Dikirim {request.submittedAtLabel}
            </span>
          )}
        </div>

        <div className="overtimeCard__headerActions">
          <span className={`overtimeBadge overtimeBadge--${statusMeta.tone}`}>
            {statusMeta.label}
          </span>
          <button
            type="button"
            className="overtimeCard__close"
            onClick={onClose}
            aria-label="Tutup detail alur"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="overtimeCard__body">
        <dl className="overtimeCard__stat">
          <dt>Mulai</dt>
          <dd>{request.startTime}</dd>
        </dl>
        <dl className="overtimeCard__stat">
          <dt>Selesai</dt>
          <dd>{request.endTime}</dd>
        </dl>
        <dl className="overtimeCard__stat overtimeCard__stat--total">
          <dt>Total</dt>
          <dd>{request.totalHours} Jam</dd>
        </dl>
        <p className="overtimeCard__job">
          <strong>Pekerjaan:</strong> {request.reason}
        </p>
      </div>

      <ol className="overtimeTimeline">
        {timeline.map((step) => (
          <li
            key={step.key}
            className={`overtimeStep overtimeStep--${step.state}`}
            style={{ '--stepIndex': step.index }}
          >
            {step.index > 0 && (
              <span className="overtimeStep__line" aria-hidden="true" />
            )}
            <span className="overtimeStep__node">
              <StepIcon state={step.state} index={step.index} />
            </span>
            <span className="overtimeStep__label">{step.label}</span>
          </li>
        ))}
      </ol>

      <footer className="overtimeCard__footer">
        <span className="overtimeCard__hint">
          <span className="overtimeCard__hintDot" aria-hidden="true">
            i
          </span>
          {statusMeta.hint}
        </span>

        {canCancel && (
          <button
            type="button"
            className="overtimeCard__cancel"
            onClick={() => onCancel(request)}
          >
            Batalkan
          </button>
        )}
      </footer>
    </section>
  );
}

export default OvertimeStatusCard;