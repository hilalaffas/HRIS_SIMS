// src/pages/PersetujuanIzin/components/DecisionPanel.jsx
//
// [BARU] Catatan untuk karyawan + tombol Tolak / Setujui.
// Catatan WAJIB saat menolak (divalidasi di sini dan di backend).
import React, { useRef } from 'react';
import { Check, X } from 'lucide-react';
import { MAX_REVIEW_NOTE_LENGTH } from '../utils/permissionRequest';
import './DecisionPanel.css';

function DecisionPanel({ note, noteError, canApprove, approveHint, processing, onNoteChange, onApprove, onReject }) {
  const noteRef = useRef(null);
  const errorId = 'pzn-note-error';

  const handleReject = () => {
    if (onReject() === false) noteRef.current?.focus();
  };

  return (
    <div className="pzn-decision">
      <label className="pzn-decision__label" htmlFor="pzn-note">
        Catatan untuk karyawan <span>(wajib jika menolak)</span>
      </label>
      <textarea
        id="pzn-note"
        ref={noteRef}
        className={`pzn-decision__note${noteError ? ' has-error' : ''}`}
        rows={3}
        maxLength={MAX_REVIEW_NOTE_LENGTH}
        value={note}
        placeholder="Contoh: Mohon unggah ulang surat dengan cap dokter yang jelas."
        aria-invalid={!!noteError}
        aria-describedby={noteError ? errorId : undefined}
        onChange={(event) => onNoteChange(event.target.value)}
      />
      {noteError && <p id={errorId} className="pzn-decision__error" role="alert">{noteError}</p>}

      <div className="pzn-decision__actions">
        <button type="button" className="pzn-btn pzn-btn--reject" disabled={processing} onClick={handleReject}>
          <X aria-hidden="true" />
          Tolak
        </button>
        <button
          type="button"
          className="pzn-btn pzn-btn--approve"
          disabled={processing || !canApprove}
          title={canApprove ? undefined : approveHint}
          onClick={onApprove}
        >
          <Check aria-hidden="true" />
          {processing ? 'Memproses...' : 'Setujui'}
        </button>
      </div>
    </div>
  );
}

export default React.memo(DecisionPanel);
