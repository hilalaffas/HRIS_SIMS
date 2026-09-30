import React, { useState } from 'react';
import { Clock3, MoreHorizontal, Pencil, X } from 'lucide-react';
import './DivisiShiftSettings.css';
import { updateShift } from '../../../services/shiftService';

// Warna kartu per kode shift (kode dari tabel shifts).
const SHIFT_TONE = { SHIFT_1: 'mint', SHIFT_2: 'yellow', NORMAL: 'blue' };

const DivisiShiftSettings = ({ shifts, isLoading, error, onSaved, onToast }) => {
  // Mode ubah jam: kartu shift jadi bisa diklik
  const [isEditMode, setIsEditMode] = useState(false);
  const [target, setTarget] = useState(null); // shift yang sedang diubah
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const openEdit = (shift) => {
    if (!isEditMode) return;
    setTarget(shift);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setHasError(false);
  };

  const closeEdit = () => {
    setTarget(null);
    setHasError(false);
  };

  const handleSave = async () => {
    if (!startTime || !endTime) {
      setHasError(true);
      onToast('Harap isi jam mulai dan jam selesai.', 'error');
      return;
    }
    if (startTime === endTime) {
      setHasError(true);
      onToast('Jam mulai dan jam selesai tidak boleh sama.', 'error');
      return;
    }
    setHasError(false);
    setIsSaving(true);
    try {
      await updateShift(target.shiftId, startTime, endTime);
      await onSaved();
      onToast(`Jam ${target.name} berhasil diperbarui.`, 'success');
      setTarget(null);
    } catch (err) {
      onToast(err.message || 'Gagal menyimpan jam shift.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card_shift_settings">
      <div className="header_shift_settings">
        <div className="title-wrapper_shift_settings">
          <Clock3 size={19} className="icon_shift_settings" />
          <div>
            <h2>Pengaturan Divisi &amp; Jam Kerja Shift</h2>
            <p>Superadmin &amp; Leader dapat menentukan jam shift operasional.</p>
          </div>
        </div>
        <button
          type="button"
          className={`btn-more_shift_settings${isEditMode ? ' btn-more_shift_settings--active' : ''}`}
          onClick={() => setIsEditMode((prev) => !prev)}
          aria-label="Ubah jam shift"
          aria-pressed={isEditMode}
          title={isEditMode ? 'Selesai mengubah jam shift' : 'Ubah jam shift'}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {isEditMode && (
        <p className="hint_shift_settings">Pilih kartu shift untuk mengubah jam kerjanya.</p>
      )}

      {isLoading && <div className="empty-state_shift_settings">Memuat data shift...</div>}
      {!isLoading && error && (
        <div className="empty-state_shift_settings" style={{ color: '#b91c1c' }}>{error}</div>
      )}

      {!isLoading && !error && (
        <div className="grid_shift_settings">
          {shifts.map((shift) => (
            <button
              type="button"
              key={shift.shiftId}
              className={`card-shift_shift_settings tone-${SHIFT_TONE[shift.code] || 'mint'}${isEditMode ? ' card-shift_shift_settings--editable' : ''}`}
              onClick={() => openEdit(shift)}
              disabled={!isEditMode}
            >
              <strong>
                {shift.name}
                {isEditMode && <Pencil size={13} />}
              </strong>
              <span>{shift.startTime} – {shift.endTime} WIB</span>
            </button>
          ))}
        </div>
      )}

      {/* Modal ubah jam -- memakai kelas modal dari DataDivisi.css */}
      {target && (
        <div
          className="modal-overlay_data_divisi"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div className="modal-content_data_divisi" role="dialog" aria-modal="true" aria-labelledby="edit-shift-title">
            <div className="modal-header-edit_data_divisi">
              <div>
                <h3 id="edit-shift-title">Ubah Jam Shift</h3>
                <p>{target.name}</p>
              </div>
              <button className="btn-close-modal_data_divisi" onClick={closeEdit} aria-label="Tutup popup">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-edit_data_divisi">
              <label htmlFor="shift-start">Jam Mulai</label>
              <input
                id="shift-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={hasError && !startTime ? 'input-edit_data_divisi--error' : ''}
                autoFocus
              />
              <label htmlFor="shift-end" className="label-tipe_data_divisi">Jam Selesai</label>
              <input
                id="shift-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={hasError && !endTime ? 'input-edit_data_divisi--error' : ''}
              />
            </div>

            <div className="modal-footer-edit_data_divisi">
              <button className="btn-batal-modal_data_divisi" onClick={closeEdit}>Batal</button>
              <button className="btn-simpan-modal_data_divisi" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DivisiShiftSettings;
