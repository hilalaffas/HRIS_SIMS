// src/pages/PersetujuanIzin/components/RequestListItem.jsx
//
// [BARU] Satu baris pengajuan di daftar kiri: avatar, nama, divisi, chip jenis,
// periode + lama (hari), dan chip "Lampiran" bila ada surat/bukti.
import React from 'react';
import { CalendarDays, Clock3, FilePlus2, Paperclip, UserRoundPen } from 'lucide-react';
import { formatPeriod, formatSubmittedAt } from '../utils/permissionRequest';
import './RequestListItem.css';

const TYPE_ICON = { sick: FilePlus2, late: Clock3, personal: UserRoundPen };

function RequestListItem({ row, selected, leaving, index, onSelect }) {
  const TypeIcon = TYPE_ICON[row.typeTone] || FilePlus2;

  return (
    <li className={`pzn-item-wrap${leaving ? ' is-leaving' : ''}`}>
      <div className="pzn-item-wrap__inner">
        <button
          type="button"
          className={`pzn-item${selected ? ' is-selected' : ''}`}
          style={{ '--pzn-i': Math.min(index, 8) }}
          aria-current={selected ? 'true' : undefined}
          onClick={() => onSelect(row.id)}
        >
          <span className={`pzn-avatar avatar-tone-${row.avatarTone}`} aria-hidden="true">{row.initials}</span>

          <span className="pzn-item__main">
            <span className="pzn-item__top">
              <strong className="pzn-item__name">{row.employeeName}</strong>
              <time className="pzn-item__time">{formatSubmittedAt(row.submittedAt)}</time>
            </span>
            <span className="pzn-item__division">{row.division}</span>
            <span className="pzn-item__chips">
              <span className={`pzn-chip pzn-chip--${row.typeTone}`}>
                <TypeIcon aria-hidden="true" />
                {row.typeLabel}
              </span>
              <span className="pzn-chip pzn-chip--date">
                <CalendarDays aria-hidden="true" />
                {formatPeriod(row.startDate, row.endDate)} · {row.workDays} hari
              </span>
              {row.attachment && (
                <span className="pzn-chip pzn-chip--file">
                  <Paperclip aria-hidden="true" />
                  Lampiran
                </span>
              )}
            </span>
          </span>
        </button>
      </div>
    </li>
  );
}

export default React.memo(RequestListItem);
