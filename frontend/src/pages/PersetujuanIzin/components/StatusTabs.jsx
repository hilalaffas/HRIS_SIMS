// src/pages/PersetujuanIzin/components/StatusTabs.jsx
//
// [BARU] Tab status Menunggu / Disetujui / Ditolak (badge jumlah hanya di Menunggu).
import React from 'react';
import './StatusTabs.css';

function StatusTabs({ tabs, activeKey, pendingCount, onChange }) {
  return (
    <div className="pzn-tabs" role="tablist" aria-label="Status pengajuan">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`pzn-tab${active ? ' is-active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            {tab.key === 'PENDING' && pendingCount > 0 && (
              <span className="pzn-tab__badge">{pendingCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default React.memo(StatusTabs);
