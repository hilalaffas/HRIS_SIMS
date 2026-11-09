// src/pages/DevSettings/components/ForfeitRuleSection.jsx
//
// [BARU] Tab "Aturan Hangus" di panel /devAccess: mengatur TANGGAL MULAI BERLAKU cuti hangus (dulu
// konstanta 1 Januari 2025 di backend) supaya bisa dikoreksi bila salah, plus pemindaian "tahun mana
// yang paling cocok dengan data".
//
// Cara kerja pemindaian (backend: LeaveSummaryService.scanForfeitStartDates): tiap karyawan dicek
//   sisa seharusnya = total kuota sejak masuk - terpakai - hangus
// terhadap sisa cuti di sistem. Tiap tahun kandidat dihitung ulang; yang paling banyak cocok ditandai.
//
// Mengubah aturan TIDAK menulis ulang data lama: hanya memengaruhi hitungan hangus berikutnya dan
// import berikutnya. Sisa yang SUDAH dialokasikan ke Sisa Cuti Lama oleh import lama tidak ikut berubah.
//
// Contoh pemakaian: <ForfeitRuleSection />
import React, { useEffect, useState } from 'react';
import { getForfeitRule, resetForfeitRule, scanForfeitRule, updateForfeitRule } from '../../../services/devToolsService';
import './DevDataSections.css';

const formatDays = (value) => String(Number(Number(value ?? 0).toFixed(2)));
const formatDiff = (value) => {
  const number = Number(Number(value ?? 0).toFixed(2));
  return number > 0 ? `+${number}` : String(number);
};

