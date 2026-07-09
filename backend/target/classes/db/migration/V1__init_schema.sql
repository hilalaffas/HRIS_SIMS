CREATE TABLE roles (
    id_role BIGSERIAL PRIMARY KEY,
    nama_role VARCHAR(50) NOT NULL
);

CREATE TABLE users (
    id_user BIGSERIAL PRIMARY KEY,
    id_role BIGINT NOT NULL REFERENCES roles(id_role),
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255)
);

CREATE TABLE karyawan (
    id_karyawan BIGSERIAL PRIMARY KEY,
    id_user BIGINT NOT NULL REFERENCES users(id_user),
    nama_karyawan VARCHAR(150) NOT NULL,
    alamat VARCHAR(255),
    nomer_handphone VARCHAR(20),
    jenis_kelamin BPCHAR(1) NOT NULL,
    tanggal_masuk DATE,
    status BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE jenis_cuti (
    id_jenis BIGSERIAL PRIMARY KEY,
    nama_jenis VARCHAR(100) NOT NULL,
    quota_male INTEGER NOT NULL DEFAULT 0,
    quota_female INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE status_cuti (
    id_status BIGSERIAL PRIMARY KEY,
    nama_status VARCHAR(50) NOT NULL
);

CREATE TABLE cuti (
    id_cuti BIGSERIAL PRIMARY KEY,
    id_karyawan BIGINT NOT NULL REFERENCES karyawan(id_karyawan),
    id_status BIGINT NOT NULL REFERENCES status_cuti(id_status),
    id_jenis BIGINT NOT NULL REFERENCES jenis_cuti(id_jenis),
    reviewed_by BIGINT REFERENCES karyawan(id_karyawan),
    start_tanggal DATE NOT NULL,
    end_tanggal DATE NOT NULL,
    jumlah_hari INTEGER NOT NULL,
    tanggal_pengajuan TIMESTAMP NOT NULL,
    tanggal_persetujuan TIMESTAMP,
    tanggal_pengembalian TIMESTAMP
);