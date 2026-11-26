// src/pages/DevSettings/components/MonitoringSection.jsx
//
// [BARU] Tab "Monitoring" di panel /devAccess: memantau kesehatan aplikasi dari sisi request HTTP,
// khusus akun dev (endpoint /api/dev/monitor/* ditolak 403 untuk akun lain).
//
// Dua sumber data:
//  1. Ringkasan (GET /summary): SEMUA request sejak server menyala -- jumlah, rata-rata, terlama,
//     lambat, error per endpoint. Dihitung di memori server, jadi RESET saat server restart/deploy.
//  2. Kejadian (GET /events): request yang tersimpan di database -- mengubah data (POST/PUT/PATCH/
//     DELETE), gagal (status >= 400), atau lambat. Disimpan 14 hari. Isi request & sandi tidak disimpan.
//
// Contoh pemakaian: <MonitoringSection />
import React, { useCallback, useEffect, useState } from 'react';
import { getMonitorEvents, getMonitorSummary } from '../../../services/devToolsService';
import './MonitoringSection.css';

const AUTO_REFRESH_MS = 10000;
const SEARCH_DEBOUNCE_MS = 400;
const EVENT_PAGE_SIZE = 25;
const ROUTE_PREVIEW_COUNT = 12;

const KIND_OPTIONS = [
  { id: 'all', label: 'Semua' },
  { id: 'error', label: 'Error' },
  { id: 'slow', label: 'Lambat' },
  { id: 'write', label: 'Ubah Data' },
];

const ROUTE_SORT_OPTIONS = [
  { id: 'averageMs', label: 'Rata-rata terlama' },
  { id: 'maxMs', label: 'Puncak terlama' },
  { id: 'errors', label: 'Paling banyak error' },
  { id: 'count', label: 'Paling sering dipanggil' },
];

const formatNumber = (value) => Number(value ?? 0).toLocaleString('id-ID');

const toJakartaDate = (localDateTime) => (localDateTime ? new Date(`${localDateTime}+07:00`) : null);

const formatDateTime = (localDateTime) => {
  const date = toJakartaDate(localDateTime);
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
};

const statusTone = (status) => {
  if (status >= 500) return 'danger';
  if (status >= 400) return 'warning';
  return 'ok';
};

const durationTone = (durationMs, slowThresholdMs) => (durationMs >= slowThresholdMs ? 'warning' : 'ok');

const routeErrors = (route) => (route.clientErrors ?? 0) + (route.serverErrors ?? 0);

