// src/components/ApprovalLogAccordion.jsx
//
// [BARU] Accordion "Riwayat Log Pemeriksaan" yang bisa dipakai ulang. Desain SAMA dengan accordion di
// popup Informasi Detail Berkas Cuti / Lembur (class .form-cuti__log-* dari Form.css), jadi tampilan
// popup approver dan popup pemohon identik.
//
// `logs` = hasil buildOvertimeLogs() (utils/overtimeLog.js): [{ statusBadge, nama, waktu, catatan }]
//
// Contoh pemakaian:
// <ApprovalLogAccordion logs={detail.logs} />
import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getLogTone } from '../utils/overtimeLog';
import '../pages/Cuti/approve/components/Form.css'; // gaya accordion dipakai bersama dengan detail berkas cuti

export default function ApprovalLogAccordion({ logs = [], title = 'Riwayat Log Pemeriksaan' }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <section className={`form-cuti__log${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="form-cuti__log-toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="form-cuti__label">{title}</span>
        <span className="form-cuti__log-count">{logs.length}</span>
        <ChevronDown className="form-cuti__log-chevron" aria-hidden="true" />
      </button>
      <div id={panelId} className="form-cuti__log-panel" role="region" aria-label={title}>
        <div className="form-cuti__log-inner">
          {logs.length ? (
            <ul className="form-cuti__log-list">
              {logs.map((log, index) => (
                <li className="form-cuti__log-item" key={`${log.nama}-${log.statusBadge}-${index}`}>
                  <span className={`form-cuti__log-badge form-cuti__log-badge--${getLogTone(log.statusBadge)}`}>{log.statusBadge}</span>
                  <strong className="form-cuti__log-name">{log.nama}</strong>
                  <time className="form-cuti__log-time">{log.waktu}</time>
                  {log.catatan && <span className="form-cuti__log-note">{log.catatan}</span>}
                </li>
              ))}
            </ul>
          ) : <div className="form-cuti__log-empty">Belum ada riwayat pemeriksaan berkas.</div>}
        </div>
      </div>
    </section>
  );
}
