import React, { useState, useEffect } from 'react';
// BARIS INI SANGAT PENTING:
import './ModalDetailKaryawan.css';

const ModalDetailKaryawan = ({ isOpen = true, onClose, employeeData, currentUserRole, onSave, onDelete }) => {
  // isOpen diberi default `true` karena Karyawan.jsx (parent) memanggil modal ini
  // secara conditional lewat `{editTarget && (<ModalDetailKaryawan ... />)}` dan
  // TIDAK pernah mengirim prop isOpen. Tanpa default ini, isOpen selalu undefined
  // sehingga `!isOpen` selalu true dan modal selalu return null (tombol Edit
  // kelihatan seperti tidak berfungsi, padahal modalnya menolak render sendiri).
  const [formData, setFormData] = useState({
    id: null, employeeId: null,
    namaLengkap: '', nik: '', jabatan: '', alamat: '',
    email: '', divisi: '', telp: '', telpDarurat: '', hubDarurat: '',
    tglGabung: '', username: '', role: '', status: '',
    cutiTahunan: 0, cutiSakit: 0
  });

  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState('');

  // Mengisi form ketika data karyawan (dari tombol edit) masuk
  // Mengisi form ketika data karyawan (dari tombol edit) masuk
  useEffect(() => {
    if (employeeData) {
      setFormData({
        id: employeeData.id ?? employeeData.employeeId ?? null,
        employeeId: employeeData.employeeId ?? employeeData.id ?? null,
        namaLengkap: employeeData.fullName || '',
        nik: employeeData.nikKaryawan || '',
        jabatan: employeeData.position || '',
        alamat: employeeData.address || '',
        // Email dan Username biasanya ada di tabel User relasinya
        email: employeeData.user?.email || '',
        divisi: employeeData.division || '',
        telp: employeeData.phoneNumber || '',
        telpDarurat: employeeData.emergencyContactPhone || '',
        // Hubungan darurat biasanya berelasi ke tabel reference
        hubDarurat: employeeData.emergencyContactRelationship?.name || '',
        tglGabung: employeeData.joinDate || '',
        username: employeeData.user?.username || '',
        role: employeeData.user?.roleId?.roleName || 'MEMBER',
        status: employeeData.isActive ? 'Aktif' : 'Nonaktif',
        cutiTahunan: employeeData.leave || 0,
        cutiSakit: employeeData.sickLeave || 12
      });
    }
  }, [employeeData]);

  // Validasi: Jika modal ditutup atau data kosong, jangan render apapun
  if (!isOpen || !employeeData) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSimpan = (e) => {
    e.preventDefault();

    // Sebelumnya prop onSave dikirim dari Karyawan.jsx tapi tidak pernah
    // dipanggil di sini, jadi perubahan form tidak pernah tersimpan ke list utama.
    if (onSave) {
      onSave(formData);
    }

    setNotification(`Data profil akun ${formData.namaLengkap} berhasil diperbarui.`);
    
    setTimeout(() => {
      setNotification('');
      // onClose(); // Hilangkan komentar ini jika ingin modal auto-close setelah save
    }, 3000);
  };

  return (
    <div className="modal-overlay_detail_karyawan">
      <div className="modal-container_detail_karyawan">
        
        {notification && (
          <div className="notification-toast_detail_karyawan">
            ✅ {notification}
          </div>
        )}

        <div className="modal-header_detail_karyawan">
          <div className="header-content_detail_karyawan">
            <div className="header-title-wrapper_detail_karyawan">
              <span className="icon_modal_detail_karyawan" style={{marginRight: "8px", fontSize: "20px"}}>⚙️</span>
              <h2>Manajemen Data Pegawai</h2>
            </div>
            <p>Edit profil, kredensial login, kuota cuti, dan status keaktifan akun.</p>
          </div>
          <button className="btn-close_detail_karyawan" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body_detail_karyawan">
          
          <div className="section-container_detail_karyawan">
            <h3 className="section-title_detail_karyawan">Informasi Umum</h3>
            <div className="form-group_detail_karyawan">
              <label>NAMA LENGKAP *</label>
              <input type="text" name="namaLengkap" value={formData.namaLengkap} onChange={handleInputChange} />
            </div>
            <div className="form-grid_detail_karyawan">
              <div className="form-group_detail_karyawan">
                <label>NIK / ID KARYAWAN *</label>
                <input type="text" name="nik" value={formData.nik} onChange={handleInputChange} />
              </div>
              <div className="form-group_detail_karyawan">
                <label>JABATAN / POSISI</label>
                <select name="jabatan" value={formData.jabatan} onChange={handleInputChange}>
                  <option value="Senior Software Engineer">Senior Software Engineer</option>
                  <option value="Manager">Manager</option>
                  <option value="HR Admin">HR Admin</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
            </div>
            <div className="form-group_detail_karyawan">
              <label>ALAMAT LENGKAP</label>
              <textarea name="alamat" value={formData.alamat} onChange={handleInputChange} rows="2"></textarea>
            </div>
          </div>

          <div className="section-container_detail_karyawan">
            <h3 className="section-title_detail_karyawan">Informasi Kontak & Pekerjaan</h3>
            <div className="form-grid_detail_karyawan">
              <div className="form-group_detail_karyawan">
                <label>ALAMAT EMAIL</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
              </div>
              <div className="form-group_detail_karyawan">
                <label>DIVISI / DEPARTEMEN *</label>
                <select name="divisi" value={formData.divisi} onChange={handleInputChange}>
                  <option value="Kaihatsu">Kaihatsu</option>
                  <option value="Tantai Kensa (Aisin)">Tantai Kensa (Aisin)</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>
            <div className="form-grid-3_detail_karyawan">
              <div className="form-group_detail_karyawan">
                <label>NOMOR TELEPON PRIBADI</label>
                <input type="text" name="telp" value={formData.telp} onChange={handleInputChange} />
              </div>
              <div className="form-group_detail_karyawan error-group_detail_karyawan">
                <label>NOMOR TELEPON DARURAT *</label>
                <input type="text" name="telpDarurat" value={formData.telpDarurat} onChange={handleInputChange} />
              </div>
              <div className="form-group_detail_karyawan error-group_detail_karyawan">
                <label>HUBUNGAN</label>
                <select name="hubDarurat" value={formData.hubDarurat} onChange={handleInputChange}>
                  <option value="Orang Tua">Orang Tua</option>
                  <option value="Pasangan">Pasangan</option>
                  <option value="Saudara Kandung">Saudara Kandung</option>
                </select>
              </div>
            </div>
            <div className="form-group_detail_karyawan w-half_detail_karyawan">
              <label>TANGGAL MULAI BERGABUNG</label>
              <input type="date" name="tglGabung" value={formData.tglGabung} onChange={handleInputChange} />
            </div>
          </div>

          <div className="section-container_detail_karyawan">
            <h3 className="section-title_detail_karyawan">Keamanan & Hak Akses Akun</h3>
            <div className="form-grid_detail_karyawan">
              <div className="form-group_detail_karyawan">
                <label>USERNAME LOGIN *</label>
                <input type="text" name="username" value={formData.username} onChange={handleInputChange} />
              </div>
              <div className="form-group_detail_karyawan">
                <label>UBAH PASSWORD</label>
                <div className="password-wrapper_detail_karyawan">
                  <input type={showPassword ? "text" : "password"} placeholder="Ketik untuk mengubah sandi" />
                  <span className="eye-icon_detail_karyawan" onClick={() => setShowPassword(!showPassword)}>👁️</span>
                </div>
              </div>
            </div>
            <div className="form-grid_detail_karyawan">
              <div className="form-group_detail_karyawan">
                <label>HAK AKSES ROLE *</label>
                <select name="role" value={formData.role} onChange={handleInputChange}>
                  <option value="MEMBER">Karyawan Biasa (MEMBER)</option>
                  <option value="HR">HR Admin (HR)</option>
                  <option value="MANAGER">Manager (MANAGER)</option>
                </select>
              </div>
              {/* Gunakan ternary operator untuk mengubah class berdasarkan value status */}
              <div className={`form-group_detail_karyawan ${formData.status === 'Nonaktif' ?              'error-group_detail_karyawan' : 'success-group_detail_karyawan'}`}>
                <label>STATUS AKUN</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="Aktif" className="text-green-option">Aktif (Bisa Login)</option>
                  <option value="Nonaktif" className="text-red-option">Nonaktif (Suspend)</option>
                </select>
              </div>
            </div>
            <div className="form-grid_detail_karyawan">
              <div className="form-group_detail_karyawan green-bg-group_detail_karyawan">
                <label>SISA CUTI TAHUNAN *</label>
                <input type="number" name="cutiTahunan" value={formData.cutiTahunan} onChange={handleInputChange} />
              </div>
              <div className="form-group_detail_karyawan green-bg-group_detail_karyawan">
                <label>SISA CUTI SAKIT</label>
                <input type="number" name="cutiSakit" value={formData.cutiSakit} onChange={handleInputChange} />
              </div>
            </div>
          </div>

        </div>

        <div className="modal-footer_detail_karyawan">
          {currentUserRole === 'superadmin' ? (
            <button className="btn-delete_detail_karyawan" onClick={onDelete}>🗑️ Hapus Akun</button>
          ) : (
            <div />
          )}
          
          <div className="footer-actions_detail_karyawan">
            <button className="btn-cancel_detail_karyawan" onClick={onClose}>Batal</button>
            <button className="btn-save_detail_karyawan" onClick={handleSimpan}>Simpan Perubahan Data</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetailKaryawan;