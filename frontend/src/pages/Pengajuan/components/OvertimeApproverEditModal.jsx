import React, { useState } from 'react';
import { X } from 'lucide-react';
import OvertimeApproverFields from './OvertimeApproverFields';
import { buildApproverPayload } from '../../../services/overtimeService';
import { describeStages, STAGE_FIELD, STAGE_META } from '../../../constants/overtimeFlow';
import './OvertimeApproverEditModal.css';

// Melengkapi nama approver untuk pengajuan lembur yang belum punya approver
// (mis. lembur tambahan saat check-out). [UBAH] Tahap yang diisi mengikuti jabatan pemohon
// (requiredStages), sama seperti formulir Lembur -- bukan lagi hanya satu nama HRD.
export default function OvertimeApproverEditModal({
  record, approvers = {}, requiredStages = ['HRD'], selfEmployeeId = null, onClose, onSubmit,
}) {
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const errors = {};
    requiredStages.forEach((stage) => {
      if (!values[STAGE_FIELD[stage]]) errors[STAGE_FIELD[stage]] = `Approver ${STAGE_META[stage].label} perlu diisi.`;
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(buildApproverPayload(requiredStages, values));
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
            <p>Pengajuan lembur {record?.date || ''} belum memiliki nama approver. Alur: {describeStages(requiredStages)}.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Tutup"><X /></button>
        </header>

        <div className="overtime-approver-field">
          <OvertimeApproverFields
            stages={requiredStages}
            values={values}
            errors={fieldErrors}
            approvers={approvers}
            selfEmployeeId={selfEmployeeId}
            disabled={saving}
            idPrefix="overtime-approver-edit"
            onChange={handleChange}
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
