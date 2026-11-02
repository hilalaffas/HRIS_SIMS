import React, { useState } from 'react';
import { X } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import './OvertimeApproverEditModal.css';

export default function OvertimeApproverEditModal({ record, approvers = {}, requesterRole = 'MEMBER', requesterEmployeeId = null, onClose, onSubmit }) {
  const role = String(requesterRole || 'MEMBER').toUpperCase().replace(/^ROLE_/, '');
  const isLeader = role === 'LEADER';
  const isSpv = role === 'SPV' || role === 'SUPERVISOR';
  const isManager = role === 'MANAGER';
  const isLeadership = isLeader || isSpv || isManager;
  const [values, setValues] = useState({ leaderEmployeeId: isLeader && requesterEmployeeId ? String(requesterEmployeeId) : '', spvEmployeeId: isSpv && requesterEmployeeId ? String(requesterEmployeeId) : '', managerEmployeeId: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!values.managerEmployeeId || (!isLeadership && (!values.leaderEmployeeId || !values.spvEmployeeId)) || (isLeader && !values.spvEmployeeId)) {
      setError(isLeader ? 'Nama SPV dan Manager wajib dipilih.' : isLeadership ? 'Nama Manager wajib dipilih.' : 'Nama Leader, SPV, dan Manager wajib dipilih.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        leaderEmployeeId: isLeadership || !values.leaderEmployeeId ? null : Number(values.leaderEmployeeId),
        spvEmployeeId: isSpv || !values.spvEmployeeId ? null : Number(values.spvEmployeeId),
        managerEmployeeId: Number(values.managerEmployeeId),
      });
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan nama approval.');
      setSaving(false);
    }
  };

  const options = (role) => (approvers[role] || []).map((person) => ({
    value: String(person.employeeId),
    label: person.fullName,
  }));

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

        {!isLeadership && <div className="overtime-approver-field">
          <label>Leader *</label>
          <Dropdown name="leaderEmployeeId" value={values.leaderEmployeeId} onChange={update}
            options={options('LEADER')} placeholder="Pilih Leader..." disabled={saving} />
        </div>}
        {!isSpv && !isManager && <div className="overtime-approver-field">
          <label>SPV *</label>
          <Dropdown name="spvEmployeeId" value={values.spvEmployeeId} onChange={update}
            options={options('SPV')} placeholder="Pilih SPV..." disabled={saving} />
        </div>}
        <div className="overtime-approver-field">
          <label>Manager *</label>
          <Dropdown name="managerEmployeeId" value={values.managerEmployeeId} onChange={update}
            options={options('MANAGER')} placeholder="Pilih Manager..." disabled={saving} />
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
