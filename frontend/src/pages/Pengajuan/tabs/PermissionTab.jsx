// src/pages/Pengajuan/tabs/PermissionTab.jsx
//
// Tab "Sakit & Izin": formulir inline (Izin Sakit / Izin Terlambat) + riwayat
// sakit & izin saja. Alurnya sama dengan popup lama di halaman Absensi:
// Sakit butuh surat dokter (boleh menyusul), Terlambat cukup keterangan.
// Pengiriman ke backend dilakukan parent lewat `onSubmit(payload)`.
//
// Contoh pemakaian:
// <PermissionTab onSubmit={fn} historyItems={items} loading={false}
//   onSelectStatus={fn} onAction={fn} />
import React from 'react';
import { FilePenLine } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import MedicalDocumentDropzone from '../../Absensi/components/MedicalDocumentDropzone';
import PengajuanFormCard, { FieldError } from '../components/PengajuanFormCard';
import PengajuanHistoryTable from '../components/PengajuanHistoryTable';
import usePermissionForm, { MAX_SICK_DAYS, PERMISSION_NOTE_MAX_LENGTH } from '../hooks/usePermissionForm';
import { inputErrorClass } from '../../../utils/validation';

const TYPE_OPTIONS = [
  { value: 'SAKIT', label: 'Izin Sakit (Butuh Surat Sakit Dokter)' },
  { value: 'TERLAMBAT', label: 'Izin Terlambat (Kendala Tak Terduga)' },
];

export default function PermissionTab({ onSubmit, historyItems, loading, onSelectStatus, onAction }) {
  const form = usePermissionForm(onSubmit);
  const { fieldErrors } = form;

  return (
    <>
      <PengajuanFormCard
        icon={FilePenLine}
        title="Formulir Pengajuan Sakit & Izin"
        subtitle="Laporkan sakit atau keterlambatan Anda; atasan akan memprosesnya secara berjenjang."
        onSubmit={form.handleSubmit}
        isSubmitting={form.isSubmitting}
        errorMessage={form.errorMessage}
      >
        <div className="form-group">
          <label className="form-label" htmlFor="pgj-permission-type">JENIS IZIN *</label>
          <Dropdown
            id="pgj-permission-type"
            name="permissionType"
            value={form.type}
            onChange={(event) => form.changeType(event.target.value)}
            options={TYPE_OPTIONS}
            disabled={form.isSubmitting}
            ariaLabel="Pilihan jenis izin"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pgj-permission-note">KETERANGAN / ALASAN *</label>
          <textarea
            id="pgj-permission-note"
            rows={3}
            maxLength={PERMISSION_NOTE_MAX_LENGTH}
            value={form.note}
            onChange={(event) => form.changeNote(event.target.value)}
            placeholder={form.isSick ? 'Jelaskan kondisi / keluhan sakit Anda...' : 'Jelaskan kendala yang membuat Anda terlambat...'}
            disabled={form.isSubmitting}
            className={inputErrorClass(fieldErrors.note, 'form-control textarea-control')}
          />
          <FieldError message={fieldErrors.note} />
        </div>

        {form.isSick && (
          <div className="form-group">
            <span className="form-label">SURAT DOKTER (BUKTI SAKIT) *</span>
            <MedicalDocumentDropzone
              file={form.documentFile}
              onChange={form.changeDocumentFile}
              onError={form.setErrorMessage}
              disabled={form.isSubmitting || form.documentLater}
            />
            <FieldError message={fieldErrors.documentFile} />

            <div className="pgj-inline-options">
              <label className="pgj-check">
                <input
                  type="checkbox"
                  checked={form.documentLater}
                  onChange={(event) => form.changeDocumentLater(event.target.checked)}
                  disabled={form.isSubmitting}
                />
                Surat dokter menyusul
              </label>
              <div className="pgj-days">
                <label htmlFor="pgj-permission-days">Lama izin sakit</label>
                <input
                  id="pgj-permission-days"
                  type="number"
                  min="1"
                  max={MAX_SICK_DAYS}
                  step="1"
                  inputMode="numeric"
                  value={form.days}
                  onChange={(event) => form.changeDays(event.target.value)}
                  disabled={form.isSubmitting || form.documentLater}
                  className={inputErrorClass(fieldErrors.days, 'form-control')}
                />
                <span>hari kerja</span>
              </div>
            </div>
            <FieldError message={fieldErrors.days} />

            {form.documentLater && (
              <p className="pgj-hint">
                Lama izin dikunci 1 hari selama surat dokter menyusul. Lampirkan surat sekarang bila izin lebih dari 1 hari.
              </p>
            )}
            <p className="pgj-hint">
              Lama izin dihitung dalam hari kerja (Sabtu &amp; Minggu tidak dihitung). Surat dokter tetap wajib diunggah;
              bila menyusul, unggah lewat tombol &quot;Upload Surat&quot; pada riwayat di bawah.
            </p>
          </div>
        )}
      </PengajuanFormCard>

      <PengajuanHistoryTable
        title="Riwayat Sakit & Izin Saya"
        emptyMessage="Belum ada pengajuan sakit atau izin."
        items={historyItems}
        loading={loading}
        selectedKey={null}
        resetKey="permission"
        onSelectStatus={onSelectStatus}
        onAction={onAction}
      />
    </>
  );
}
