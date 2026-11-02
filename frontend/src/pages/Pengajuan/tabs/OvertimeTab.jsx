// src/pages/Pengajuan/tabs/OvertimeTab.jsx
//
// Tab "Lembur": formulir inline (tanggal, jam mulai/selesai, alasan) + riwayat
// lembur saja. Alurnya sama dengan popup lama di halaman Lembur; total jam
// dihitung otomatis. Pengiriman dilakukan parent lewat `onSubmit(values)`.
//
// Contoh pemakaian:
// <OvertimeTab onSubmit={fn} historyItems={items} loading={false}
//   onSelectStatus={fn} onAction={fn} />
import React from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import PengajuanFormCard, { FieldError } from '../components/PengajuanFormCard';
import PengajuanHistoryTable from '../components/PengajuanHistoryTable';
import useOvertimeForm, { OVERTIME_REASON_MAX_LENGTH } from '../hooks/useOvertimeForm';
import { inputErrorClass, dropdownErrorClass } from '../../../utils/validation';
import Dropdown from '../../../components/Dropdown';
import '../../Cuti/applycuti/components/LeaveForm.css';

export default function OvertimeTab({ onSubmit, historyItems, loading, onSelectStatus, onAction, approvers = { LEADER: [], SPV: [], MANAGER: [] }, requesterRole = 'MEMBER', requesterEmployeeId = null }) {
  const role = String(requesterRole || 'MEMBER').toUpperCase().replace(/^ROLE_/, '');
  const isLeader = role === 'LEADER';
  const isSpv = role === 'SPV' || role === 'SUPERVISOR';
  const isManager = role === 'MANAGER';
  const { form, fieldErrors, ...overtime } = useOvertimeForm(onSubmit, { requesterRole: role, requesterEmployeeId });

  return (
    <>
      <PengajuanFormCard
        icon={BriefcaseBusiness}
        title="Formulir Pengajuan Lembur"
        subtitle="Pengajuan lembur diproses secara berjenjang oleh atasan Anda."
        onSubmit={overtime.handleSubmit}
        isSubmitting={overtime.isSubmitting}
        errorMessage={overtime.errorMessage}
      >
        <div className="form-row">
          <div className="flex-1">
            <label className="form-label" htmlFor="pgj-overtime-date">TANGGAL LEMBUR *</label>
            <input
              id="pgj-overtime-date"
              type="date"
              name="overtimeDate"
              value={form.overtimeDate}
              max={overtime.todayKey}
              onChange={overtime.updateField}
              disabled={overtime.isSubmitting}
              className={inputErrorClass(fieldErrors.overtimeDate, 'form-control')}
            />
            <FieldError message={fieldErrors.overtimeDate} />
          </div>
          <div className="flex-1">
            <label className="form-label" htmlFor="pgj-overtime-start">JAM MULAI *</label>
            <input
              id="pgj-overtime-start"
              type="time"
              name="startTime"
              value={form.startTime}
              onChange={overtime.updateField}
              disabled={overtime.isSubmitting}
              className={inputErrorClass(fieldErrors.startTime, 'form-control')}
            />
            <FieldError message={fieldErrors.startTime} />
          </div>
          <div className="flex-1">
            <label className="form-label" htmlFor="pgj-overtime-end">JAM SELESAI *</label>
            <input
              id="pgj-overtime-end"
              type="time"
              name="endTime"
              value={form.endTime}
              onChange={overtime.updateField}
              disabled={overtime.isSubmitting}
              className={inputErrorClass(fieldErrors.endTime, 'form-control')}
            />
            <FieldError message={fieldErrors.endTime} />
          </div>
        </div>

        <div
          className={`duration-info-alert${overtime.hasValidRange ? '' : ' duration-info-alert--warning'}`}
          aria-live="polite"
        >
          Total jam lembur:&nbsp;<strong>{overtime.totalLabel}</strong>
        </div>

        <div className="form-group form-group--approval">
          <label className="form-label">PILIH ALUR APPROVAL LEMBUR *</label>
          <div className="approval-row">
            <div className="approval-col">
              <span className="badge-approval leader">Leader</span>
              <Dropdown
                name="leaderEmployeeId"
                value={form.leaderEmployeeId}
                onChange={overtime.updateField}
                options={(approvers.LEADER || []).map((person) => ({ value: String(person.employeeId), label: person.fullName }))}
                placeholder={isLeader ? 'Anda (Leader)' : isSpv || isManager ? 'Tidak diperlukan' : 'Pilih Leader...'}
                disabled={isLeader || isSpv || isManager || overtime.isSubmitting}
                className={dropdownErrorClass(Boolean(fieldErrors.leaderEmployeeId))}
              />
              <FieldError message={fieldErrors.leaderEmployeeId} />
            </div>
            <div className="approval-col">
              <span className="badge-approval spv">SPV</span>
              <Dropdown
                name="spvEmployeeId"
                value={form.spvEmployeeId}
                onChange={overtime.updateField}
                options={(approvers.SPV || []).map((person) => ({ value: String(person.employeeId), label: person.fullName }))}
                placeholder={isSpv ? 'Anda (SPV)' : isManager ? 'Tidak diperlukan' : 'Pilih SPV...'}
                disabled={isSpv || isManager || overtime.isSubmitting}
                className={dropdownErrorClass(Boolean(fieldErrors.spvEmployeeId))}
              />
              <FieldError message={fieldErrors.spvEmployeeId} />
            </div>
            <div className="approval-col">
              <span className="badge-approval manager">Manager</span>
              <Dropdown
                name="managerEmployeeId"
                value={form.managerEmployeeId}
                onChange={overtime.updateField}
                options={(approvers.MANAGER || []).map((person) => ({ value: String(person.employeeId), label: person.fullName }))}
                placeholder="Pilih Manager..."
                disabled={overtime.isSubmitting}
                className={dropdownErrorClass(Boolean(fieldErrors.managerEmployeeId))}
              />
              <FieldError message={fieldErrors.managerEmployeeId} />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pgj-overtime-reason">ALASAN / PEKERJAAN LEMBUR *</label>
          <textarea
            id="pgj-overtime-reason"
            rows={2}
            name="reason"
            maxLength={OVERTIME_REASON_MAX_LENGTH}
            placeholder="Contoh: Maintenance server & backup database"
            value={form.reason}
            onChange={overtime.updateField}
            disabled={overtime.isSubmitting}
            className={inputErrorClass(fieldErrors.reason, 'form-control textarea-control')}
          />
          <FieldError message={fieldErrors.reason} />
          <p className="pgj-char-count">{form.reason.length}/{OVERTIME_REASON_MAX_LENGTH}</p>
        </div>
      </PengajuanFormCard>

      <PengajuanHistoryTable
        title="Riwayat Lembur Saya"
        emptyMessage="Belum ada pengajuan lembur."
        items={historyItems}
        loading={loading}
        selectedKey={null}
        resetKey="overtime"
        onSelectStatus={onSelectStatus}
        onAction={onAction}
      />
    </>
  );
}
