import React, { useState } from 'react';
import { X } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import './OvertimeApproverEditModal.css';

// Melengkapi nama approver HRD untuk pengajuan lembur yang belum punya approver
// (mis. lembur tambahan saat check-out). Hanya satu nama HRD yang dibutuhkan.
export default function OvertimeApproverEditModal({ record, approvers = { HRD: [] }, onClose, onSubmit }) {
  const [hrdEmployeeId, setHrdEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const hrdOptions = (approvers.HRD || []).map((person) => ({
    value: String(person.employeeId),
    label: person.fullName,
  }));

  const submit = async (event) => {
    event.preventDefault();
    if (!hrdEmployeeId) {
      setError('Nama approver HRD wajib dipilih.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ hrdEmployeeId: Number(hrdEmployeeId) });
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan nama approval.');
      setSaving(false);
    }
  };

  return (
    <div className="overtime-approver-overlay" role="dialog" aria-modal="true" aria-labelledby="overtime-approver-title">
      <form className="overtime-approver-modal" onSubmit={submit}>
        <header className="overtime-approver-modal__header">
          <div>
            <h2 id="overtime-approver-title">Lengkapi Nama Approval</h2>
            <p>Pengajuan lembur {record?.date || ''} belum memiliki nama approver.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Tutup"><X /></button>
        </header>

        <div className="overtime-approver-field">
          <label>Approver HRD *</label>
          <Dropdown
            name="hrdEmployeeId"
            value={hrdEmployeeId}
            onChange={(event) => { setHrdEmployeeId(event.target.value); setError(''); }}
            options={hrdOptions}
            placeholder={hrdOptions.length > 0 ? 'Pilih HRD...' : 'Belum ada HRD tersedia'}
            disabled={saving || hrdOptions.length === 0}
          />
        </div>

        {error && <p className="overtime-approver-error" role="alert">{error}</p>}
        <footer className="overtime-approver-modal__actions">
          <button type="button" className="overtime-approver-button overtime-approver-button--secondary" onClick={onClose} disabled={saving}>Batal</button>
          <button type="submit" className="overtime-approver-button overtime-approver-button--primary" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Nama Approval'}
          </button>
        </footer>
      </form>
    </div>
  );
}
