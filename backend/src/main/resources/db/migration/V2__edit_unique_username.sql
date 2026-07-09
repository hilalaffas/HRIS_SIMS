ALTER TABLE roles ADD CONSTRAINT roles_nama_role_unique UNIQUE (nama_role); 
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);