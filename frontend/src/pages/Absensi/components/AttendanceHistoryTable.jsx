// src/pages/Absensi/components/AttendanceHistoryTable.jsx
//
// [UBAH] Restrukturisasi total dari tabel per-event (1 baris = 1 kali
// Masuk ATAU Keluar) menjadi tabel PER HARI (1 baris = ringkasan 1 hari
// kerja): Tanggal, Jam In, Jam Out, Durasi kerja, Status (Hadir/Telat/
// Cuti/Absen), Lokasi (link Google Maps), Lembur. Kolom Lokasi & Foto
// sekarang berupa link (Peta / Selfie), bukan teks/thumbnail statis.
//
// Sekarang juga menampilkan hari kerja (Senin-Jumat) TANPA catatan
// sebagai status "Absen" (alpha) -- bukan cuma menyembunyikannya --
// supaya rekap kehadiran terlihat utuh. Cakupan: WORKDAYS_WINDOW hari
// terakhir, tidak termasuk hari ini (hari berjalan belum bisa dinilai
// "Absen" karena masih bisa check-in nanti).
//
// [CATATAN PENGEMBANGAN] Status "Cuti" saat ini hanya diisi dari
// pengajuan Sakit/Izin lewat halaman Absensi ini sendiri. Kalau modul
// Absensi nanti benar-benar dihubungkan ke modul Cuti (leave_requests),
// baris "Cuti" semestinya juga memasukkan cuti yang disetujui di sana --
// lihat groupRecordsByDay() di bawah, cukup tambahkan sumber data lain
// ke `byDate` sebelum di-render, tidak perlu ubah struktur tabel.
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Image as ImageIcon, MapPin } from 'lucide-react';
import { formatDateLabel, formatDurationMinutes, formatTimeLabel } from '../../../services/attendanceService';
import './AttendanceHistoryTable.css';

const COLLAPSED_ROW_COUNT = 3;
const ROWS_PER_PAGE = 5;
const WORKDAYS_WINDOW_DAYS = 30; // seberapa jauh ke belakang mengisi hari "Absen" otomatis
const OVERTIME_START_MINUTES = 17 * 60; // lembur dihitung mulai lewat jam 17:00

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// [BARU] Gabungkan daftar event (records mentah dari backend, sudah lewat
// toDisplayRecord) jadi satu baris ringkasan per tanggal, lalu isi hari
// kerja yang tidak punya catatan sama sekali sebagai "Absen".
function groupRecordsByDay(records) {
  const byDate = new Map();

  records.forEach((record) => {
    const key = record.attendanceDate;
    if (!key) return;
    const entry = byDate.get(key) || { date: key, checkIn: null, checkOut: null };
    if (record.actionCode === 'KELUAR') {
      entry.checkOut = record;
    } else if (!entry.checkIn || (record.recordedAt && entry.checkIn.recordedAt && record.recordedAt < entry.checkIn.recordedAt)) {
      // Kalau ada lebih dari satu event Masuk di hari yang sama (seharusnya
      // tidak terjadi -- backend menegakkan 1x/hari), pakai yang paling awal.
      entry.checkIn = record;
    }
    byDate.set(key, entry);
  });

  // Isi hari kerja (Senin-Jumat) dalam jendela WORKDAYS_WINDOW_DAYS yang
  // belum punya catatan sama sekali sebagai "Absen" -- kecuali hari ini.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 1; offset <= WORKDAYS_WINDOW_DAYS; offset += 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    if (isWeekend(day)) continue;
    const key = dateKey(day);
    if (!byDate.has(key)) {
      byDate.set(key, { date: key, checkIn: null, checkOut: null, isAbsent: true });
    }
  }

  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function resolveStatus(day) {
  if (day.checkIn) {
    if (day.checkIn.reasonCode === 'SAKIT' || day.checkIn.reasonCode === 'IZIN') return { label: 'Cuti', tone: 'cuti' };
    if (day.checkIn.isLate) return { label: 'Telat', tone: 'telat' };
    return { label: 'Hadir', tone: 'hadir' };
  }
  if (day.isAbsent) return { label: 'Absen', tone: 'absen' };
  return { label: '-', tone: '' };
}

function resolveDuration(day) {
  if (!day.checkIn?.recordedAt || !day.checkOut?.recordedAt) return null;
  const minutes = (day.checkOut.recordedAt.getTime() - day.checkIn.recordedAt.getTime()) / 60000;
  return formatDurationMinutes(minutes);
}

function resolveOvertime(day) {
  if (!day.checkOut?.recordedAt) return null;
  const minutesOut = minutesSinceMidnight(day.checkOut.recordedAt);
  if (minutesOut <= OVERTIME_START_MINUTES) return null;
  return formatDurationMinutes(minutesOut - OVERTIME_START_MINUTES);
}

