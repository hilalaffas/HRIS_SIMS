// src/components/NotifLeaveDetailModal.jsx
// [BARU] Popup "Informasi Detail Berkas Cuti" yang dibuka LANGSUNG dari notifikasi lonceng
// di halaman mana pun (Navbar ada di semua halaman), tanpa pindah ke halaman cuti lama.
//
// - mode 'mine'     : pemohon melihat berkasnya sendiri (disetujui / ditolak / dikembalikan / progres)
// - mode 'approval' : atasan melihat berkas yang perlu diproses; footer punya tombol opsional
//                     "Buka Pusat Persetujuan" untuk benar-benar memproses (itu pilihan eksplisit
//                     pengguna, bukan perilaku klik notifikasinya).
// Popup tampil seketika memakai data dari notifikasi, lalu terisi lengkap setelah detail dimuat.
//
// Contoh pemakaian:
// <NotifLeaveDetailModal target={{ id, mode, type, params }} onClose={fn} onOpenApproval={fn} />
import React, { useEffect, useMemo, useState } from 'react';
import FormCuti from '../pages/Cuti/approve/components/Form';
import NotifModal from '../pages/Cuti/applycuti/components/NotifModal';
import { getApprovalDetail, getMyLeaveDetail, mapApproval } from '../services/CutiService';
import useI18n from '../i18n/useI18n';

const STATUS_BY_TYPE = { approved: 'DISETUJUI', rejected: 'DITOLAK', returned: 'DIKEMBALIKAN' };
const FINAL_STATUS = ['DISETUJUI', 'DITOLAK', 'DIKEMBALIKAN'];
const SHORT_DATE = { day: 'numeric', month: 'short', year: 'numeric' };

export default function NotifLeaveDetailModal({ target, onClose, onOpenApproval }) {
  const { formatDate } = useI18n();
  // Hasil dikunci ke permintaannya (key) supaya tidak perlu reset state di dalam effect.
  const [result, setResult] = useState({ key: '', detail: null, error: '' });

  const targetId = target?.id;
  const mode = target?.mode;
  const requestKey = targetId ? `${mode}:${targetId}` : '';
  const { detail, error } = result.key === requestKey ? result : { detail: null, error: '' };

  // Data sementara dari notifikasi supaya popup langsung tampil (tidak menunggu jaringan).
  const placeholder = useMemo(() => {
    if (!target) return null;
    const params = target.params || {};
    const start = params.startDate ? formatDate(`${params.startDate}T00:00:00`, SHORT_DATE) : '';
    const end = params.endDate ? formatDate(`${params.endDate}T00:00:00`, SHORT_DATE) : '';
    return {
      id: target.id,
      karyawan: { nama: params.requesterName || '' },
      jenisCuti: params.leaveType || 'Cuti',
      durasi: start && end ? `${start} - ${end}` : '-',
      keterangan: '-',
      pekerjaanTertunda: '-',
      dicoverOleh: '-',
      statusBerkas: STATUS_BY_TYPE[target.type] || 'PROSES',
      approvalChain: {},
      approvalSteps: [],
      riwayatLog: [],
    };
  }, [target, formatDate]);

  useEffect(() => {
    if (!requestKey) return undefined;
    let cancelled = false;

    const request = mode === 'approval'
      ? getApprovalDetail(targetId)
      : getMyLeaveDetail(targetId, { silent: true }).then((raw) => mapApproval(raw));

    request
      .then((loaded) => { if (!cancelled) setResult({ key: requestKey, detail: loaded, error: '' }); })
      .catch((err) => {
        if (!cancelled) setResult({ key: requestKey, detail: null, error: err.message || 'Detail cuti tidak dapat dimuat.' });
      });

    return () => { cancelled = true; };
  }, [requestKey, targetId, mode]);

  if (!target) return null;

  // Berkas sudah dihapus / tidak dapat diakses: tampilkan pesan, bukan popup kosong.
  if (error) {
    return <NotifModal type="error" message={error} onClose={onClose} />;
  }

  const data = detail || placeholder;
  const canProcess = mode === 'approval' && onOpenApproval
    && detail && !FINAL_STATUS.includes(detail.statusBerkas);

  return (
    <FormCuti
      data={data}
      onClose={onClose}
      extraAction={canProcess ? { label: 'Buka Pusat Persetujuan', onClick: () => onOpenApproval(targetId) } : null}
    />
  );
}
