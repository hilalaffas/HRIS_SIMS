import React from 'react';
import './ModalDetailKaryawan.css';

const ModalDetailKaryawan = ({ employeeData, currentUserRole, onClose }) => {
  if (!employeeData) return null;

  return (
    <div className="modal-overlay_modal_detail_karyawan">
      <div className="modal-content_modal_detail_karyawan">
        <div className="modal-header_modal_detail_karyawan">
          <div className="modal-title_modal_detail_karyawan">
            <span className="icon_modal_detail_karyawan">⚙️</span> Manajemen Data Pegawai
            <p className="modal-subtitle_modal_detail_karyawan">Edit profil, kredensial login, kuota cuti, dan status keaktifan akun.</p>
          </div>
          <button className="btn-close_modal_detail_karyawan" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body_modal_detail_karyawan">
          <h4 className="section-title_modal_detail_karyawan">Keamanan & Hak Akses Akun</h4>
          
          <div className="grid-2-col_modal_detail_karyawan">
            <div className="input-group_modal_detail_karyawan">
              <label>USERNAME LOGIN *</label>
              <input type="text" defaultValue={employeeData.name.toLowerCase().replace(' ', '.')} />
            </div>
            <div className="input-group_modal_detail_karyawan">
              <label>UBAH PASSWORD</label>
              <div className="password-wrapper_modal_detail_karyawan">
                <input type="password" placeholder="Ketik untuk mengubah sandi" />
                <span className="eye-icon_modal_detail_karyawan">👁️</span>
              </div>
            </div>
            
            <div className="input-group_modal_detail_karyawan">
              <label>HAK AKSES ROLE *</label>
              <select defaultValue={employeeData.role}>
                <option value="MEMBER">Karyawan Biasa</option>
                <option value="HR">HR Admin</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </div>
            <div className="input-group_modal_detail_karyawan">
              <label>STATUS AKUN</label>
              <select defaultValue="Aktif">
                <option value="Aktif">Aktif (Bisa Login)</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>

            <div className="input-group_modal_detail_karyawan input-green-bg_modal_detail_karyawan">
              <label className="text-green_modal_detail_karyawan">SISA CUTI TAHUNAN *</label>
              <input type="number" defaultValue={employeeData.leave} className="border-green_modal_detail_karyawan text-green_modal_detail_karyawan" />
            </div>
            <div className="input-group_modal_detail_karyawan input-green-bg_modal_detail_karyawan">
              <label className="text-green_modal_detail_karyawan">SISA CUTI SAKIT</label>
              <input type="number" defaultValue="12" className="border-green_modal_detail_karyawan text-green_modal_detail_karyawan" />
            </div>
          </div>
        </div>

        <div className="modal-footer_modal_detail_karyawan">
          {currentUserRole === 'superadmin' ? (
            <button className="btn-delete_modal_detail_karyawan">🗑️ Hapus Akun</button>
          ) : (
            <div />
          )}
          
          <div className="footer-actions_modal_detail_karyawan">
            <button className="btn-cancel_modal_detail_karyawan" onClick={onClose}>Batal</button>
            <button className="btn-save_modal_detail_karyawan">Simpan Perubahan Data</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetailKaryawan;