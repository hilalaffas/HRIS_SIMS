// src/pages/Pengajuan/components/PengajuanTabMenu.jsx
//
// Tab menu halaman Pengajuan -- tampilannya mengikuti TabMenuKaryawan (teks
// tab + garis hijau di bawah tab aktif), tetapi generik: daftar tab datang
// dari props, bukan string yang ditulis langsung di komponen.
// Mendukung navigasi keyboard (panah kiri/kanan, Home, End) dan atribut ARIA.
//
// Juga mengekspor <PengajuanTabPanel>: pembungkus isi tab. Panel yang tidak aktif
// tetap ter-mount (hanya disembunyikan) supaya isian form tidak hilang saat
// pengguna berpindah tab; animasi masuk berputar ulang setiap panel ditampilkan.
//
// Contoh pemakaian:
// <PengajuanTabMenu tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
// <PengajuanTabPanel tabKey="LEAVE" activeKey={activeTab}>...</PengajuanTabPanel>
import React, { useRef } from 'react';
import './PengajuanTabMenu.css';

const getTabId = (tabKey) => `pgj-tab-${tabKey}`;
const getPanelId = (tabKey) => `pgj-panel-${tabKey}`;

export default function PengajuanTabMenu({ tabs, activeKey, onChange }) {
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
    <div className="pgj-tab-menu" role="tablist" aria-label="Jenis pengajuan" onKeyDown={handleKeyDown}>
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
            className={`pgj-tab-item${isActive ? ' is-active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function PengajuanTabPanel({ tabKey, activeKey, children }) {
  return (
    <div
      role="tabpanel"
      id={getPanelId(tabKey)}
      aria-labelledby={getTabId(tabKey)}
      className="pgj-tab-panel"
      hidden={tabKey !== activeKey}
    >
      {children}
    </div>
  );
}
