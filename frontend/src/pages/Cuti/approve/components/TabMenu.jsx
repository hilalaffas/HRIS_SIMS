import React from 'react';
import './TabMenu.css';

/**
 * TabMenu.jsx
 * ------------------------------------------------------------------
 * Sesuai gambar `listmenu.PNG`: tab "Perlu Diproses" (dengan badge
 * jumlah) dan "List Cuti".
 *
 * Props:
 *  - tabs: [{ key, label, badge }]
 *  - activeKey: string
 *  - onChange: (key) => void
 * ------------------------------------------------------------------
 */
const TabMenu = ({ tabs, activeKey, onChange }) => {
  return (
    <div className="tab-menu" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-menu__item ${isActive ? "is-active" : ""}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            {!!tab.badge && <span className="tab-menu__badge">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default TabMenu;
