-- [BARU] Bersihkan notifikasi ganda akibat bug di LeaveService.processApprovalAction():
-- saat cuti DIKEMBALIKAN / DITOLAK, pemohon ikut menerima notifikasi "step-approved"
-- ("telah disetujui oleh <approver>") yang dibuat beberapa detik setelah notifikasi
-- "returned" / "rejected" untuk pengajuan yang sama. Notifikasi step-approved yang sah
-- (tahap sebelumnya benar-benar ACC) dibuat jauh lebih awal sehingga tidak ikut terhapus.
DELETE FROM notifications s
WHERE s.type = 'step-approved'
  AND EXISTS (
      SELECT 1
      FROM notifications f
      WHERE f.user_id = s.user_id
        AND f.reference_id = s.reference_id
        AND f.type IN ('returned', 'rejected')
        AND s.created_at >= f.created_at
        AND s.created_at <= f.created_at + INTERVAL '5 seconds'
  );