export default function MonitoringSection() {
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const [eventPage, setEventPage] = useState(null); // { items, page, totalPages, totalElements }
  const [eventsError, setEventsError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [kind, setKind] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // searchInput setelah jeda mengetik
  const [pageIndex, setPageIndex] = useState(0);
  const [routeSort, setRouteSort] = useState('averageMs');
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Naik 1 tiap "Muat Ulang" / segarkan otomatis -> efek pemuatan di bawah berjalan lagi.
  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((tick) => tick + 1), []);

  // Muat saat tab dibuka, setiap filter/halaman berubah, atau reload dipicu. Respons dari permintaan
  // yang sudah usang (filter keburu berubah / komponen ditutup) diabaikan lewat isActive.
  useEffect(() => {
    let isActive = true;
    Promise.allSettled([
      getMonitorSummary(),
      getMonitorEvents({ kind, q: searchQuery, page: pageIndex, size: EVENT_PAGE_SIZE }),
    ]).then(([summaryResult, eventsResult]) => {
      if (!isActive) return;
      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
        setSummaryError('');
      } else {
        setSummaryError(summaryResult.reason?.message || 'Gagal memuat ringkasan performa.');
      }
      if (eventsResult.status === 'fulfilled') {
        setEventPage(eventsResult.value);
        setEventsError('');
      } else {
        setEventsError(eventsResult.reason?.message || 'Gagal memuat daftar kejadian.');
      }
      setLastUpdated(new Date());
      setIsLoading(false);
    });
    return () => {
      isActive = false;
    };
  }, [kind, searchQuery, pageIndex, reloadTick]);

  // Jeda 400 ms setelah berhenti mengetik sebelum mencari, lalu kembali ke halaman pertama.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPageIndex(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Segarkan otomatis tiap 10 detik; dilewati saat tab browser tersembunyi.
  useEffect(() => {
    if (!isAutoRefresh) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) reload();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [isAutoRefresh, reload]);

  const handleKindChange = (nextKind) => {
    setKind(nextKind);
    setPageIndex(0);
  };

  const slowThresholdMs = summary?.slowThresholdMs ?? 1000;

  const sortedRoutes = [...(summary?.routes ?? [])].sort((a, b) => {
    if (routeSort === 'errors') return routeErrors(b) - routeErrors(a);
    return (b[routeSort] ?? 0) - (a[routeSort] ?? 0);
  });
  const visibleRoutes = showAllRoutes ? sortedRoutes : sortedRoutes.slice(0, ROUTE_PREVIEW_COUNT);

  const items = eventPage?.items ?? [];
  const totalPages = eventPage?.totalPages ?? 0;

  return (
    <section className="devdata-section devmon">
      <div className="devmon__header">
        <div>
          <h2 className="devdata-title">Monitoring Request</h2>
          <p className="devmon__hint">
            Ringkasan dihitung sejak server menyala dan hilang saat server restart. Kejadian (ubah data, gagal, lambat)
            disimpan 14 hari. Isi request, token, dan sandi tidak pernah disimpan.
          </p>
        </div>
        <div className="devmon__actions">
          <label className="devmon__auto">
            <input
              type="checkbox"
              checked={isAutoRefresh}
              onChange={(event) => setIsAutoRefresh(event.target.checked)}
            />
            Segarkan otomatis (10 dtk)
          </label>
          <button type="button" className="devdata-btn" onClick={reload}>
            Muat Ulang
          </button>
        </div>
      </div>
      {lastUpdated && (
        <p className="devmon__updated">
          Diperbarui {lastUpdated.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
        </p>
      )}

      {summaryError && <p className="devsettings-error">{summaryError}</p>}

      {/* ===== Kartu ringkasan ===== */}
      <div className="devmon__cards">
        <div className="devmon__card">
          <span className="devmon__cardLabel">Total request</span>
          <strong className="devmon__cardValue">{formatNumber(summary?.totalRequests)}</strong>
        </div>
        <div className="devmon__card">
          <span className="devmon__cardLabel">Rata-rata respons</span>
          <strong className="devmon__cardValue">{formatNumber(summary?.averageMs)} ms</strong>
        </div>
        <div className={`devmon__card${summary?.slowRequests ? ' devmon__card--warning' : ''}`}>
          <span className="devmon__cardLabel">Lambat (≥ {formatNumber(slowThresholdMs)} ms)</span>
          <strong className="devmon__cardValue">{formatNumber(summary?.slowRequests)}</strong>
        </div>
        <div className={`devmon__card${summary?.clientErrors ? ' devmon__card--warning' : ''}`}>
          <span className="devmon__cardLabel">Ditolak / salah (4xx)</span>
          <strong className="devmon__cardValue">{formatNumber(summary?.clientErrors)}</strong>
        </div>
        <div className={`devmon__card${summary?.serverErrors ? ' devmon__card--danger' : ''}`}>
          <span className="devmon__cardLabel">Error server (5xx)</span>
          <strong className="devmon__cardValue">{formatNumber(summary?.serverErrors)}</strong>
        </div>
        <div className="devmon__card">
          <span className="devmon__cardLabel">Dihitung sejak</span>
          <strong className="devmon__cardValue devmon__cardValue--small">{formatDateTime(summary?.since)}</strong>
        </div>
      </div>
      {summary?.droppedEvents > 0 && (
        <p className="devmon__note">
          {formatNumber(summary.droppedEvents)} kejadian tidak sempat disimpan karena antrian penuh (angka di atas tetap
          lengkap).
        </p>
      )}

      {/* ===== Per endpoint ===== */}
      <div className="devdata-block">
        <div className="devmon__blockHeader">
          <h3 className="devdata-subtitle">Per endpoint</h3>
          <select
            className="devdata-search"
            value={routeSort}
            onChange={(event) => setRouteSort(event.target.value)}
            aria-label="Urutkan endpoint"
          >
            {ROUTE_SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="devmon__tableWrap">
          <table className="devmon__table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th className="devmon__num">Jumlah</th>
                <th className="devmon__num">Rata-rata</th>
                <th className="devmon__num">Terlama</th>
                <th className="devmon__num">Lambat</th>
                <th className="devmon__num">Error</th>
              </tr>
            </thead>
            <tbody>
              {visibleRoutes.length === 0 && (
                <tr>
                  <td colSpan={6} className="devmon__empty">
                    {isLoading ? 'Memuat…' : 'Belum ada request yang tercatat sejak server menyala.'}
                  </td>
                </tr>
              )}
              {visibleRoutes.map((route) => (
                <tr key={`${route.method} ${route.route}`}>
                  <td>
                    <span className={`devmon__method devmon__method--${route.method.toLowerCase()}`}>{route.method}</span>{' '}
                    <code>{route.route}</code>
                  </td>
                  <td className="devmon__num">{formatNumber(route.count)}</td>
                  <td className={`devmon__num devmon__tone--${durationTone(route.averageMs, slowThresholdMs)}`}>
                    {formatNumber(route.averageMs)} ms
                  </td>
                  <td className={`devmon__num devmon__tone--${durationTone(route.maxMs, slowThresholdMs)}`}>
                    {formatNumber(route.maxMs)} ms
                  </td>
                  <td className="devmon__num">{formatNumber(route.slowRequests)}</td>
                  <td className={`devmon__num${routeErrors(route) ? ' devmon__tone--danger' : ''}`}>
                    {formatNumber(routeErrors(route))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedRoutes.length > ROUTE_PREVIEW_COUNT && (
          <button
            type="button"
            className="devdata-btn devdata-btn--small devmon__more"
            onClick={() => setShowAllRoutes((value) => !value)}
          >
            {showAllRoutes ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${sortedRoutes.length})`}
          </button>
        )}
      </div>

      {/* ===== Kejadian ===== */}
      <div className="devdata-block">
        <div className="devmon__blockHeader">
          <h3 className="devdata-subtitle">Kejadian tersimpan</h3>
          <div className="devmon__filters" role="group" aria-label="Jenis kejadian">
            {KIND_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`devmon__chip${kind === option.id ? ' is-active' : ''}`}
                aria-pressed={kind === option.id}
                onClick={() => handleKindChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <input
          type="search"
          className="devdata-search devmon__search"
          placeholder="Cari pengguna, path, atau pesan error…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Cari kejadian"
          maxLength={100}
        />
        {eventsError && <p className="devsettings-error">{eventsError}</p>}

        <div className="devmon__tableWrap">
          <table className="devmon__table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Request</th>
                <th className="devmon__num">Status</th>
                <th className="devmon__num">Durasi</th>
                <th>IP</th>
                <th>Pesan</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="devmon__empty">
                    {isLoading ? 'Memuat…' : 'Tidak ada kejadian untuk filter ini.'}
                  </td>
                </tr>
              )}
              {items.map((event) => (
                <tr key={event.id}>
                  <td className="devmon__nowrap">{formatDateTime(event.createdAt)}</td>
                  <td>{event.username || '-'}</td>
                  <td>
                    <span className={`devmon__method devmon__method--${event.method.toLowerCase()}`}>{event.method}</span>{' '}
                    <code>{event.path}</code>
                  </td>
                  <td className="devmon__num">
                    <span className={`devmon__badge devmon__badge--${statusTone(event.status)}`}>{event.status}</span>
                  </td>
                  <td className={`devmon__num devmon__tone--${durationTone(event.durationMs, slowThresholdMs)}`}>
                    {formatNumber(event.durationMs)} ms
                  </td>
                  <td className="devmon__nowrap">{event.ipAddress || '-'}</td>
                  <td className="devmon__message">{event.errorMessage || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="devmon__pager">
          <span>
            {formatNumber(eventPage?.totalElements)} kejadian
            {totalPages > 0 && ` · Halaman ${pageIndex + 1} dari ${totalPages}`}
          </span>
          <div className="devmon__pagerButtons">
            <button
              type="button"
              className="devdata-btn devdata-btn--small"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((page) => Math.max(page - 1, 0))}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              className="devdata-btn devdata-btn--small"
              disabled={pageIndex + 1 >= totalPages}
              onClick={() => setPageIndex((page) => page + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