export default function ForfeitRuleSection() {
  const [rule, setRule] = useState(null); // { startDate, defaultStartDate, neverDate }
  const [draft, setDraft] = useState('');
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scan, setScan] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let isActive = true;
    getForfeitRule()
      .then((data) => {
        if (!isActive) return;
        setRule(data);
        setDraft(data.startDate);
      })
      .catch((error) => {
        if (isActive) setLoadError(error?.message || 'Gagal memuat aturan cuti hangus.');
      });
    return () => {
      isActive = false;
    };
  }, []);

  const runScan = async () => {
    setIsScanning(true);
    try {
      setScan(await scanForfeitRule());
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Pemindaian gagal.' });
    } finally {
      setIsScanning(false);
    }
  };

  const save = async (apply) => {
    if (isSaving) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await apply();
      setRule(saved);
      setDraft(saved.startDate);
      setMessage({ type: 'success', text: `Tersimpan: cuti hangus berlaku mulai ${saved.startDate}.` });
      if (scan) await runScan(); // hasil pindai sebelumnya sudah tidak sesuai aturan aktif
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Gagal menyimpan aturan.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => save(() => updateForfeitRule(draft));
  const handleReset = () => save(() => resetForfeitRule());
  const handleUse = (startDate) => save(() => updateForfeitRule(startDate));

  const isNever = (date) => rule && date === rule.neverDate;
  const labelOf = (date) => (isNever(date) ? 'Tidak pernah hangus' : date);
  const isChanged = rule && draft && draft !== rule.startDate;

  return (
    <section className="devdata-section">
      <h2 className="devdata-title">Aturan Tanggal Berlaku Cuti Hangus</h2>
      <p className="devsettings-hint">
        Sisa cuti tahunan yang tidak terpakai <strong>hangus di hari terakhir tiap periode anniversary</strong>, tetapi
        hanya bila tanggal hangusnya sama dengan atau setelah tanggal di bawah ini. Sisa sebelum tanggal itu tidak hangus
        dan masuk Sisa Cuti Lama. Isi <strong>{rule?.neverDate ?? '2999-12-31'}</strong> bila cuti tidak pernah hangus.
      </p>

      {loadError && <p className="devsettings-error">{loadError}</p>}
      {!rule && !loadError && <p className="devsettings-hint">Memuat aturan...</p>}

      {rule && (
        <div className="devdata-block">
          <div className="devdata-field">
            <label htmlFor="forfeit-start-date">Cuti hangus berlaku mulai tanggal</label>
            <input
              id="forfeit-start-date"
              type="date"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setMessage(null);
              }}
            />
          </div>
          <p className="devsettings-hint">
            Aktif sekarang: <strong>{labelOf(rule.startDate)}</strong> (bawaan {rule.defaultStartDate}).
          </p>
          <div className="devdata-actions">
            <button type="button" className="devdata-btn devdata-btn--primary" onClick={handleSave} disabled={isSaving || !isChanged}>
              {isSaving ? 'Menyimpan...' : 'Simpan aturan'}
            </button>
            <button type="button" className="devdata-btn" onClick={handleReset} disabled={isSaving || rule.startDate === rule.defaultStartDate}>
              Kembalikan ke bawaan
            </button>
          </div>
          {message && <p className={`devdata-rowmsg is-${message.type}`}>{message.text}</p>}
          <p className="devsettings-hint">
            Perubahan hanya memengaruhi perhitungan hangus berikutnya dan import berikutnya. Sisa yang sudah dialokasikan ke Sisa Cuti Lama oleh
            import lama tidak ikut berubah, jadi atur tanggal yang benar <strong>sebelum</strong> import ulang.
          </p>
        </div>
      )}

      <div className="devdata-block">
        <h3 className="devdata-subtitle">Pindai tahun yang paling cocok dengan data</h3>
        <p className="devsettings-hint">
          Tiap karyawan dicek: <strong>total kuota sejak masuk − terpakai − hangus = sisa cuti di sistem</strong>. Tahun yang membuat paling
          banyak karyawan cocok adalah kandidat tanggal berlaku hangus yang tepat. Bila tidak ada tahun yang cocok untuk karyawan tertentu,
          berarti datanya yang perlu dikoreksi (pemakaian belum diinput, sisa salah ketik, atau tanggal masuk salah).
        </p>
        <div className="devdata-actions">
          <button type="button" className="devdata-btn" onClick={runScan} disabled={isScanning || !rule}>
            {isScanning ? 'Memindai...' : 'Pindai data'}
          </button>
        </div>

        {scan && (
          <>
            <p className="devsettings-hint">
              Diperiksa {scan.employeesChecked} karyawan per {scan.asOfDate}
              {scan.employeesSkipped > 0 && ` (${scan.employeesSkipped} dilewati: belum genap 1 tahun atau belum ada riwayat pemakaian)`}.
            </p>
            <div className="devdata-table-wrap">
              <table className="devdata-table">
                <thead>
                  <tr>
                    <th>Hangus berlaku mulai</th>
                    <th>Cocok</th>
                    <th>Tidak cocok</th>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {scan.candidates.map((candidate) => (
                    <tr key={candidate.startDate}>
                      <td>
                        <strong>{labelOf(candidate.startDate)}</strong>
                        {candidate.current && ' (aktif)'}
                        {candidate.best && ' ★ paling cocok'}
                      </td>
                      <td>{candidate.matched}</td>
                      <td>{candidate.mismatched}</td>
                      <td>
                        <button
                          type="button"
                          className="devdata-btn devdata-btn--small"
                          onClick={() => handleUse(candidate.startDate)}
                          disabled={isSaving || candidate.current}
                        >
                          Pakai tanggal ini
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="devdata-subtitle">Karyawan yang tidak cocok pada aturan aktif ({scan.mismatches.length})</h3>
            {scan.mismatches.length === 0 ? (
              <p className="devdata-rowmsg is-success">Semua karyawan yang diperiksa cocok.</p>
            ) : (
              <div className="devdata-table-wrap">
                <table className="devdata-table">
                  <thead>
                    <tr>
                      <th>Karyawan</th>
                      <th>Total kuota</th>
                      <th>Terpakai</th>
                      <th>Hangus</th>
                      <th>Sisa seharusnya</th>
                      <th>Sisa di sistem</th>
                      <th>Selisih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scan.mismatches.map((row) => (
                      <tr key={row.employeeId}>
                        <td>
                          <strong>{row.employeeName}</strong>
                          <div className="devsettings-hint">{row.nik} · masuk {row.joinDate} · {row.fullYears} tahun</div>
                        </td>
                        <td>{formatDays(row.totalGrantedQuota)}</td>
                        <td>{formatDays(row.usedLeave)}</td>
                        <td>{formatDays(row.forfeitedLeave)}</td>
                        <td>{formatDays(row.expectedRemaining)}</td>
                        <td>{formatDays(row.actualRemaining)}</td>
                        <td title="Positif: sisa di sistem lebih banyak dari seharusnya (pemakaian/hangus belum tercatat). Negatif: sebaliknya.">
                          <strong>{formatDiff(row.difference)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
