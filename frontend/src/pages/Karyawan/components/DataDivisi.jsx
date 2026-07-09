import React, { useState } from 'react';
import './DataDivisi.css';
import { initialDivisiList } from '../data/mockDivisi';

const DataDivisi = ({ karyawanList }) => {
  const [divisiList, setDivisiList] = useState(initialDivisiList);
  const [newDivisiName, setNewDivisiName] = useState('');
  
  // State untuk mode Edit
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Fungsi Tambah Divisi
  const handleAddDivisi = () => {
    if (!newDivisiName.trim()) return;
    
    const newDivisi = {
      id: `DIV-${Date.now()}`,
      name: newDivisiName.trim()
    };
    
    setDivisiList([...divisiList, newDivisi]);
    setNewDivisiName(''); // Reset input
  };

  // Fungsi Mulai Edit
  const handleStartEdit = (divisi) => {
    setEditingId(divisi.id);
    setEditValue(divisi.name);
  };

  // Fungsi Simpan Edit
  const handleSaveEdit = (id) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    setDivisiList(divisiList.map(div => 
      div.id === id ? { ...div, name: editValue.trim() } : div
    ));
    setEditingId(null);
  };

  // Fungsi Hapus Divisi
  const handleDelete = (divisi) => {
    // 1. Cek apakah ada karyawan yang menggunakan divisi ini
    // Asumsi properti di karyawanList bernama 'division' atau 'departemen'
    const isUsed = karyawanList.some(
      (emp) => emp.division === divisi.name || emp.departemen === divisi.name
    );

    if (isUsed) {
      alert(`Gagal menghapus! Divisi "${divisi.name}" masih digunakan oleh karyawan aktif.`);
      return;
    }

    // 2. Jika aman, lakukan penghapusan
    if (window.confirm(`Yakin ingin menghapus divisi ${divisi.name}?`)) {
      setDivisiList(divisiList.filter(div => div.id !== divisi.id));
    }
  };

  return (
    <div className="card_data_divisi">
      {/* HEADER */}
      <div className="header_data_divisi">
        <div className="header-info_data_divisi">
          <div className="title-wrapper_data_divisi">
            {/* Icon Hierarchy SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon_data_divisi">
              <path d="M17 17.5C17 18.8807 15.8807 20 14.5 20C13.1193 20 12 18.8807 12 17.5C12 16.1193 13.1193 15 14.5 15C15.8807 15 17 16.1193 17 17.5ZM17 17.5H22M12 17.5H7M10 6.5C10 7.88071 8.88071 9 7.5 9C6.11929 9 5 7.88071 5 6.5C5 5.11929 6.11929 4 7.5 4C8.88071 4 10 5.11929 10 6.5ZM10 6.5H19M7.5 9V15M7.5 15C8.88071 15 10 16.1193 10 17.5C10 18.8807 8.88071 20 7.5 20C6.11929 20 5 18.8807 5 17.5C5 16.1193 6.11929 15 7.5 15Z" stroke="#124a35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Manajemen Divisi</h2>
          </div>
          <p>Kelola daftar divisi departemen untuk karyawan.</p>
        </div>
        
        <div className="header-actions_data_divisi">
          <input 
            type="text" 
            placeholder="Nama Divisi Baru..." 
            value={newDivisiName}
            onChange={(e) => setNewDivisiName(e.target.value)}
            className="input-new_data_divisi"
          />
          <button className="btn-add_data_divisi" onClick={handleAddDivisi}>
            + Tambah
          </button>
        </div>
      </div>

      {/* TABLE/LIST */}
      <div className="list-container_data_divisi">
        <div className="list-header_data_divisi">
          <span>NAMA DIVISI / DEPARTEMEN</span>
          <span>AKSI</span>
        </div>

        <div className="list-body_data_divisi">
          {divisiList.map((divisi) => (
            <div className="list-row_data_divisi" key={divisi.id}>
              
              {/* Kolom Nama / Mode Edit */}
              <div className="row-name_data_divisi">
                {editingId === divisi.id ? (
                  <input 
                    type="text" 
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="input-edit_data_divisi"
                    autoFocus
                  />
                ) : (
                  <span className="divisi-name-text_data_divisi">{divisi.name}</span>
                )}
              </div>

              {/* Kolom Aksi */}
              <div className="row-actions_data_divisi">
                {editingId === divisi.id ? (
                  <button className="btn-save-edit_data_divisi" onClick={() => handleSaveEdit(divisi.id)}>
                    Simpan
                  </button>
                ) : (
                  <>
                    <button className="btn-action-edit_data_divisi" onClick={() => handleStartEdit(divisi)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      Edit
                    </button>
                    <button className="btn-action-delete_data_divisi" onClick={() => handleDelete(divisi)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      Hapus
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          
          {divisiList.length === 0 && (
            <div className="empty-state_data_divisi">Belum ada data divisi.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataDivisi;