import React from 'react';
import './TabMenuKaryawan.css';

const TabMenuKaryawan = ({ activeTab, setActiveTab }) => {
  const tabs = ['List Karyawan', 'Cuti Karyawan', 'Data Divisi', 'Log Sistem'];

  return (
    <div className="tab-menu-container">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`tab-item ${activeTab === tab ? 'active' : ''}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default TabMenuKaryawan;