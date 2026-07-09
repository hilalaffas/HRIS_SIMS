ALTER TABLE activity_logs
DROP CONSTRAINT activity_logs_user_id_fkey;

ALTER TABLE activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE SET NULL;