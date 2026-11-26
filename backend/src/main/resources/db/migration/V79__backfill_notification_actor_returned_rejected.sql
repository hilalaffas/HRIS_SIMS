-- [BARU] Notifikasi "dikembalikan" / "ditolak" kini menyebut siapa yang memprosesnya
-- (params.actorRole + params.actorName, sama seperti notifikasi "disetujui oleh ...").
-- Notifikasi lama belum punya data itu, jadi diisi dari tabel approval:
--   * hanya baris approval yang tindakannya sama (RETURNED/REJECTED) dan terjadi di waktu
--     yang sama dengan notifikasinya (selisih maks. 1 menit), supaya pengajuan yang pernah
--     dikembalikan lalu diajukan ulang tidak salah mengambil nama approver yang baru;
--   * notifikasi yang sudah punya actorName dilewati (aman dijalankan ulang).
UPDATE notifications n
SET params = (
        COALESCE(NULLIF(n.params, ''), '{}')::jsonb
        || jsonb_build_object('actorRole', a.approver_role, 'actorName', e.full_name)
    )::text
FROM leave_request_approvals a
JOIN employees e ON e.employee_id = a.approver_employee_id
WHERE n.type IN ('returned', 'rejected')
  AND n.reference_id = a.leave_request_id
  AND a.action = CASE n.type WHEN 'returned' THEN 'RETURNED' ELSE 'REJECTED' END
  AND a.acted_at IS NOT NULL
  AND a.acted_at BETWEEN n.created_at - INTERVAL '1 minute' AND n.created_at + INTERVAL '1 minute'
  AND e.full_name IS NOT NULL
  AND (COALESCE(NULLIF(n.params, ''), '{}')::jsonb -> 'actorName') IS NULL;
