// src/pages/Pengajuan/components/OvertimeApproverFields.jsx
//
// Dropdown approver lembur berjenjang -- dipakai formulir Lembur (OvertimeTab) dan popup
// "Lengkapi Nama Approval" (OvertimeApproverEditModal) supaya tampilannya satu sumber.
// Tahap yang tampil mengikuti jabatan pemohon (constants/overtimeFlow.js: getRequiredStages):
//   HRD -> HRD | Member -> Leader, SPV, Manager | Leader -> SPV, Manager | SPV / Manager -> Manager
//
// Contoh pemakaian:
// <OvertimeApproverFields stages={['SPV', 'MANAGER']} values={form} errors={fieldErrors}
//   approvers={approvers} selfEmployeeId={user.employeeId} onChange={updateField} />
import React from 'react';
import Dropdown from '../../../components/Dropdown';
import { FieldError } from './PengajuanFormCard';
import { dropdownErrorClass } from '../../../utils/validation';
import { STAGE_FIELD, STAGE_META, describeStages } from '../../../constants/overtimeFlow';
import '../../Cuti/applycuti/components/LeaveForm.css';
import './OvertimeApproverFields.css';

const BADGE_CLASS = { LEADER: 'leader', SPV: 'spv', MANAGER: 'manager', HRD: 'hrd' };

export default function OvertimeApproverFields({
  stages,
  values,
  errors = {},
  approvers = {},
  selfEmployeeId = null,
  disabled = false,
  idPrefix = 'overtime-approver',
  onChange,
}) {
  const isSingle = stages.length === 1;
  // Pemohon tidak boleh memilih dirinya sendiri (mis. Manager memilih Manager lain) -- server mengecek ulang.
  const optionsFor = (stage) => (approvers[stage] || [])
    .filter((person) => String(person.employeeId) !== String(selfEmployeeId))
    .map((person) => ({ value: String(person.employeeId), label: person.fullName }));

  const emptyStages = stages.filter((stage) => optionsFor(stage).length === 0);
  const hint = emptyStages.length > 0
    ? `Belum ada ${emptyStages.map((stage) => STAGE_META[stage].label).join(' / ')} lain yang dapat dipilih. Hubungi Super Admin.`
    : `Alur persetujuan: ${describeStages(stages)}.`;

  return (
    <div className="form-group form-group--approval">
      <label className="form-label">PILIH ALUR APPROVAL LEMBUR *</label>
      <div className={`approval-row approval-row--${isSingle ? 'single' : `count-${stages.length}`}`}>
        {stages.map((stage) => {
          const field = STAGE_FIELD[stage];
          const options = optionsFor(stage);
          return (
            <div className="approval-col" key={stage}>
              <span className={`badge-approval ${BADGE_CLASS[stage]}`}>{STAGE_META[stage].label}</span>
              <Dropdown
                id={`${idPrefix}-${BADGE_CLASS[stage]}`}
                name={field}
                value={values[field] || ''}
                onChange={onChange}
                options={options}
                placeholder={options.length > 0 ? 'Pilih...' : `Belum ada ${STAGE_META[stage].label} tersedia`}
                disabled={options.length === 0 || disabled}
                className={dropdownErrorClass(Boolean(errors[field]))}
              />
              <FieldError message={errors[field]} />
            </div>
          );
        })}
        <p className={`approval-hint${emptyStages.length > 0 ? ' approval-hint--warning' : ''}`} role={emptyStages.length > 0 ? 'alert' : undefined}>
          {hint}
        </p>
      </div>
    </div>
  );
}
