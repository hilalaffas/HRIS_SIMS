import React, { useState, useEffect } from 'react';
// BARIS INI SANGAT PENTING:
import './ModalDetailKaryawan.css';
import { updateKaryawan } from '../../../services/karyawanService';
import { updateUser } from '../../../services/userService';
import { getAllDivisi } from '../../../services/divisiService';
import { getAllRelationships } from '../../../services/relationshipService';
import { getAllRoles } from '../../../services/roleService';

const ModalDetailKaryawan = ({ isOpen = true, onClose, employeeData, currentUserRole, onSave, onDelete }) => {
  // isOpen diberi default `true` karena Karyawan.jsx (parent) memanggil modal ini
  // secara conditional lewat `{editTarget && (<ModalDetailKaryawan ... />)}` dan
  // TIDAK pernah mengirim prop isOpen. Tanpa default ini, isOpen selalu undefined
  // sehingga `!isOpen` selalu true dan modal selalu return null (tombol Edit
  // kelihatan seperti tidak berfungsi, padahal modalnya menolak render sendiri).
  const [formData, setFormData] = useState({
    id: null, employeeId: null, userId: null,
    namaLengkap: '', nik: '', jabatan: '', alamat: '',
    email: '', divisiId: '', telp: '', telpDarurat: '', hubDarurat: '',
    tglGabung: '', username: '', password: '', role: '', status: '',
    cutiTahunan: 0, cutiSakit: 0
  });

  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Daftar divisi diambil dari backend, sama seperti FormKaryawan, supaya
  // otomatis ikut update begitu ada penambahan/perubahan divisi.
  const [divisiList, setDivisiList] = useState([]);
  const [isLoadingDivisi, setIsLoadingDivisi] = useState(true);

  // [BARU] Daftar hubungan kontak darurat & daftar role SEKARANG diambil dari
  // backend (bukan di-hardcode) supaya id/nama yang dikirim SELALU cocok
  // dengan data asli di database. Sebelumnya relMap & pilihan role di-hardcode
  // manual dan nilainya tidak sinkron dengan tabel emergency_contact_relationships
  // maupun tabel roles, jadi field itu berisiko tersimpan salah tanpa disadari.
  const [relationshipList, setRelationshipList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getAllDivisi()
      .then((data) => { if (isMounted) setDivisiList(data || []); })
      .catch(() => { if (isMounted) setDivisiList([]); })
      .finally(() => { if (isMounted) setIsLoadingDivisi(false); });
    return () => { isMounted = false; };
  }, []);

  // [BARU]
  useEffect(() => {
    let isMounted = true;
    setIsLoadingOptions(true);
    Promise.all([getAllRelationships(), getAllRoles()])
      .then(([relationshipData, roleData]) => {
        if (!isMounted) return;
        setRelationshipList(relationshipData || []);
        setRoleList(roleData || []);
      })
      .catch(() => {
        if (isMounted) {
          setRelationshipList([]);
          setRoleList([]);
        }
      })
      .finally(() => { if (isMounted) setIsLoadingOptions(false); });
    return () => { isMounted = false; };
  }, []);

  // Mengisi form ketika data karyawan (dari tombol edit) masuk
  useEffect(() => {
    if (employeeData) {
      setFormData({
        id: employeeData.id ?? employeeData.employeeId ?? null,
        employeeId: employeeData.employeeId ?? employeeData.id ?? null,
        // [BARU] userId dari relasi employee.user -- dibutuhkan untuk
        // memanggil PUT /api/users/{userId} (username/email/role/password).
        userId: employeeData.user?.userId ?? null,
        namaLengkap: employeeData.fullName || '',
        nik: employeeData.nikKaryawan || '',
        jabatan: employeeData.position || '',
        alamat: employeeData.address || '',
        // Email dan Username biasanya ada di tabel User relasinya
        email: employeeData.user?.email || '',
        divisiId: employeeData.divisi?.id || '',
        telp: employeeData.phoneNumber || '',
        telpDarurat: employeeData.emergencyContactPhone || '',
        // Hubungan darurat biasanya berelasi ke tabel reference
        hubDarurat: employeeData.emergencyContactRelationship?.name || '',
        tglGabung: employeeData.joinDate || '',
        username: employeeData.user?.username || '',
        // [BARU] Password SELALU dikosongkan saat modal dibuka -- backend tidak
        // pernah mengirim balik password (lihat @JsonIgnore di User.java), dan
        // field ini hanya dikirim ke server kalau HR benar-benar mengetik yang baru.
        password: '',
        role: employeeData.user?.roleId?.roleName || '',
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

  // [BARU] HR_Admin biasa tidak boleh menaikkan siapa pun (termasuk dirinya
  // sendiri) menjadi SUPER_ADMIN lewat form ini -- hanya SUPER_ADMIN yang boleh
  // memilih role SUPER_ADMIN. Tombol Hapus di footer sudah pakai pola serupa.
  const selectableRoles = currentUserRole === 'superadmin'
    ? roleList
    : roleList.filter((r) => (r.roleName || '').toUpperCase() !== 'SUPER_ADMIN');

  const handleSimpan = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const targetId = formData.employeeId ?? formData.id;
    if (!targetId) {
      setErrorMessage('ID karyawan tidak ditemukan, coba tutup dan buka lagi modal ini.');
      return;
    }
    if (!formData.userId) {
      setErrorMessage('ID akun user tidak ditemukan, coba tutup dan buka lagi modal ini.');
      return;
    }
    if (!formData.namaLengkap.trim() || !formData.nik.trim() || !formData.username.trim()) {
      setErrorMessage('Nama Lengkap, NIK, dan Username wajib diisi.');
      return;
    }
    if (!formData.divisiId) {
      setErrorMessage('Divisi wajib dipilih.');
      return;
    }

    // --- 1. Data karyawan (tabel employees) -> PUT /api/karyawan/{id} ---
    const relasiTerpilih = relationshipList.find((r) => r.name === formData.hubDarurat);

    const employeeForm = new FormData();
    employeeForm.append('fullName', formData.namaLengkap);
    employeeForm.append('address', formData.alamat);
    employeeForm.append('phoneNumber', formData.telp);
    employeeForm.append('nikKaryawan', formData.nik);
    employeeForm.append('divisiId', formData.divisiId);
    employeeForm.append('emergencyContactPhone', formData.telpDarurat);
    if (relasiTerpilih) employeeForm.append('emergencyContactRelationshipId', relasiTerpilih.id);
    // [BARU] Jabatan (kolom baru di backend, lihat migration V20)
    if (formData.jabatan) employeeForm.append('position', formData.jabatan);
    // [BARU] Status akun aktif/nonaktif -- FormData akan mengubah boolean JS
    // menjadi string "true"/"false", dan Spring @ModelAttribute otomatis
    // mem-parsingnya kembali menjadi Boolean.
    employeeForm.append('isActive', formData.status === 'Aktif');
    // [BARU] Tanggal gabung
    if (formData.tglGabung) employeeForm.append('joinDate', formData.tglGabung);

    // --- 2. Data akun (tabel users) -> PUT /api/users/{userId} ---
    const roleTerpilih = roleList.find((r) => r.roleName === formData.role);
    const userPayload = {
      username: formData.username,
      email: formData.email,
    };
    if (roleTerpilih) userPayload.idRole = roleTerpilih.roleId;
    // Password hanya disertakan kalau HR benar-benar mengetik yang baru,
    // supaya tidak menimpa password lama dengan string kosong.
    if (formData.password && formData.password.trim() !== '') {
      userPayload.password = formData.password;
    }

    setIsSubmitting(true);

    // Dipisah jadi 2 try/catch supaya kalau salah satu gagal, pesan errornya
    // jelas menyebutkan bagian mana yang gagal (bukan cuma "gagal menyimpan").
    try {
      await updateKaryawan(targetId, employeeForm);
    } catch (error) {
      setErrorMessage('Gagal menyimpan data karyawan: ' + (error.message || 'terjadi kesalahan.'));
      setIsSubmitting(false);
      return;
    }

    try {
      await updateUser(formData.userId, userPayload);
    } catch (error) {
      setErrorMessage(
        'Data karyawan tersimpan, tapi akun login (username/email/role/password) GAGAL disimpan: ' +
        (error.message || 'terjadi kesalahan.')
      );
      setIsSubmitting(false);
      return;
    }

    setNotification(`Data profil akun ${formData.namaLengkap} berhasil diperbarui.`);
    setFormData((prev) => ({ ...prev, password: '' }));
    if (onSave) onSave(formData);
    setTimeout(() => {
      setNotification('');
      // onClose(); // Hilangkan komentar ini jika ingin modal auto-close setelah save
    }, 3000);
    setIsSubmitting(false);
  };

  return (
    <div className="modal-overlay_detail_karyawan">
      <div className="modal-container_detail_karyawan">
        
        {notification && (
          <div className="notification-toast_detail_karyawan">
            ✅ {notification}
          </div>
        )}

        {errorMessage && (
          <div className="notification-toast_detail_karyawan" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            ⚠️ {errorMessage}
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
                  <option value="">Pilih Jabatan...</option>
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
                <select name="divisiId" value={formData.divisiId} onChange={handleInputChange} disabled={isLoadingDivisi}>
                  <option value="">{isLoadingDivisi ? 'Memuat divisi...' : 'Pilih Divisi...'}</option>
                  {divisiList.map((divisi) => (
                    <option key={divisi.id} value={divisi.id}>{divisi.namaDivisi}</option>
                  ))}
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
                <select name="hubDarurat" value={formData.hubDarurat} onChange={handleInputChange} disabled={isLoadingOptions}>
                  <option value="">{isLoadingOptions ? 'Memuat...' : 'Pilih Hubungan...'}</option>
                  {relationshipList.map((rel) => (
                    <option key={rel.id} value={rel.name}>{rel.name}</option>
                  ))}
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
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Ketik untuk mengubah sandi"
                    autoComplete="new-password"
                  />
                  <span className="eye-icon_detail_karyawan" onClick={() => setShowPassword(!showPassword)}>👁️</span>
                </div>
              </div>
            </div>
            <div className="form-grid_detail_karyawan">
              <div className="form-group_detail_karyawan">
                <label>HAK AKSES ROLE *</label>
                <select name="role" value={formData.role} onChange={handleInputChange} disabled={isLoadingOptions}>
                  <option value="">{isLoadingOptions ? 'Memuat role...' : 'Pilih Role...'}</option>
                  {selectableRoles.map((r) => (
                    <option key={r.roleId} value={r.roleName}>{r.roleName}</option>
                  ))}
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
                <input type="number" name="cutiTahunan" value={formData.cutiTahunan} onChange={handleInputChange} disabled title="Belum tersambung ke database, lihat catatan di bawah form." />
              </div>
              <div className="form-group_detail_karyawan green-bg-group_detail_karyawan">
                <label>SISA CUTI SAKIT</label>
                <input type="number" name="cutiSakit" value={formData.cutiSakit} onChange={handleInputChange} disabled title="Belum tersambung ke database, lihat catatan di bawah form." />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: '6px', margin: '8px 0 0' }}>
              ⚠️ Kuota cuti di atas belum tersambung ke database -- tabel <code>employees</code> belum punya kolom kuota per-karyawan,
              dan sistem cuti saat ini dihitung dari aturan per jenis cuti di tabel <code>leave_types</code>, bukan kuota manual per orang.
              Nilai di sini murni tampilan sementara dan tidak ikut tersimpan.
            </p>
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
            <button className="btn-save_detail_karyawan" onClick={handleSimpan} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetailKaryawan;
