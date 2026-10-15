// src/pages/Absensi/components/CheckoutOvertimePanels.jsx
//
// [BARU] Dua isi kartu CheckoutOvertimeModal:
//   CheckoutChoicePanel     -- popup "Check-Out Jam Kerja (17:00+)": Tidak Lembur / Ya, Saya Lembur.
//                              Setelah ada lembur tercatat hari ini, teks & tombolnya berubah menjadi
//                              Check-Out Sekarang / Tambah Lembur (inilah "loop"-nya).
//   OvertimeExtensionPanel  -- form Tambah Lembur: jam mulai TERKUNCI (lanjutan lembur terakhir),
//                              karyawan hanya memilih jam selesai (<= jam sekarang) + pekerjaannya.
// Hanya tampilan & validasi UX; aturan sebenarnya di backend (OvertimeService.submitExtension()).
import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, History, Loader2, Lock, PlusCircle } from 'lucide-react';
import { formatOvertimeDuration, getOvertimeStatus } from '../../../services/overtimeService';
import {
  EXTENSION_REASON_MAX_LENGTH,
  WORK_END_LABEL,
  clockToMinutes,
  minutesToClock,
} from '../utils/overtimeCheckout';

/* ======================= Langkah 1: pilihan ======================= */

function EntryList({ entries }) {
  return (
    <ul className="coOt__entries" aria-label="Lembur tercatat hari ini">
      {entries.map((entry, index) => {
        const status = getOvertimeStatus(entry.statusCode);
        return (
          <li key={entry.id} className="coOt__entry" style={{ '--i': index }}>
            <span className="coOt__entryTime">{entry.startTime} - {entry.endTime}</span>
            <span className="coOt__entryDuration">{entry.duration}</span>
            <span className={`coOt__entryStatus coOt__entryStatus--${status.tone}`}>{status.shortLabel}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function CheckoutChoicePanel({ windowState, onCheckout, onAddOvertime, onRetry, onClose }) {
  const { status, data, error } = windowState;
  const isLoading = status === 'loading' || status === 'idle';
  const isError = status === 'error';
  const isReady = status === 'ready';
  const entries = data?.entries ?? [];
  const hasOvertime = entries.length > 0;
  const addBlocked = isReady && !data.canExtend;

  // Fokus ke tombol pilihan utama begitu data siap (bisa diakses keyboard).
  const addButtonRef = useRef(null);
  useEffect(() => {
    if (isReady && data.canExtend) addButtonRef.current?.focus();
  }, [isReady, data?.canExtend]);

  let bodyText;
  if (hasOvertime) {
    bodyText = `Lembur Anda hari ini tercatat sampai pukul ${data.start} WIB. Apakah Anda masih lembur setelah itu, atau sudah selesai dan ingin Check-Out sekarang?`;
  } else {
    bodyText = `Anda melakukan Check-Out setelah jam kerja ${WORK_END_LABEL} WIB. Apakah Anda melakukan lembur hari ini?`;
  }

  let checkoutLabel = 'Check-Out Sekarang';
  if (isReady) checkoutLabel = hasOvertime ? 'Selesai, Check-Out Sekarang' : 'Tidak Lembur (Check Out Normal)';

  let addLabel = hasOvertime ? 'Ya, Tambah Lembur (Isi Form)' : 'Ya, Saya Lembur (Isi Form)';
  if (isError) addLabel = 'Coba Lagi';

  return (
    <>
      <header className="coOt__header">
        <span className="coOt__icon" aria-hidden="true"><History size={22} strokeWidth={2.4} /></span>
        <div>
          <h2 id="coOtTitle">Check-Out Jam Kerja ({WORK_END_LABEL}+)</h2>
          <p>Konfirmasi status kerja tambahan hari ini.</p>
        </div>
      </header>

      <div className="coOt__body">
        {isLoading && (
          <p className="coOt__loading" role="status">
            <Loader2 className="coOt__spinner" size={16} aria-hidden="true" />
            Memeriksa data lembur hari ini...
          </p>
        )}

        {isError && (
          <p className="coOt__alert" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error} Anda tetap bisa Check-Out sekarang.</span>
          </p>
        )}

        {isReady && (
          <>
            <p className="coOt__text">{bodyText}</p>
            {hasOvertime && <EntryList entries={entries} />}
            {addBlocked && (
              <p className="coOt__hint">
                {hasOvertime
                  ? `Belum ada waktu setelah ${data.start} WIB yang bisa diajukan sebagai lembur tambahan.`
                  : `Belum ada waktu setelah ${WORK_END_LABEL} WIB yang bisa diajukan sebagai lembur.`}
              </p>
            )}
          </>
        )}
      </div>

      <footer className="coOt__choices">
        <button type="button" className="coOt__btn coOt__btn--secondary" onClick={onCheckout}>
          {checkoutLabel}
        </button>
        <button
          ref={addButtonRef}
          type="button"
          className="coOt__btn coOt__btn--primary"
          disabled={isLoading || addBlocked}
          onClick={isError ? onRetry : onAddOvertime}
        >
          {addLabel}
        </button>
      </footer>

      <button type="button" className="coOt__dismiss" onClick={onClose}>
        Batal, kembali ke halaman
      </button>
    </>
  );
}

/* ======================= Langkah 2: form Tambah Lembur ======================= */

// Pintasan jam selesai: menit dari jam mulai.
const QUICK_ADDS = [
  { label: '+30 mnt', minutes: 30 },
  { label: '+1 jam', minutes: 60 },
];

export function OvertimeExtensionPanel({ data, submitting, onBack, onSubmit }) {
  const startMinutes = clockToMinutes(data.start);
  const maxMinutes = clockToMinutes(data.maxEnd);

  const [endTime, setEndTime] = useState(data.maxEnd);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTick, setErrorTick] = useState(0); // key -> animasi getar diputar ulang tiap error
  const endInputRef = useRef(null);

  useEffect(() => {
    endInputRef.current?.focus();
  }, []);

  const endMinutes = clockToMinutes(endTime);
  const totalMinutes = endMinutes != null ? endMinutes - startMinutes : null;
  const hasValidRange = totalMinutes != null && totalMinutes > 0 && endMinutes <= maxMinutes;
  const continuesPrevious = data.entries.length > 0;

  const showError = (message) => {
    setErrorMessage(message);
    setErrorTick((tick) => tick + 1);
  };

  const validate = () => {
    if (endMinutes == null) return 'Jam selesai wajib diisi.';
    if (endMinutes <= startMinutes) return `Jam selesai harus lebih besar dari jam mulai (${data.start}).`;
    if (endMinutes > maxMinutes) return `Jam selesai tidak boleh melebihi jam sekarang (${data.maxEnd}).`;
    if (!reason.trim()) return 'Alasan / pekerjaan lembur wajib diisi.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const message = validate();
    if (message) {
      showError(message);
      return;
    }
    try {
      await onSubmit({ endTime, reason: reason.trim() });
    } catch (error) {
      showError(error?.message || 'Gagal mengirim lembur tambahan.');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <header className="coOt__header">
        <span className="coOt__icon" aria-hidden="true"><PlusCircle size={22} strokeWidth={2.4} /></span>
        <div>
          <h2 id="coOtTitle">Tambah Lembur</h2>
          <p>Isi jam selesai & pekerjaan lembur tambahan Anda.</p>
        </div>
      </header>

      <div className="coOt__body coOt__form">
        <div className="coOt__timeRow">
          <div className="coOt__field">
            <span className="coOt__label">Jam Mulai</span>
            <div className="coOt__locked" title="Jam mulai otomatis, tidak dapat diubah">
              <Lock size={13} aria-hidden="true" />
              <strong>{data.start}</strong>
            </div>
          </div>
          <div className="coOt__field">
            <label className="coOt__label" htmlFor="coOtEnd">Jam Selesai</label>
            <input
              id="coOtEnd"
              ref={endInputRef}
              className="coOt__input"
              type="time"
              step={60}
              min={data.start}
              max={data.maxEnd}
              value={endTime}
              onChange={(event) => {
                setEndTime(event.target.value);
                setErrorMessage('');
              }}
            />
          </div>
        </div>

        <p className="coOt__rangeNote">
          {continuesPrevious
            ? `Jam mulai dilanjutkan dari lembur terakhir (${data.start} WIB).`
            : `Jam mulai dihitung dari akhir jam kerja (${data.start} WIB).`}
          {' '}Jam selesai maksimal jam sekarang ({data.maxEnd} WIB).
        </p>

        <div className="coOt__quick" role="group" aria-label="Pintasan jam selesai">
          {QUICK_ADDS.map(({ label, minutes }) => (
            <button
              key={label}
              type="button"
              className="coOt__chip"
              disabled={startMinutes + minutes > maxMinutes}
              onClick={() => {
                setEndTime(minutesToClock(startMinutes + minutes));
                setErrorMessage('');
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="coOt__chip"
            onClick={() => {
              setEndTime(data.maxEnd);
              setErrorMessage('');
            }}
          >
            Sekarang
          </button>
        </div>

        <p className="coOt__total">
          Total lembur tambahan:{' '}
          <strong key={hasValidRange ? totalMinutes : 'none'}>
            {hasValidRange ? formatOvertimeDuration(totalMinutes) : '-'}
          </strong>
        </p>

        <label className="coOt__label" htmlFor="coOtReason">Alasan / Pekerjaan Lembur</label>
        <textarea
          id="coOtReason"
          className="coOt__textarea"
          rows={3}
          maxLength={EXTENSION_REASON_MAX_LENGTH}
          placeholder="Contoh: Menyelesaikan deploy & monitoring server"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setErrorMessage('');
          }}
        />

        {errorMessage && (
          <p key={errorTick} className="coOt__error" role="alert">{errorMessage}</p>
        )}
      </div>

      <footer className="coOt__choices">
        <button type="button" className="coOt__btn coOt__btn--secondary" onClick={onBack} disabled={submitting}>
          Kembali
        </button>
        <button type="submit" className="coOt__btn coOt__btn--primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="coOt__spinner" size={15} aria-hidden="true" />
              Mengirim...
            </>
          ) : (
            'Simpan & Lanjut'
          )}
        </button>
      </footer>
    </form>
  );
}
