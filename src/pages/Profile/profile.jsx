import React, { useState, useEffect, useRef } from 'react';
import './profile.css';

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false); // State penentu Mode Baca vs Mode Edit
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null); // Menyimpan file/URL pratinjau gambar
  const fileInputRef = useRef(null); // Reference untuk trigger input file tersembunyi
  
  // State untuk menampung data profil dari database
  const [formData, setFormData] = useState({
    namaLengkap: '',
    nikKaryawan: '',
    jabatan: '',
    alamatLengkap: '',
    email: '',
    nomorTelepon: '',
    divisi: '',
    tanggalBergabung: ''
  });

  // Ambil data dari database saat halaman dibuka
  useEffect(() => {
    // Simulasi Fetch API dari Database
    const mockDataFromDB = {
      namaLengkap: "Andi Santoso",
      nikKaryawan: "SYS-2026-0042",
      jabatan: "Senior Software Engineer",
      alamatLengkap: "Jl. Jenderal Sudirman No. 58, Jakarta Selatan, DKI Jakarta",
      email: "andi.member@sysindonesia.co.id",
      nomorTelepon: "+62 812-3456-7890",
      divisi: "Technology & Innovation",
      tanggalBergabung: "12 Maret 2021"
    };
    setFormData(mockDataFromDB);
    
    // 2. Cek apakah ada foto profil yang tersimpan di Local Storage
    const savedImage = localStorage.getItem('user_profile_image');
    if (savedImage) {
      setProfileImage(savedImage);
    }

    setLoading(false);
  }, []);

  // Fungsi menangani perubahan ketikan di kolom input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

    // Fungsi menangani input berkas foto dari komputer/perangkat lokal
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      
      // Membaca file dan mengubahnya menjadi string Base64 agar bisa disimpan di localStorage
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfileImage(base64String);
        localStorage.setItem('user_profile_image', base64String); // Langsung simpan foto ke local storage
      };

      reader.readAsDataURL(file);
    }
  };

  // Fungsi memicu klik input file asli saat lingkaran avatar diklik
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Fungsi Simpan Perubahan ke Database
  const handleSave = (e) => {
    e.preventDefault();
    // Di sini proses simpan data ke database dilakukan (axios.post / fetch)
    console.log("Data baru berhasil disimpan ke DB:", formData);
    setIsEditing(false); // Kembalikan ke mode baca setelah sukses menyimpan
    alert("Data profil berhasil diperbarui!");
  };

  if (loading) return <div className="profile-loading">Memuat data...</div>;

  return (
    <div className="profile-page-container">
      <div className="profile-banner-top"></div>

      <div className="profile-card-content">
        {/* HEADER PROFIL */}
        <div className="profile-header-block">

          
          {/* Lingkaran Avatar yang interaktif */}
          <div className="profile-avatar-large" onClick={triggerFileInput} title="Ubah Foto Profil">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="profile-avatar-img" />
            ) : (
              // Jika tidak ada foto, otomatis ambil 2 huruf inisial dari nama depan
              <span>
                {formData.namaLengkap ? formData.namaLengkap.substring(0, 2).toUpperCase() : "AS"}
              </span>
            )}
            
            {/* Lapisan Efek Hover (Ikon Kamera) */}
            <div className="profile-avatar-hover-overlay">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
          </div>

          {/* Tag Input File Tersembunyi */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />

          <div className="profile-title-wrapper">
            <h2 className="profile-main-name">{formData.namaLengkap}</h2>
            <p className="profile-main-nik">NIK/ID Karyawan: {formData.nikKaryawan}</p>
          </div>
          
          {/* Tombol berubah dinamis tergantung status mode */}
          {!isEditing && (
            <button className="btn-edit-data" onClick={() => setIsEditing(true)}>
              Edit Data Profil
            </button>
          )}
        </div>

        {/* FORM / VIEW DATA */}
        <form onSubmit={handleSave}>
          <div className="profile-info-grid">
            
            {/* KOLOM KIRI: INFORMASI UMUM */}
            <div className="info-column">
              <h3 className="section-title">Informasi Umum</h3>
              
              <div className="info-group">
                <label>Nama Lengkap</label>
                {isEditing ? (
                  <input type="text" name="namaLengkap" value={formData.namaLengkap} onChange={handleChange} className="form-input-profile" />
                ) : (
                  <p>{formData.namaLengkap}</p>
                )}
              </div>
              
              <div className="info-group">
                <label>NIK / ID Karyawan</label>
                {/* NIK biasanya dikunci/readonly tidak boleh diedit */}
                <p className="text-readonly">{formData.nikKaryawan}</p>
              </div>
              
              <div className="info-group">
                <label>Jabatan / Posisi</label>
                {isEditing ? (
                  <input type="text" name="jabatan" value={formData.jabatan} onChange={handleChange} className="form-input-profile" />
                ) : (
                  <p>{formData.jabatan}</p>
                )}
              </div>
              
              <div className="info-group">
                <label>Alamat Lengkap</label>
                {isEditing ? (
                  <textarea name="alamatLengkap" value={formData.alamatLengkap} onChange={handleChange} rows="3" className="form-input-profile" />
                ) : (
                  <p>{formData.alamatLengkap}</p>
                )}
              </div>
            </div>

            {/* KOLOM KANAN: KONTAK & PEKERJAAN */}
            <div className="info-column">
              <h3 className="section-title">Informasi Kontak & Pekerjaan</h3>
              
              <div className="info-group">
                <label>Alamat Email</label>
                {isEditing ? (
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input-profile" />
                ) : (
                  <p className="text-lowercase">{formData.email}</p>
                )}
              </div>
              
              <div className="info-group">
                <label>Nomor Telepon / WA</label>
                {isEditing ? (
                  <input type="text" name="nomorTelepon" value={formData.nomorTelepon} onChange={handleChange} className="form-input-profile" />
                ) : (
                  <p>{formData.nomorTelepon}</p>
                )}
              </div>
              
              <div className="info-group">
                <label>Divisi / Departemen</label>
                {isEditing ? (
                  <input type="text" name="divisi" value={formData.divisi} onChange={handleChange} className="form-input-profile" />
                ) : (
                  <p>{formData.divisi}</p>
                )}
              </div>
              
              <div className="info-group">
                <label>Tanggal Mulai Bergabung</label>
                <p className="text-readonly">{formData.tanggalBergabung}</p>
              </div>
            </div>

          </div>

          {/* TOMBOL AKSI SIMPAN & BATAL (Hanya muncul saat mode edit aktif) */}
          {isEditing && (
            <div className="profile-action-group">
              <button type="submit" className="btn-profile-save">Simpan Perubahan</button>
              <button type="button" className="btn-profile-cancel" onClick={() => setIsEditing(false)}>Batal</button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
};

export default ProfilePage;