import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Crosshair,
  FileText,
  History,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wifi,
} from 'lucide-react';

const schedule = [
  { day: 'Sen', date: '21', label: 'Kemarin', state: 'done', in: '08:01', out: '17:04' },
  { day: 'Sel', date: '22', label: 'Hari ini', state: 'active', in: '08:12', out: '-' },
  { day: 'Rab', date: '23', label: 'Besok', state: 'future', in: '-', out: '-' },
  { day: 'Kam', date: '24', label: '', state: 'future', in: '-', out: '-' },
  { day: 'Jum', date: '25', label: '', state: 'future', in: '-', out: '-' },
];

const history = [
  { date: '21 Jun 2026', day: 'Senin', in: '08:01', out: '17:04', total: '8j 03m', status: 'Hadir' },
  { date: '20 Jun 2026', day: 'Sabtu', in: '08:15', out: '12:30', total: '4j 15m', status: 'Hadir' },
  { date: '19 Jun 2026', day: 'Jumat', in: '08:42', out: '17:10', total: '7j 28m', status: 'Terlambat' },
  { date: '18 Jun 2026', day: 'Kamis', in: '08:04', out: '17:00', total: '7j 56m', status: 'Hadir' },
];

export default function Absensi() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationReady, setLocationReady] = useState(true);
  const [activeTab, setActiveTab] = useState('hari-ini');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const currentAttendance = useMemo(() => schedule.find((item) => item.state === 'active'), []);

  const refreshLocation = () => {
    setIsLoadingLocation(true);
    window.setTimeout(() => {
      setLocationReady(true);
      setIsLoadingLocation(false);
    }, 900);
  };

  const handleAttendance = () => {
    if (!locationReady) return;
    setIsCheckedIn((value) => !value);
  };

  return (
    <div className="min-h-full bg-[#f6f8fb] px-4 py-5 text-[#15223b] sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#71809a]"><span className="size-2 rounded-full bg-[#19b887]" /> Ruang Karyawan <span className="text-[#c1c9d6">/</span> Absensi</div>
            <h1 className="text-3xl font-bold tracking-[-0.04em] text-[#15223b] sm:text-4xl">Absensi hari ini</h1>
            <p className="mt-2 text-sm text-[#71809a]">Catat kehadiranmu dengan aman menggunakan lokasi GPS.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#e4e9f0] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(39,57,84,0.04)]">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#edf8f4] text-[#16a477]"><UserRound size={19} /></div>
            <div><p className="text-sm font-semibold">Andi Saputra</p><p className="text-xs text-[#8490a4]">Product Engineering</p></div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e4e9f0] bg-white p-5 shadow-[0_8px_24px_rgba(39,57,84,0.04)]"><div className="mb-4 flex items-center justify-between"><p className="text-sm text-[#71809a]">Jam kerja bulan ini</p><Clock3 className="text-[#71809a]" size={18} /></div><p className="text-2xl font-bold">142<span className="ml-1 text-sm font-medium text-[#8490a4]">jam</span></p><p className="mt-2 text-xs text-[#16a477]">↑ 4,8% dari bulan lalu</p></div>
          <div className="rounded-2xl border border-[#e4e9f0] bg-white p-5 shadow-[0_8px_24px_rgba(39,57,84,0.04)]"><div className="mb-4 flex items-center justify-between"><p className="text-sm text-[#71809a]">Kehadiran bulan ini</p><Check className="text-[#16a477]" size={18} /></div><p className="text-2xl font-bold">18<span className="ml-1 text-sm font-medium text-[#8490a4]">/ 20 hari</span></p><p className="mt-2 text-xs text-[#16a477]">90% tingkat kehadiran</p></div>
          <div className="rounded-2xl border border-[#e4e9f0] bg-white p-5 shadow-[0_8px_24px_rgba(39,57,84,0.04)]"><div className="mb-4 flex items-center justify-between"><p className="text-sm text-[#71809a]">Status hari ini</p><ShieldCheck className="text-[#16a477]" size={18} /></div><p className="text-2xl font-bold">{isCheckedIn ? 'Sedang kerja' : 'Belum absen'}</p><p className="mt-2 text-xs text-[#71809a]">{isCheckedIn ? 'Masuk tercatat pukul ' + formattedTime : 'Jangan lupa catat kehadiranmu'}</p></div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(350px,0.9fr)]">
          <section className="overflow-hidden rounded-3xl border border-[#e4e9f0] bg-white shadow-[0_10px_30px_rgba(39,57,84,0.05)]">
            <div className="flex flex-col gap-3 border-b border-[#edf0f4] p-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Catat kehadiran</h2><p className="mt-1 text-sm text-[#8490a4]">{formattedDate}</p></div><div className="flex items-center gap-2 rounded-full bg-[#edf8f4] px-3 py-1.5 text-xs font-semibold text-[#159b72]"><Wifi size={14} /> GPS aktif</div></div>
            <div className="p-6">
              <div className="relative min-h-[230px] overflow-hidden rounded-2xl border border-[#dbe7e5] bg-[#eaf4f1]">
                <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(#c5ddd7 1px, transparent 1px), linear-gradient(90deg, #c5ddd7 1px, transparent 1px)', backgroundSize: '38px 38px', transform: 'rotate(-5deg) scale(1.1)' }} />
                <div className="absolute left-[10%] top-[16%] h-24 w-2/5 rounded-[50%] border-2 border-[#b6d5ce] bg-[#d9ece6]" /><div className="absolute bottom-[14%] right-[6%] h-28 w-2/3 rounded-[50%] border-2 border-[#b6d5ce] bg-[#d9ece6]" />
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"><div className="relative flex size-14 items-center justify-center rounded-full border-4 border-white bg-[#19b887] text-white shadow-[0_5px_14px_rgba(25,184,135,0.35)]"><MapPin size={25} fill="currentColor" /></div><div className="mt-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#283752] shadow-sm">Lokasi kamu</div></div>
                <div className="absolute bottom-4 left-4 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-xs shadow-sm"><p className="font-semibold text-[#283752]">Kantor SIMS</p><p className="mt-0.5 text-[#8490a4]">Jl. Sudirman No. 25, Jakarta</p></div>
                <button onClick={refreshLocation} aria-label="Perbarui lokasi" className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-xl border border-[#e4e9f0] bg-white text-[#71809a] shadow-sm transition hover:text-[#19a879]">{isLoadingLocation ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}</button>
              </div>
              <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-[#f8fafb] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-[#e5f6f0] text-[#18a879]"><Crosshair size={18} /></div><div><p className="text-sm font-semibold">Lokasi terverifikasi</p><p className="mt-1 text-xs text-[#8490a4]">Akurasi lokasi ± 8 meter · Diperbarui baru saja</p></div></div><span className="text-xs font-semibold text-[#16a477]">Dalam radius kantor</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={handleAttendance} disabled={!locationReady || isLoadingLocation} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isCheckedIn ? 'bg-[#ee765d] hover:bg-[#dc634b]' : 'bg-[#1b9e79] hover:bg-[#168867]'}`}>{isCheckedIn ? <LogOut size={18} /> : <LogIn size={18} />}{isCheckedIn ? 'Absen keluar' : 'Absen masuk'}</button><button onClick={() => setLocationReady((value) => !value)} className="flex items-center justify-center gap-2 rounded-xl border border-[#dfe5ec] bg-white px-4 py-3.5 text-sm font-semibold text-[#52627d] transition hover:border-[#aebdca]"><Smartphone size={18} /> {locationReady ? 'Ubah perangkat' : 'Aktifkan GPS'}</button></div>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-[#8490a4]"><ShieldCheck size={14} className="text-[#19b887]" /> Data lokasi dienkripsi dan hanya digunakan untuk validasi absensi.</p>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e4e9f0] bg-white p-6 shadow-[0_10px_30px_rgba(39,57,84,0.05)]"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Jadwal minggu ini</h2><p className="mt-1 text-sm text-[#8490a4]">Ringkasan kehadiranmu</p></div><CalendarDays size={20} className="text-[#8490a4]" /></div><div className="mb-5 grid grid-cols-5 gap-2">{schedule.map((item) => <button key={item.date} onClick={() => setActiveTab(item.state === 'active' ? 'hari-ini' : item.date)} className={`rounded-xl border px-1 py-3 text-center transition ${item.state === 'active' ? 'border-[#19b887] bg-[#edf8f4]' : 'border-[#edf0f4] bg-white hover:border-[#cbd8df]'}`}><p className="text-[11px] font-semibold text-[#8490a4]">{item.day}</p><p className={`my-1 text-lg font-bold ${item.state === 'active' ? 'text-[#159b72]' : 'text-[#34425d]'}`}>{item.date}</p><span className={`mx-auto block size-1.5 rounded-full ${item.state === 'done' ? 'bg-[#19b887]' : item.state === 'active' ? 'bg-[#f1ae44]' : 'bg-[#dce2e8]'}`} /></button>)}</div><div className="flex flex-col gap-3"><div className="flex items-center justify-between border-b border-[#edf0f4] pb-3 text-sm"><span className="text-[#71809a]">Jam masuk</span><span className="font-semibold">{isCheckedIn ? formattedTime : currentAttendance.in}</span></div><div className="flex items-center justify-between border-b border-[#edf0f4] pb-3 text-sm"><span className="text-[#71809a]">Jam pulang</span><span className="font-semibold text-[#8490a4]">{isCheckedIn ? 'Belum tercatat' : currentAttendance.out}</span></div><div className="flex items-center justify-between text-sm"><span className="text-[#71809a]">Durasi kerja</span><span className="font-semibold text-[#159b72]">{isCheckedIn ? 'Berjalan' : '—'}</span></div></div><div className="mt-6 rounded-2xl border border-[#f3e4c6] bg-[#fffbf2] p-4"><div className="flex items-start gap-3"><Coffee size={17} className="mt-0.5 text-[#d99c35]" /><div><p className="text-sm font-semibold text-[#755923]">Jam kerja fleksibel</p><p className="mt-1 text-xs leading-5 text-[#9b7b42]">Batas keterlambatan hari ini pukul 08:30. Pastikan GPS aktif saat melakukan absensi.</p></div></div></div></section>
        </div>

        <section className="mt-6 rounded-3xl border border-[#e4e9f0] bg-white shadow-[0_10px_30px_rgba(39,57,84,0.05)]"><div className="flex flex-col gap-3 border-b border-[#edf0f4] p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#edf2fb] text-[#4567a7]"><History size={19} /></div><div><h2 className="text-lg font-bold">Riwayat absensi</h2><p className="mt-1 text-sm text-[#8490a4]">Aktivitas absensi terbaru</p></div></div><button className="flex items-center gap-2 text-sm font-semibold text-[#4567a7] hover:text-[#294d91]">Lihat semua <ChevronRight size={16} /></button></div><div className="divide-y divide-[#edf0f4]">{history.map((item) => <div key={item.date} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#f4f6f9] text-[#8490a4]"><FileText size={17} /></div><div><p className="text-sm font-semibold">{item.day}, {item.date}</p><p className="mt-1 text-xs text-[#8490a4]">{item.in} — {item.out} · {item.total}</p></div></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'Terlambat' ? 'bg-[#fff5df] text-[#b27a1a]' : 'bg-[#eaf8f2] text-[#159b72]'}`}>{item.status}</span></div>)}</div></section>
        <div className="mt-5 flex items-center justify-between px-1 text-xs text-[#9aa5b7]"><span>Terakhir disinkronkan: baru saja</span><span className="hidden items-center gap-1 sm:flex"><Navigation size={13} /> SIMS HRIS</span></div>
      </div>
    </div>
  );
}
