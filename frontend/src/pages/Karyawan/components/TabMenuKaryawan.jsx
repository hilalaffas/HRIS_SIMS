import React from 'react';
import './TabMenuKaryawan.css';
import { isSuperAdmin, isHrAdmin } from '../../../utils/roles';

const TabMenuKaryawan = ({ activeTab, setActiveTab, user }) => {
  const tabs = isSuperAdmin(user)
    ? ['List Karyawan', 'Cuti Karyawan', 'Data Divisi', 'Log Sistem']
    : isHrAdmin(user) ? ['List Karyawan', 'Cuti Karyawan', 'Data Divisi', 'Log Sistem'] : [];

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
