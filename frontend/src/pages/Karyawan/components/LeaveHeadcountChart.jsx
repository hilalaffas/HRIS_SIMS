import React, { useEffect, useState } from 'react';
import './LeaveHeadcountChart.css';
import Skeleton from '../../../components/Skeleton'; // [BARU] loading skeleton
import SkeletonGroup from '../../../components/SkeletonGroup'; // [BARU]

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

// [BARU] Skeleton grafik: kotak, ukuran & tinggi area batang sama dengan grafik asli (tanpa layout shift).
const SKELETON_BAR_HEIGHTS = [38, 62, 48, 82, 56, 72, 42, 90, 52, 66, 34, 76];
function LeaveChartSkeleton() {
  return (
    <SkeletonGroup label="Memuat data cuti..." radius={10}>
      <div className="leaveChart">
        <div className="leaveChart__summary">
          <Skeleton width={56} height={30} style={{ marginBottom: 8 }} />
          <Skeleton width={92} height={13} style={{ marginBottom: 8 }} />
          <Skeleton width="80%" height={11} />
        </div>
        <div className="leaveChart__plot">
          <div className="leaveChart__caption">
            <Skeleton width={150} height={11} />
            <Skeleton width={60} height={11} />
          </div>
          <div className="leaveChart__bars" style={{ height: BAR_AREA_HEIGHT }}>
            {SKELETON_BAR_HEIGHTS.map((height, index) => (
              <div className="leaveChart__col" key={index}>
                <Skeleton variant="block" style={{ height: `${height}%`, maxWidth: 28, borderRadius: '3px 3px 0 0' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonGroup>
  );
}

function LeaveHeadcountChart({ headcount, rangeLabel, totalEmployees, isLoading, animateKey }) {
  const total = useCountUp(headcount?.total ?? 0);

  if (isLoading) {
    return <LeaveChartSkeleton />; // [UBAH] sebelumnya teks "Memuat data cuti..."
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
