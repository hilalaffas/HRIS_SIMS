import React, { useEffect, useState } from 'react';
import './LeaveHeadcountChart.css';

// [BARU] Chart ringkas "Karyawan Cuti" untuk tab Ringkasan Cuti: satu batang per hari/minggu/bulan
// (lihat utils/leaveHeadcount.js). Batang tumbuh dari bawah dengan jeda bertahap; angka total
// menghitung naik. Animasi diulang setiap rentang berubah (prop `animateKey`) dan dimatikan
// bila perangkat meminta gerak minimal (prefers-reduced-motion).

const GRANULARITY_LABEL = { day: 'per hari', week: 'per minggu', month: 'per bulan' };
const BAR_AREA_HEIGHT = 64; // px, tinggi area batang

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useCountUp(target, duration = 650) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame;
    let startTime;
    const tick = (timestamp) => {
      if (startTime === undefined) startTime = timestamp;
      const progress = prefersReducedMotion() ? 1 : Math.min(1, (timestamp - startTime) / duration);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function LeaveHeadcountChart({ headcount, rangeLabel, totalEmployees, isLoading, animateKey }) {
  const total = useCountUp(headcount?.total ?? 0);

  if (isLoading) {
    return <div className="leaveChart leaveChart--empty">Memuat data cuti...</div>;
  }
  if (!headcount) {
    return <div className="leaveChart leaveChart--empty">Data cuti tidak tersedia.</div>;
  }

  const { buckets, granularity, peak } = headcount;
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const showValues = buckets.length <= 12;
  const labelStep = buckets.length <= 12 ? 1 : Math.ceil(buckets.length / 10);

  return (
    <div className="leaveChart" key={animateKey}>
      <div className="leaveChart__summary">
        <div className="leaveChart__total" aria-live="polite">{total}</div>
        <div className="leaveChart__totalLabel">karyawan cuti</div>
        <div className="leaveChart__meta">
          dari {totalEmployees} karyawan
          {peak.count > 0 && <> &middot; puncak {peak.count} ({peak.title})</>}
        </div>
      </div>

      <div className="leaveChart__plot">
        <div className="leaveChart__caption">
          <span>{rangeLabel}</span>
          <span>{GRANULARITY_LABEL[granularity]}</span>
        </div>
        <div
          className="leaveChart__bars"
          style={{ height: BAR_AREA_HEIGHT }}
          role="img"
          aria-label={`Jumlah karyawan cuti ${GRANULARITY_LABEL[granularity]}, ${rangeLabel}. Total ${headcount.total} karyawan.`}
        >
          {buckets.map((bucket, index) => (
            <div className="leaveChart__col" key={bucket.key} title={`${bucket.title}: ${bucket.count} karyawan cuti`}>
              {showValues && bucket.count > 0 && <span className="leaveChart__value">{bucket.count}</span>}
              <span
                className={`leaveChart__bar${bucket.count === 0 ? ' is-zero' : ''}`}
                style={{
                  height: `${bucket.count === 0 ? 3 : Math.max(8, (bucket.count / maxCount) * 100)}%`,
                  animationDelay: `${Math.min(index * 22, 600)}ms`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="leaveChart__axis" aria-hidden="true">
          {buckets.map((bucket, index) => (
            <span className="leaveChart__tick" key={bucket.key}>{index % labelStep === 0 ? bucket.label : ''}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LeaveHeadcountChart;
