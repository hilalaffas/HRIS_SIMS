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
import React, { useMemo } from 'react'; // [UBAH] + useMemo
import Dropdown from '../../../components/Dropdown';
import { FieldError } from './PengajuanFormCard';
import { dropdownErrorClass } from '../../../utils/validation';
import { NO_APPROVER_VALUE, OPTIONAL_STAGES, STAGE_FIELD, STAGE_META, describeStages } from '../../../constants/overtimeFlow'; // [UBAH]
import '../../Cuti/applycuti/components/LeaveForm.css';
import './OvertimeApproverFields.css';

const BADGE_CLASS = { LEADER: 'leader', SPV: 'spv', MANAGER: 'manager', HRD: 'hrd' };
const SEARCHABLE_MIN_OPTIONS = 8; // [BARU]

export default function OvertimeApproverFields({
  stages,
  values,
  errors = {},
  approvers = {},
  selfEmployeeId = null,
  disabled = false,
  idPrefix = 'overtime-approver',
  title = 'PILIH ALUR APPROVAL LEMBUR *',
  onChange,
}) {
  const isSingle = stages.length === 1;
  const stagesKey = stages.join('|');
  // [BARU] Opsi tiap tahap dihitung SEKALI per perubahan data approver (bukan tiap ketikan di form induk),
  // dan referensinya stabil sehingga Dropdown tidak menghitung ulang daftar opsinya.
  // Pemohon tidak boleh memilih dirinya sendiri (mis. Manager memilih Manager lain) -- server mengecek ulang.
  const optionsByStage = useMemo(() => Object.fromEntries(stagesKey.split('|').filter(Boolean).map((stage) => {
    const people = (approvers[stage] || [])
      .filter((person) => String(person.employeeId) !== String(selfEmployeeId))
      // [UBAH] Manager dari divisi lain diberi nama divisinya.
      .map((person) => ({
        value: String(person.employeeId),
        label: person.crossDivision && person.namaDivisi ? `${person.fullName} — ${person.namaDivisi}` : person.fullName,
      }));
    // [BARU] Leader & SPV boleh dikosongkan: pilihan "-" selalu ada di urutan paling atas.
    return [stage, OPTIONAL_STAGES.includes(stage) ? [{ value: NO_APPROVER_VALUE, label: '-' }, ...people] : people];
  })), [approvers, selfEmployeeId, stagesKey]);
  const optionsWithSkip = (stage) => optionsByStage[stage] || [];

  // [UBAH] Tahap opsional tidak pernah "kosong" (masih bisa memilih "-").
  const emptyStages = stages.filter((stage) => optionsWithSkip(stage).length === 0);
  // [BARU] Tahap yang dipilih "-" dibuang dari ringkasan alur.
  const activeStages = stages.filter((stage) => values[STAGE_FIELD[stage]] !== NO_APPROVER_VALUE);
  const optionalLabels = stages.filter((stage) => OPTIONAL_STAGES.includes(stage)).map((stage) => STAGE_META[stage].label);
  const optionalNote = optionalLabels.length > 0 ? ` Pilih "-" untuk melewati ${optionalLabels.join(' / ')} yang tidak ada.` : '';
  const hint = emptyStages.length > 0
    ? `Belum ada ${emptyStages.map((stage) => STAGE_META[stage].label).join(' / ')} lain yang dapat dipilih. Hubungi Super Admin.`
    : `Alur persetujuan: ${describeStages(activeStages)}.${optionalNote}`;

  return (
    <div className="form-group form-group--approval">
      <label className="form-label">{title}</label>
      <div className={`approval-row approval-row--${isSingle ? 'single' : `count-${stages.length}`}`}>
        {stages.map((stage) => {
          const field = STAGE_FIELD[stage];
          const options = optionsWithSkip(stage); // [UBAH] sebelumnya optionsFor(stage)
          return (
            <div className="approval-col" key={stage}>
              <span className={`badge-approval ${BADGE_CLASS[stage]}`}>{STAGE_META[stage].label}</span>
              <Dropdown
                id={`${idPrefix}-${BADGE_CLASS[stage]}`}
                name={field}
                value={values[field] || ''}
                onChange={onChange}
                options={options}
                searchable={options.length > SEARCHABLE_MIN_OPTIONS} // [BARU] daftar panjang (mis. Manager semua divisi) bisa dicari
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
