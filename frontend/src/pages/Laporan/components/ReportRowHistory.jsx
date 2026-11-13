import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { History, X } from 'lucide-react';
import '../../Absensi/components/PermissionRequestModal.css';
export default function ReportRowHistory({ row, report, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);
  return createPortal(<dialog ref={dialogRef} className="abs-permission-modal lpr-edit-dialog lpr-history-dialog" aria-labelledby="lpr-history-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="abs-permission-header">
      <h2 id="lpr-history-title"><History aria-hidden="true" />Riwayat Edit</h2>
      <button type="button" onClick={onClose} aria-label="Tutup riwayat edit"><X /></button>
    </header>
    <div className="abs-permission-body">
      <p className="abs-permission-hint">{report.fullName} · {row.dateLabel}</p>
      <div className="lpr-edit-history">

    {row.history.map((entry) => {
      const changes = [['Jadwal Shift', entry.beforeShift, entry.afterShift], ['Status', entry.beforeStatus, entry.afterStatus], ['Keterangan', entry.beforeNote, entry.afterNote]]
        .filter(([, before, after]) => before !== after);
      return <article key={entry.id}>
        <strong>{entry.editorName || entry.editedBy}</strong>
        <time>{new Date(`${entry.editedAt}+07:00`).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</time>
        <table className="lpr-history-desktop"><thead><tr><th>Kolom</th><th>Sebelum</th><th>Sesudah</th></tr></thead>
          <tbody>{changes.map(([field, before, after]) => <tr key={field}><td>{field}</td><td>{before || '-'}</td><td>{after || '-'}</td></tr>)}</tbody>
        </table>
        <div className="lpr-history-mobile">
          {changes.map(([field, before, after]) => <section key={field} className="lpr-history-change">
            <h3>{field}</h3>
            <dl>
              <div className="lpr-history-before"><dt>Sebelum</dt><dd>{before || '-'}</dd></div>
              <div className="lpr-history-after"><dt>Sesudah</dt><dd>{after || '-'}</dd></div>
            </dl>
          </section>)}
        </div>
        <p className="lpr-history-reason"><b>Alasan perubahan:</b> {entry.reason}</p>
      </article>;
    })}
      </div>
    </div>
    <footer className="abs-permission-footer">
      <button type="button" className="abs-permission-submit" onClick={onClose}>Tutup</button>
    </footer>
  </dialog>, document.body);
}
