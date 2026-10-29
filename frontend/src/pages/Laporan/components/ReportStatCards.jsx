// src/pages/Laporan/components/ReportStatCards.jsx
//
// [BARU] Empat kartu ringkasan di atas tabel laporan (total karyawan, total
// hari hadir, total keterlambatan, total alpha) untuk cakupan yang dipilih.
//
// Contoh pemakaian:
// <ReportStatCards totals={summarizeAll(reports)} isLoading={isLoading} />
import React from 'react';
import { AlarmClock, UserCheck, UserX, Users } from 'lucide-react';
import Skeleton from '../../../components/Skeleton';
import './ReportStatCards.css';

const CARDS = [
  { key: 'employees', label: 'Total Karyawan', icon: Users, tone: 'blue' },
  { key: 'present', label: 'Total Hari Hadir', icon: UserCheck, tone: 'green' },
  { key: 'late', label: 'Total Terlambat', icon: AlarmClock, tone: 'orange' },
  { key: 'absent', label: 'Total Alpha', icon: UserX, tone: 'red' },
];

const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(value);

export default function ReportStatCards({ totals, isLoading }) {
  return (
    <div className="lpr-stat-grid">
      {CARDS.map(({ key, label, icon: Icon, tone }, index) => (
        <article
          key={key}
          className={`lpr-stat-card lpr-stat-card--${tone}`}
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <span className="lpr-stat-icon" aria-hidden="true"><Icon /></span>
          <div>
            <p className="lpr-stat-label">{label}</p>
            {isLoading
              ? <Skeleton width={56} height={22} />
              : <p className="lpr-stat-value">{formatNumber(totals[key])}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
