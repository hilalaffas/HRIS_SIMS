// src/pages/DevSettings/components/PermissionResetSection.jsx
//
// [BARU] Bagian panel /devAccess untuk mereset data Izin/Sakit karyawan supaya alur
// "Ajukan Izin / Sakit" dan persetujuannya bisa diuji ulang. Cari berdasarkan username
// login, lalu per data bisa:
//  - "Kembalikan ke Menunggu" (hanya Sakit yang sudah diputuskan) -> uji ulang approve/tolak
//  - "Hapus" -> data hilang, tombol Ajukan Izin / Sakit di halaman Absensi aktif lagi
// Hanya data Izin/Sakit yang bisa disentuh (dijaga backend); absen Masuk/Keluar biasa tidak.
//
// Contoh pemakaian: <PermissionResetSection />
import React, { useState } from 'react';
import { formatDateLabel } from '../../../services/attendanceService';
import {
  deletePermissionRecord,
  getPermissionRecords,
  resetSickApproval,
} from '../../../services/devToolsService';
import './PermissionResetSection.css';

const APPROVAL_LABELS = {
  PENDING: { text: 'Menunggu', tone: 'pending' },
  APPROVED: { text: 'Disetujui', tone: 'approved' },
  REJECTED: { text: 'Ditolak', tone: 'rejected' },
};

const describeType = (record) => (record.reason === 'SAKIT' ? 'Sakit' : 'Izin Terlambat');

export default function PermissionResetSection() {
  const [username, setUsername] = useState('');
  const [searchedUsername, setSearchedUsername] = useState('');
  const [records, setRecords] = useState(null); // null = belum mencari
  const [isSearching, setIsSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null); // data yang menunggu konfirmasi hapus
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleSearch = async (event) => {
    event.preventDefault();
    const query = username.trim();
    if (!query || isSearching) return;

    setIsSearching(true);
    setErrorMessage('');
    setInfoMessage('');
    setConfirmId(null);
    try {
      const data = await getPermissionRecords(query);
      setRecords(data || []);
      setSearchedUsername(query);
    } catch (error) {
      setRecords(null);
      setErrorMessage(error?.message || 'Gagal memuat data. Coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  const runAction = async (record, action, successMessage) => {
    if (busyId !== null) return;
    setBusyId(record.attendanceId);
    setErrorMessage('');
    setInfoMessage('');
    try {
      await action();
      setInfoMessage(successMessage);
      return true;
    } catch (error) {
      setErrorMessage(error?.message || 'Aksi gagal. Coba lagi.');
      return false;
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const handleResetApproval = async (record) => {
    const done = await runAction(record, async () => {
      const updated = await resetSickApproval(record.attendanceId);
      setRecords((current) => current.map((item) => (
        item.attendanceId === updated.attendanceId ? updated : item
      )));
    }, 'Status persetujuan dikembalikan ke Menunggu.');
    return done;
  };

  const handleDelete = async (record) => {
    await runAction(record, async () => {
      await deletePermissionRecord(record.attendanceId);
      setRecords((current) => current.filter((item) => item.attendanceId !== record.attendanceId));
    }, 'Data dihapus. Minta user memuat ulang halaman Absensi.');
  };

  return (
    <section className="devreset-section">
      <p className="devsettings-row__label">Reset Data Izin / Sakit</p>
      <p className="devsettings-row__desc">
        Hapus atau kembalikan ke &quot;Menunggu&quot; data izin/sakit karyawan supaya pengajuan dan
        persetujuannya bisa dites ulang. Absen Masuk/Keluar biasa tidak ikut terhapus.
      </p>

      <form className="devreset-search" onSubmit={handleSearch}>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username karyawan"
          aria-label="Username karyawan"
          autoComplete="off"
          disabled={isSearching}
        />
        <button type="submit" disabled={!username.trim() || isSearching}>
          {isSearching ? 'Mencari...' : 'Cari'}
        </button>
      </form>

      {errorMessage && <p className="devsettings-error">{errorMessage}</p>}
      {infoMessage && <p className="devreset-info">{infoMessage}</p>}

      {records && records.length === 0 && (
        <p className="devsettings-hint">Tidak ada data izin/sakit untuk &quot;{searchedUsername}&quot;.</p>
      )}

      {records && records.length > 0 && (
        <ul className="devreset-list">
          {records.map((record) => {
            const approval = APPROVAL_LABELS[record.approvalStatus];
            const isBusy = busyId === record.attendanceId;
            const canResetApproval = record.reason === 'SAKIT' && record.approvalStatus !== 'PENDING';
            return (
              <li key={record.attendanceId} className="devreset-item">
                <div className="devreset-item__info">
                  <strong>{formatDateLabel(record.attendanceDate)} &middot; {describeType(record)}</strong>
                  <span>
                    {record.reason === 'SAKIT' && `${record.leaveDays || 1} hari kerja`}
                    {approval && (
                      <em className={`devreset-badge devreset-badge--${approval.tone}`}>{approval.text}</em>
                    )}
                  </span>
                  {record.note && <span className="devreset-item__note">{record.note}</span>}
                </div>

                <div className="devreset-item__actions">
                  {canResetApproval && (
                    <button type="button" onClick={() => handleResetApproval(record)} disabled={busyId !== null}>
                      {isBusy ? 'Memproses...' : 'Kembalikan ke Menunggu'}
                    </button>
                  )}
                  {confirmId === record.attendanceId ? (
                    <>
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => handleDelete(record)}
                        disabled={busyId !== null}
                      >
                        {isBusy ? 'Menghapus...' : 'Ya, hapus'}
                      </button>
                      <button type="button" onClick={() => setConfirmId(null)} disabled={busyId !== null}>
                        Batal
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => setConfirmId(record.attendanceId)}
                      disabled={busyId !== null}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
