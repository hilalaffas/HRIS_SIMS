import React, { useState } from 'react';
import './LeaveFormHr.css';

const LeaveFormHr = ({ karyawanList, onSubmit }) => {
  const [formData, setFormData] = useState({
    karyawanId: '',
    jenisCuti: '',
    startDate: '',
    endDate: '',
    leader: '',
    spv: '',
    manager: '',
    alasan: '',
    pekerjaanTertunda: '',
    dicoverOleh: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(formData);
    // Reset form setelah submit (opsional)
  };

  return (
    <div className="card_leaveFormHr">
      <div className="header_leaveFormHr">
        <div className="header-title-wrapper_leaveFormHr">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <line x1="8" y1="14" x2="12" y2="14"></line>
            <line x1="8" y1="18" x2="16" y2="18"></line>
          </svg>
          <h2>Formulir Cuti Susulan Karyawan</h2>
        </div>
        <p>Formulir khusus HR untuk mencatat cuti di tanggal yang sudah lewat. Akan langsung disetujui (bypass aturan).</p>
      </div>

      <form className="body_leaveFormHr" onSubmit={handleSubmit}>
        <div className="form-grid_leaveFormHr">
          <div className="form-group_leaveFormHr">
            <label>PILIH KARYAWAN *</label>
            <select name="karyawanId" value={formData.karyawanId} onChange={handleInputChange} required>
              <option value="">Pilih...</option>
              {karyawanList?.map(k => (
                <option key={k.id} value={k.id}>{k.name} ({k.nik})</option>
              ))}
            </select>
          </div>
          <div className="form-group_leaveFormHr">
            <label>JENIS PERMOHONAN CUTI</label>
            <select name="jenisCuti" value={formData.jenisCuti} onChange={handleInputChange} required>
              <option value="">Pilih...</option>
              <option value="Tahunan">Cuti Tahunan</option>
              <option value="Sakit">Cuti Sakit</option>
              <option value="Melahirkan">Cuti Melahirkan</option>
              <option value="Urgent">Cuti Urgent / Kematian</option>
            </select>
          </div>
        </div>

        <div className="form-grid_leaveFormHr">
          <div className="form-group_leaveFormHr">
            <label>DARI TANGGAL (BEBAS)</label>
            <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required />
          </div>
          <div className="form-group_leaveFormHr">
            <label>SAMPAI TANGGAL</label>
            <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required />
          </div>
        </div>

        <div className="info-box_leaveFormHr">
          Silakan pilih tanggal awal dan akhir.
        </div>

        <div className="form-group_leaveFormHr mt-4">
          <label>CATATAN ALUR APPROVAL (RIWAYAT) *</label>
          <div className="form-grid-3_leaveFormHr">
            <div className="sub-group_leaveFormHr">
              <span className="sub-label_leaveFormHr">Leader</span>
              <select name="leader" value={formData.leader} onChange={handleInputChange}>
                <option value="">Pilih...</option>
                <option value="Auto-ACC">Bypass (Auto-ACC)</option>
              </select>
            </div>
            <div className="sub-group_leaveFormHr">
              <span className="sub-label_leaveFormHr">SPV</span>
              <select name="spv" value={formData.spv} onChange={handleInputChange}>
                <option value="">Pilih...</option>
                <option value="Auto-ACC">Bypass (Auto-ACC)</option>
              </select>
            </div>
            <div className="sub-group_leaveFormHr">
              <span className="sub-label_leaveFormHr">Manager</span>
              <select name="manager" value={formData.manager} onChange={handleInputChange}>
                <option value="">Pilih...</option>
                <option value="Auto-ACC">Bypass (Auto-ACC)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-group_leaveFormHr">
          <label>ALASAN / KETERANGAN *</label>
          <input type="text" name="alasan" placeholder="Berikan alasan yang jelas..." value={formData.alasan} onChange={handleInputChange} required />
        </div>

        <div className="form-group_leaveFormHr">
          <label>PEKERJAAN TERTUNDA *</label>
          <input type="text" name="pekerjaanTertunda" placeholder="Jelaskan status pekerjaan yang ditinggalkan..." value={formData.pekerjaanTertunda} onChange={handleInputChange} required />
        </div>

        <div className="form-group_leaveFormHr">
          <label>DICOVER OLEH *</label>
          <input type="text" name="dicoverOleh" placeholder="Nama rekan kerja yang mem-backup..." value={formData.dicoverOleh} onChange={handleInputChange} required />
        </div>

        <div className="footer-actions_leaveFormHr">
          <button type="submit" className="btn-submit_leaveFormHr">Proses Cuti Susulan (Auto-ACC)</button>
        </div>
      </form>
    </div>
  );
};

export default LeaveFormHr;