function LocationLinks({ day }) {
  const links = [
    day.checkIn?.mapsUrl && { label: 'Masuk', url: day.checkIn.mapsUrl },
    day.checkOut?.mapsUrl && { label: 'Keluar', url: day.checkOut.mapsUrl },
  ].filter(Boolean);

  if (links.length === 0) return <span className="abs-empty-cell">-</span>;
  return (
    <div className="abs-link-stack">
      {links.map((link) => (
        <a key={link.label} className="abs-maps-pin" href={link.url} target="_blank" rel="noreferrer">
          <MapPin aria-hidden="true" />
          Peta {link.label}
        </a>
      ))}
    </div>
  );
}

function PhotoLinks({ day }) {
  const links = [
    day.checkIn?.photoUrl && { label: 'Masuk', url: day.checkIn.photoUrl },
    day.checkOut?.photoUrl && { label: 'Keluar', url: day.checkOut.photoUrl },
  ].filter(Boolean);

  if (links.length === 0) return <span className="abs-empty-cell">-</span>;
  return (
    <div className="abs-link-stack">
      {links.map((link) => (
        <a key={link.label} className="abs-photo-link" href={link.url} target="_blank" rel="noreferrer">
          <ImageIcon aria-hidden="true" />
          Selfie {link.label}
        </a>
      ))}
    </div>
  );
}

export default function AttendanceHistoryTable({ records }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);

  const dailyRows = useMemo(() => groupRecordsByDay(records), [records]);

  const totalPages = Math.max(1, Math.ceil(dailyRows.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);

  const visibleRows = useMemo(() => {
    if (!expanded) return dailyRows.slice(0, COLLAPSED_ROW_COUNT);
    const start = safePage * ROWS_PER_PAGE;
    return dailyRows.slice(start, start + ROWS_PER_PAGE);
  }, [dailyRows, expanded, safePage]);

  const goToPage = (next) => {
    if (next < 0 || next >= totalPages) return;
    setPage(next);
  };

  const toggleExpanded = () => {
    setExpanded((current) => !current);
    setPage(0);
  };

  return (
    <section className="abs-history-section">
      <div className="abs-section-heading">
        <div>
          <h2>Riwayat Absensi</h2>
          <p>Ringkasan kehadiran harian Anda.</p>
        </div>
        <button type="button" className="abs-outline-button" onClick={toggleExpanded}>
          {expanded ? 'Ringkas' : 'Lihat semua'}
          <ChevronDown className={expanded ? 'is-flipped' : ''} aria-hidden="true" />
        </button>
      </div>

      <div className="abs-table-wrap">
        <table>
          <thead>
            <tr>
              <th>TANGGAL</th>
              <th>JAM IN</th>
              <th>JAM OUT</th>
              <th>DURASI KERJA</th>
              <th>STATUS</th>
              <th>LOKASI</th>
              <th>FOTO</th>
              <th>LEMBUR</th>
            </tr>
          </thead>
          {/* [BARU] key={safePage} memaksa remount <tbody> supaya animasi
              baris (abs-tbody-page) ikut terpicu ulang tiap ganti halaman. */}
          <tbody key={expanded ? `page-${safePage}` : 'collapsed'} className="abs-tbody-page">
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={8} className="abs-empty-row">Belum ada riwayat absensi.</td>
              </tr>
            )}
            {visibleRows.map((day, index) => {
              const status = resolveStatus(day);
              const duration = resolveDuration(day);
              const overtime = resolveOvertime(day);
              return (
                <tr key={day.date} style={{ animationDelay: `${index * 0.04}s` }}>
                  <td><strong>{formatDateLabel(day.date)}</strong></td>
                  <td>{day.checkIn ? formatTimeLabel(day.checkIn.recordedAt) : <span className="abs-empty-cell">-</span>}</td>
                  <td>{day.checkOut ? formatTimeLabel(day.checkOut.recordedAt) : <span className="abs-empty-cell">-</span>}</td>
                  <td>{duration || <span className="abs-empty-cell">-</span>}</td>
                  <td>
                    <span className={`abs-record-status abs-status-${status.tone}`}>{status.label}</span>
                  </td>
                  <td><LocationLinks day={day} /></td>
                  <td><PhotoLinks day={day} /></td>
                  <td>{overtime || <span className="abs-empty-cell">-</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {expanded && totalPages > 1 && (
        <div className="abs-pagination">
          <button
            type="button"
            className="abs-page-nav"
            onClick={() => goToPage(safePage - 1)}
            disabled={safePage === 0}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="abs-page-indicator">
            Halaman {safePage + 1} dari {totalPages}
          </span>
          <button
            type="button"
            className="abs-page-nav"
            onClick={() => goToPage(safePage + 1)}
            disabled={safePage === totalPages - 1}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
