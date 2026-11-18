import { medicalDocumentStatus } from './medicalDocumentStatus';

// One presentation status across HRD and employee screens; API approval codes stay separate.
export function sickApprovalStatus(record, document = medicalDocumentStatus(record)) {
  const status = record.approvalStatus || 'PENDING';
  if (document.code === 'EXPIRED') return { code: 'EXPIRED', label: 'Batas Surat Terlewati', tone: 'danger', tableTone: 'rose', condition: 'Kewajiban surat melewati tenggat periode absensi.', nextAction: 'Absensi hari kerja dihitung Tanpa Keterangan.' };
  if (status === 'REJECTED') return { code: 'REJECTED', label: 'Ditolak', tone: 'danger', tableTone: 'rose', condition: 'Pengajuan izin ditolak HRD.', nextAction: 'Perbaiki surat dan ajukan ulang sebelum tenggat.' };
  if (status === 'NOT_REQUIRED') return { code: 'RECORDED', label: 'Tercatat', tone: 'success', tableTone: 'green', condition: 'Pemberitahuan izin sudah tercatat.', nextAction: 'Tidak memerlukan persetujuan.' };
  if (status !== 'APPROVED') return { code: 'PENDING', label: 'Menunggu ACC', tone: 'warning', tableTone: 'orange', condition: 'Pengajuan menunggu keputusan awal HRD.', nextAction: 'HRD melakukan ACC izin awal.' };
  if (!record.documentRequired || document.code === 'VALID') return { code: 'COMPLETE', label: 'Disetujui', tone: 'success', tableTone: 'green', condition: record.reason === 'IZIN' || record.reasonCode === 'IZIN' ? 'Izin terlambat dan bukti disetujui HRD.' : 'Izin dan surat dokter valid.', nextAction: 'Proses selesai dan masuk rekap.' };
  if (document.code === 'REJECTED') return { code: 'REVISION', label: 'Revisi Surat', tone: 'danger', tableTone: 'rose', condition: 'Lampiran ditolak HRD.', nextAction: 'Karyawan wajib upload ulang surat sebelum tenggat.' };
  if (record.documentUrl) return { code: 'VERIFICATION', label: 'Verifikasi Surat', tone: 'purple', tableTone: 'purple', condition: 'Surat dokter sudah diunggah.', nextAction: 'HRD memeriksa keabsahan lampiran dan periode sakit.' };
  return { code: 'INCOMPLETE', label: 'Disetujui (Belum Lengkap)', tone: 'info', tableTone: 'blue', condition: 'Izin ACC, surat belum diunggah.', nextAction: 'Karyawan unggah surat setelah berobat, sebelum tenggat.' };
}
