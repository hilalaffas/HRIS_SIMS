import React, { useId } from 'react';
import DatePickerField from '../../../components/DatePickerField';
import { calendarEndDate, MAX_SICK_CALENDAR_DAYS } from '../../../utils/sickDates';
import './PermissionRequestModal.css';
import './SickDateFields.css';
export default function SickDateFields({ dates, documentLater, earlyCheckout = false, disabled = false, hint }) {
  const id = useId();
  return <div className="sick-period">
    <div className="sick-period-dates">
      <div><span className="abs-permission-label">Dari Tanggal</span><DatePickerField value={dates.startDate} onChange={dates.changeStartDate} disabled={disabled || documentLater || earlyCheckout} ariaLabel="Dari tanggal sakit" /></div>
      <div><span className="abs-permission-label">Sampai Tanggal</span><DatePickerField value={dates.endDate} onChange={dates.changeEndDate} minDate={dates.startDate} maxDate={calendarEndDate(dates.startDate, MAX_SICK_CALENDAR_DAYS)} disabled={disabled || documentLater || earlyCheckout} ariaLabel="Sampai tanggal sakit" /></div>
    </div>
    <div className="sick-period-duration"><label htmlFor={id}>Lama Izin Sakit</label>
      <input id={id} type="number" min={earlyCheckout ? '0.5' : '1'} max={earlyCheckout ? 1 : MAX_SICK_CALENDAR_DAYS} step={earlyCheckout ? '0.5' : '1'} inputMode={earlyCheckout ? 'decimal' : 'numeric'} value={dates.days} onChange={(event) => dates.changeDays(event.target.value)} disabled={disabled || (documentLater && !earlyCheckout)} />
      <span>hari kalender</span>
    </div>
    <p className="abs-permission-hint">{hint || (earlyCheckout ? 'Pulang cepat memakai tanggal hari ini, durasi 0,5 atau 1 hari.' : documentLater ? 'Surat dokter menyusul: tanggal dikunci hari ini (WIB), durasi 1 hari.' : 'Durasi surat dokter dihitung dalam hari kalender. Absensi dan laporan sakit hanya menghitung hari kerja sesuai jadwal.')}</p>
  </div>;
}
