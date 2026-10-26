// src/pages/Pengajuan/components/PengajuanTypeCards.jsx
//
// Empat kartu jenis pengajuan di bagian atas halaman Pengajuan. Klik kartu
// membuka popup yang sesuai (ditangani parent lewat `onSelect(typeKey)`).
// Kartu "Tukar Shift" hanya muncul untuk divisi bertipe SHIFTING dan masih
// membuka popup dengan tampilan sementara (backend tukar shift belum ada).
//
// Contoh pemakaian:
// <PengajuanTypeCards showShiftSwap={isShifting} onSelect={(typeKey) => ...} />
import React from 'react';
import { ArrowLeftRight, BriefcaseBusiness, ClipboardPlus, PlaneTakeoff } from 'lucide-react';
import { TYPE_KEY } from '../utils/pengajuanItems';
import './PengajuanTypeCards.css';

const TYPE_CARDS = [
  { key: TYPE_KEY.LEAVE, title: 'Cuti Karyawan', description: 'Ajukan cuti tahunan/khusus', icon: PlaneTakeoff, tone: 'green' },
  { key: TYPE_KEY.PERMISSION, title: 'Sakit & Izin', description: 'Lapor sakit/terlambat', icon: ClipboardPlus, tone: 'blue' },
  { key: TYPE_KEY.OVERTIME, title: 'Lembur', description: 'Pengajuan over-time', icon: BriefcaseBusiness, tone: 'amber' },
  { key: TYPE_KEY.SHIFT_SWAP, title: 'Tukar Shift', description: 'Tukar jadwal dengan rekan', icon: ArrowLeftRight, tone: 'purple', shiftOnly: true },
];

export default function PengajuanTypeCards({ showShiftSwap = false, onSelect }) {
  const cards = TYPE_CARDS.filter((card) => !card.shiftOnly || showShiftSwap);

  return (
    <section className="pgj-type-grid" aria-label="Pilih jenis pengajuan">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <button
            key={card.key}
            type="button"
            className={`pgj-type-card pgj-type-card--${card.tone}`}
            style={{ '--cardIndex': index }}
            onClick={() => onSelect(card.key)}
          >
            <span className="pgj-type-icon">
              <Icon aria-hidden="true" />
            </span>
            <span className="pgj-type-text">
              <strong className="pgj-type-title">{card.title}</strong>
              <span className="pgj-type-desc">{card.description}</span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
