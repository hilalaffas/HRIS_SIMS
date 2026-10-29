// src/pages/Laporan/components/LaporanTabMenu.jsx
//
// [BARU] Tab menu halaman Laporan -- gaya sama dengan PengajuanTabMenu (teks
// tab + garis hijau tumbuh di bawah tab aktif). Daftar tab dari props.
// Mendukung navigasi keyboard (panah kiri/kanan, Home, End) dan atribut ARIA.
//
// Contoh pemakaian:
// <LaporanTabMenu tabs={REPORT_TABS} activeKey={activeTab} onChange={setActiveTab} />
// <LaporanTabPanel tabKey="ATTENDANCE" activeKey={activeTab}>...</LaporanTabPanel>
import React, { useRef } from 'react';
import './LaporanTabMenu.css';

const getTabId = (tabKey) => `lpr-tab-${tabKey}`;
const getPanelId = (tabKey) => `lpr-panel-${tabKey}`;

export default function LaporanTabMenu({ tabs, activeKey, onChange }) {
  const tabRefs = useRef({});

  const focusTab = (tabKey) => {
    onChange(tabKey);
    tabRefs.current[tabKey]?.focus();
  };

  const handleKeyDown = (event) => {
    const currentIndex = tabs.findIndex((tab) => tab.key === activeKey);
    const lastIndex = tabs.length - 1;
    const nextIndexByKey = {
      ArrowRight: currentIndex >= lastIndex ? 0 : currentIndex + 1,
      ArrowLeft: currentIndex <= 0 ? lastIndex : currentIndex - 1,
      Home: 0,
      End: lastIndex,
    };
    if (!(event.key in nextIndexByKey)) return;
    event.preventDefault();
    focusTab(tabs[nextIndexByKey[event.key]].key);
  };

  return (
    <div className="lpr-tab-menu" role="tablist" aria-label="Jenis laporan" onKeyDown={handleKeyDown}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            ref={(node) => { tabRefs.current[tab.key] = node; }}
            type="button"
            role="tab"
            id={getTabId(tab.key)}
            aria-selected={isActive}
            aria-controls={getPanelId(tab.key)}
            tabIndex={isActive ? 0 : -1}
            className={`lpr-tab-item${isActive ? ' is-active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function LaporanTabPanel({ tabKey, activeKey, children }) {
  if (tabKey !== activeKey) return null;
  return (
    <div role="tabpanel" id={getPanelId(tabKey)} aria-labelledby={getTabId(tabKey)} className="lpr-tab-panel">
      {children}
    </div>
  );
}
