INSERT INTO shifts (code, name, start_time, end_time, display_order)
VALUES ('SHIFT_3', 'Shift 3 (Malam)', '00:00', '08:00', 3)
ON CONFLICT (code) DO NOTHING;
