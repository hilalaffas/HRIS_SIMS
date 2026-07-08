import React from 'react';
import './ModalDetailKaryawan.css';

const ModalDetailKaryawan = ({ employeeData, currentUserRole, onClose }) => {
  if (!employeeData) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title">
            <span className="icon">⚙️</span> Manajemen Data Pegawai
            <p className="modal-subtitle">Edit profil, kredensial login, kuota cuti, dan status keaktifan akun.</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <h4 className="section-title">Keamanan & Hak Akses Akun</h4>
          
          <div className="grid-2-col">
            <div className="input-group">
              <label>USERNAME LOGIN *</label>
              <input type="text" defaultValue={employeeData.name.toLowerCase().replace(' ', '.')} />
            </div>
            <div className="input-group">
              <label>UBAH PASSWORD</label>
              <div className="password-wrapper">
                <input type="password" placeholder="Ketik untuk mengubah sandi" />
                <span className="eye-icon">👁️</span>
              </div>
            </div>
            
            <div className="input-group">
              <label>HAK AKSES ROLE *</label>
              <select defaultValue={employeeData.role}>
                <option value="MEMBER">Karyawan Biasa</option>
                <option value="HR">HR Admin</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </div>
            <div className="input-group">
              <label>STATUS AKUN</label>
              <select defaultValue="Aktif">
                <option value="Aktif">Aktif (Bisa Login)</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>

            <div className="input-group input-green-bg">
              <label className="text-green">SISA CUTI TAHUNAN *</label>
              <input type="number" defaultValue={employeeData.leave} className="border-green text-green" />
            </div>
            <div className="input-group input-green-bg">
              <label className="text-green">SISA CUTI SAKIT</label>
              <input type="number" defaultValue="12" className="border-green text-green" />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {/* Render Delete Button HANYA jika role superadmin */}
          {currentUserRole === 'superadmin' ? (
            <button className="btn-delete">🗑️ Hapus Akun</button>
          ) : (
            <div /> /* Placeholder spacer if no delete button */
          )}
          
          <div className="footer-actions">
            <button className="btn-cancel" onClick={onClose}>Batal</button>
            <button className="btn-save">Simpan Perubahan Data</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetailKaryawan;