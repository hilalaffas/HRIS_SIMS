import React, { useState, useEffect } from 'react';
import './FormKaryawan.css';
import { registerKaryawan } from '../../../services/karyawanService';
import { getAllDivisi } from '../../../services/divisiService';
import Toast from '../../../components/Toast'; // Sesuaikan path ini jika perlu

const ROLE_POSITION_MAP = {
  Member: ['Staff'],
  MANAGER: ['Leader', 'SPV', 'Manager'],
  HRD_Admin: ['HRD_Admin', 'HRD_Karyawan'],
};

const POSITION_ROLE_ID_MAP = {
  HRD_Admin: 2,
  HRD_Karyawan: 3,
  Manager: 4,
  SPV: 5,
  Leader: 6,
  Staff: 7,
};

const getInitialFormData = (canManageRole) => ({
  fullName: '', nik: '', joinDate: '', divisiId: '',
  position: canManageRole ? '' : 'Staff',
  address: '', email: '', phone: '',
  emergencyContact: '', emergencyRelation: '', emergencyPhone: '',
  username: '', password: '',
  role: canManageRole ? '' : 'Member',
  gender: '',
});

const FormKaryawan = ({ onSubmit, canManageRole }) => {
  const [fileName, setFileName] = useState("Tidak ada file");
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState(() => getInitialFormData(canManageRole));
  const [showPassword, setShowPassword] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [toast, setToast] = useState(null); // State untuk Toast

  // Daftar divisi diambil dari backend, supaya otomatis ikut update
  // begitu ada penambahan/perubahan divisi di menu Manajemen Divisi.
  const [divisiList, setDivisiList] = useState([]);
  const [isLoadingDivisi, setIsLoadingDivisi] = useState(true);
  const [divisiError, setDivisiError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDivisi = async () => {
      setIsLoadingDivisi(true);
      setDivisiError(null);
      try {
        const data = await getAllDivisi();
        if (isMounted) setDivisiList(data || []);
      } catch (err) {
        if (isMounted) setDivisiError(err.message || 'Gagal memuat data divisi.');
      } finally {
        if (isMounted) setIsLoadingDivisi(false);
      }
    };
    fetchDivisi();
    return () => { isMounted = false; };
  }, []);

  const triggerToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const allowedPositions = ROLE_POSITION_MAP[formData.role];

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
      setFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = { ...formData, [name]: value };
    if (name === 'role') {
      const allowed = ROLE_POSITION_MAP[value] || [];
      if (allowed.length === 1) updatedFormData.position = allowed[0];
      else if (!allowed.includes(updatedFormData.position)) updatedFormData.position = '';
    }
    setFormData(updatedFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasi Field Wajib
    if (!formData.fullName || !formData.nik || !formData.username || !formData.password || !formData.divisiId) {
      triggerToast('Harap lengkapi field yang bertanda bintang (*)', 'error');
      return;
    }

    const data = new FormData();
    const mappedRoleId = POSITION_ROLE_ID_MAP[formData.position] || 7;
    const relMap = { 'Orang Tua': 1, 'Pasangan': 2, 'Saudara Kandung': 3, 'Teman Dekat': 4 };
    const mappedRelId = relMap[formData.emergencyRelation] || 1;

    data.append('username', formData.username);
    data.append('password', formData.password);
    data.append('email', formData.email);
    data.append('fullName', formData.fullName);
    data.append('address', formData.address);
    data.append('phoneNumber', formData.phone);
    data.append('nikKaryawan', formData.nik);
    data.append('roleId', mappedRoleId);
    data.append('divisiId', formData.divisiId);
    data.append('emergencyContactPhone', formData.emergencyPhone);
    data.append('emergencyContactName', formData.emergencyContact);
    data.append('emergencyContactRelationshipId', mappedRelId);
    data.append('gender', formData.gender);
    
    if (formData.joinDate) {
      data.append('joinDate', formData.joinDate); 
    }

    if (file) data.append('photo', file);

    try {
      await registerKaryawan(data);
      triggerToast(`Karyawan ${formData.fullName} berhasil ditambahkan ke direktori!`, 'success');
      if (onSubmit) onSubmit(formData);
      setFormData(getInitialFormData(canManageRole));
      setFile(null);
      setFileName('Tidak ada file');
      setShowPassword(false);
      setFormResetKey((prev) => prev + 1);
    } catch (error) {
      triggerToast('Gagal menyimpan: ' + error.message, 'error');
    }
  };

  return (
    <div className="form-card_formkaryawan">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <div className="form-header-soft_formkaryawan">
        <div className="icon-user-add_formkaryawan">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 8C15 10.21 13.21 12 11 12C8.79 12 7 10.21 7 8C7 5.79 8.79 4 11 4C13.21 4 15 5.79 15 8ZM11 14C6.67 14 2 16.14 2 19V20H20V19C20 16.14 15.33 14 11 14ZM20 12V9H18V12H15V14H18V17H20V14H23V12H20Z" fill="currentColor"/>
          </svg>
        </div>
        Tambah Karyawan
      </div>
      
      <form key={formResetKey} onSubmit={handleSubmit} className="form-body_formkaryawan">
        {/* Kolom Kiri */}
        <div className="form-column">
          <h3 className="section-title_formkaryawan">DATA PERSONAL & DIVISI</h3>
          <div className="input-group_formkaryawan">
            <label>FOTO PROFIL</label>
            <div className="file-upload-container">
              <label htmlFor="arquivo" className="btn-upload_formkaryawan">Choose File</label>
              <span className="file-name_formkaryawan">{fileName}</span>
              <input type="file" id="arquivo" className="file-input-hidden" onChange={handleFileChange} accept=".jpg, .jpeg, .png, .gif, .pdf" />
            </div>
          </div>
          <div className="input-group_formkaryawan">
            <label>NAMA LENGKAP *</label>
            <input type="text" name="fullName" onChange={handleInputChange} required />
          </div>
          <div className="input-group_formkaryawan">
            <label>JENIS KELAMIN *</label>
            <select name="gender" value={formData.gender} onChange={handleInputChange} required>
              <option value="">Pilih Jenis Kelamin...</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div className="grid-2-col_formkaryawan">
            <div className="input-group_formkaryawan">
              <label>NIK KARYAWAN *</label>
              <input type="text" name="nik" onChange={handleInputChange} required />
            </div>
            <div className="input-group_formkaryawan">
              <label>TANGGAL MASUK</label>
              <input type="date" name="joinDate" onChange={handleInputChange} />
            </div>
          </div>
          <div className="grid-2-col_formkaryawan">
            <div className="input-group_formkaryawan">
              <label>DIVISI / DEPT *</label>
              <select
                name="divisiId"
                value={formData.divisiId}
                onChange={handleInputChange}
                disabled={isLoadingDivisi || !!divisiError}
                required
              >
                <option value="">
                  {isLoadingDivisi
                    ? 'Memuat divisi...'
                    : divisiError
                    ? 'Gagal memuat divisi'
                    : 'Pilih Divisi / Dept...'}
                </option>
                {divisiList.map((divisi) => (
                  <option key={divisi.id} value={divisi.id}>
                    {divisi.namaDivisi}
                  </option>
                ))}
              </select>
              {divisiError && (
                <span className="text-red_formkaryawan" style={{ fontSize: '12px' }}>
                  {divisiError}
                </span>
              )}
            </div>
            <div className="input-group_formkaryawan">
              <label>JABATAN</label>
              <select name="position" value={formData.position} onChange={handleInputChange} disabled={!formData.role}>
                <option value="">{formData.role ? 'Pilih Jabatan...' : 'Pilih Hak Akses dahulu'}</option>
                <option value="Staff" disabled={!allowedPositions?.includes('Staff')}>Staff</option>
                <option value="Leader" disabled={!allowedPositions?.includes('Leader')}>Leader</option>
                <option value="SPV" disabled={!allowedPositions?.includes('SPV')}>SPV</option>
                <option value="Manager" disabled={!allowedPositions?.includes('Manager')}>Manager</option>
                <option value="HRD_Admin" disabled={!allowedPositions?.includes('HRD_Admin')}>HR Admin</option>
                <option value="HRD_Karyawan" disabled={!allowedPositions?.includes('HRD_Karyawan')}>HR Karyawan</option>
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
          <div className="grid-2-col_formkaryawan">
            <div className="input-group_formkaryawan">
              <label>EMAIL PERUSAHAAN</label>
              <input type="email" name="email" onChange={handleInputChange} />
            </div>
            <div className="input-group_formkaryawan">
              <label>NO. HANDPHONE</label>
              <input type="text" name="phone" onChange={handleInputChange} />
            </div>  
          </div>
          <div className="grid-2-col_formkaryawan">
            <div className="input-group_formkaryawan">
              <label className="text-red_formkaryawan">KONTAK DARURAT (NAMA)</label>
              <input type="text" name="emergencyContact" onChange={handleInputChange} className="border-red_formkaryawan" />
            </div>
            <div className="input-group_formkaryawan">
              <label className="text-red_formkaryawan">NO. HP DARURAT</label>
              <input type="text" name="emergencyPhone" onChange={handleInputChange} className="border-red_formkaryawan" />
            </div>
          </div>
          <div className="input-group_formkaryawan">
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
                <select name="role" value={formData.role} onChange={handleInputChange} required>
                  <option value="">Pilih Akses...</option>
                  <option value="Member">Karyawan Biasa (Member)</option>
                  <option value="MANAGER">Manager / Supervisor / Leader</option>
                  <option value="HRD_Admin">Admin (HR)</option>
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