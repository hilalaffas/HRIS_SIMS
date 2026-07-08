import React, { useState } from 'react';
import './FormKaryawan.css';

const FormKaryawan = ({ onSubmit, canManageRole }) => {
  const [formData, setFormData] = useState({
    fullName: '', nik: '', joinDate: '', division: '',
    position: '', address: '', email: '', phone: '',
    emergencyContact: '', emergencyRelation: '',
    username: '', password: '', role: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(formData);
  };

  return (
    <div className="form-card_formkaryawan">
      {/* HEADER FORM DENGAN WARNA SOFT HIJAU */}
      <div className="form-header-soft_formkaryawan">
        <div className="icon-user-add_formkaryawan">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 8C15 10.21 13.21 12 11 12C8.79 12 7 10.21 7 8C7 5.79 8.79 4 11 4C13.21 4 15 5.79 15 8ZM11 14C6.67 14 2 16.14 2 19V20H20V19C20 16.14 15.33 14 11 14ZM20 12V9H18V12H15V14H18V17H20V14H23V12H20Z" fill="currentColor"/>
          </svg>
        </div>
        Tambah Karyawan
      </div>
      
      <form onSubmit={handleSubmit} className="form-body_formkaryawan">
        {/* Kolom Kiri */}
        <div className="form-column">
          <h3 className="section-title_formkaryawan">DATA PERSONAL & DIVISI</h3>
          
          <div className="input-group_formkaryawan">
            <label>FOTO PROFIL</label>
            <input type="file" className="file-input" />
          </div>
          
          <div className="input-group_formkaryawan">
            <label>NAMA LENGKAP *</label>
            <input type="text" name="fullName" onChange={handleInputChange} required />
          </div>
          
          <div className="grid-2-col_formkaryawan">
            <div className="input-group_formkaryawan">
              <label>NIK KARYAWAN *</label>
              <input type="text" name="nik" onChange={handleInputChange} required />
            </div>
            <div className="input-group_formkaryawan">
              <label>TGL MASUK</label>
              <input type="date" name="joinDate" onChange={handleInputChange} />
            </div>
          </div>

          <div className="grid-2-col_formkaryawan">
            <div className="input-group_formkaryawan">
              <label>DIVISI / DEPT *</label>
              <select name="division" onChange={handleInputChange} required>
                <option value="">Pilih Divisi / Dept...</option>
                <option value="Tantai Kensa (Aisin)">Tantai Kensa (Aisin)</option>
                <option value="Kaihatsu">Kaihatsu</option>
                <option value="TTSI">TTSI</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="input-group_formkaryawan">
              <label>JABATAN</label>
              <select name="position" onChange={handleInputChange}>
                <option value="">Pilih Jabatan...</option>
                <option value="Staff">Staff</option>
                <option value="Leader">Leader</option>
                <option value="SPV">SPV</option>
                <option value="Manager">Manager</option>
                <option value="HR Admin">HR Admin</option>
              </select>
            </div>
          </div>

          <div className="input-group_formkaryawan">
            <label>ALAMAT DOMISILI</label>
            <textarea name="address" rows="3" onChange={handleInputChange}></textarea>
          </div>
        </div>

        {/* Kolom Kanan */}
        <div className="form-column">
          <h3 className="section-title_formkaryawan">KREDENSIAL & KONTAK</h3>
          
          <div className="input-group_formkaryawan">
            <label>EMAIL PERUSAHAAN</label>
            <input type="email" name="email" onChange={handleInputChange} />
          </div>

          <div className="grid-2-col_formkaryawan">
            <div className="input-group_formkaryawan">
              <label>NO. HANDPHONE</label>
              <input type="text" name="phone" onChange={handleInputChange} />
            </div>
            <div className="input-group_formkaryawan error-state">
              <label className="text-red_formkaryawan">KONTAK DARURAT</label>
              <input type="text" name="emergencyContact" onChange={handleInputChange} className="border-red_formkaryawan" />
            </div>
          </div>

          <div className="input-group_formkaryawan error-state">
            <label className="text-red_formkaryawan">HUBUNGAN KONTAK DARURAT</label>
            <select name="emergencyRelation" onChange={handleInputChange} className="border-red_formkaryawan">
              <option value="">Pilih Hubungan...</option>
              <option value="Orang Tua">Orang Tua</option>
              <option value="Pasangan">Pasangan</option>
              <option value="Saudara Kandung">Saudara Kandung</option>
              <option value="Teman Dekat">Teman Dekat</option>
            </select>
          </div>

          <div className="credential-box_formkaryawan">
            <div className="grid-2-col_formkaryawan">
              <div className="input-group_formkaryawan">
                <label>USERNAME LOGIN *</label>
                <input type="text" name="username" onChange={handleInputChange} required />
              </div>
              <div className="input-group_formkaryawan">
                <label>PASSWORD *</label>
                <div className="password-wrapper_formkaryawan">
                  <input type={showPassword ? "text" : "password"} name="password" onChange={handleInputChange} required />
                  <span className="eye-icon_formkaryawan" onClick={() => setShowPassword(!showPassword)}>👁️</span>
                </div>
              </div>
            </div>
            {canManageRole && (
              <div className="input-group_formkaryawan mt-3">
                <label>HAK AKSES SISTEM (ROLE) *</label>
                <select name="role" onChange={handleInputChange} required>
                  <option value="">Pilih Akses...</option>
                  <option value="Admin">Admin (HR)</option>
                  <option value="Superadmin">Superadmin</option>
                  <option value="Member">Karyawan Biasa</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions_formkaryawan">
          <button type="submit" className="btn-submit_formkaryawan">✓ Tambahkan Karyawan</button>
        </div>
      </form>
    </div>
  );
};

export default FormKaryawan;