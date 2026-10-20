// src/pages/PersetujuanIzin/components/ApprovalStatCards.jsx
//
// [BARU] Empat kartu ringkasan di atas panel: Menunggu, Surat Sakit,
// Izin Lainnya, Diproses Bulan Ini. Murni tampilan (angka dari hook).
import React from 'react';
import { CircleCheck, FilePlus2, Hourglass, UserRoundPen } from 'lucide-react';
import './ApprovalStatCards.css';

const buildCards = (stats) => [
  { key: 'pending', tone: 'amber', icon: Hourglass, label: 'Menunggu', value: stats.pending, unit: 'pengajuan' },
  { key: 'sick', tone: 'blue', icon: FilePlus2, label: 'Surat Sakit', value: stats.sick, unit: 'menunggu' },
  { key: 'other', tone: 'purple', icon: UserRoundPen, label: 'Izin Lainnya', value: stats.other, unit: 'menunggu' },
  { key: 'done', tone: 'green', icon: CircleCheck, label: 'Diproses Bulan Ini', value: stats.processedThisMonth, unit: 'selesai' },
];

function ApprovalStatCards({ stats }) {
  return (
    <section className="pzn-stats" aria-label="Ringkasan pengajuan">
      {buildCards(stats).map(({ key, tone, icon: Icon, label, value, unit }, index) => (
        <article key={key} className="pzn-stat" style={{ '--pzn-i': index }}>
          <span className={`pzn-stat__icon pzn-stat__icon--${tone}`} aria-hidden="true">
            <Icon />
          </span>
          <div className="pzn-stat__body">
            <span className="pzn-stat__label">{label}</span>
            <span className="pzn-stat__value">
              <strong>{value}</strong>
              <span>{unit}</span>
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}

export default React.memo(ApprovalStatCards);
