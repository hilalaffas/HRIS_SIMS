// src/pages/DevSettings/components/DevTabBar.jsx
//
// [BARU] Bar tab yang dipakai ulang di halaman dev: tab utama (DevSettings.jsx) dan sub-tab di
// dalam satu menu (mis. Saldo Cuti -> Edit / Import / Export). Panel yang tidak aktif cukup
// disembunyikan (DevTabPanel) sehingga isian yang belum disimpan tidak hilang saat pindah tab.
//
// Contoh pemakaian:
//   const [tab, setTab] = useState('edit');
//   <DevTabBar tabs={[{ id: 'edit', label: 'Edit' }]} activeId={tab} onChange={setTab} label="Saldo cuti" variant="sub" />
//   <DevTabPanel activeId={tab} id="edit">...</DevTabPanel>
import React from 'react';

export function DevTabBar({ tabs, activeId, onChange, label, variant = 'main' }) {
  return (
    <div
      className={`devsettings-tabs${variant === 'sub' ? ' devsettings-tabs--sub' : ''}`}
      role="tablist"
      aria-label={label}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`devtab-${tab.id}`}
          aria-selected={activeId === tab.id}
          aria-controls={`devpanel-${tab.id}`}
          className={`devsettings-tab${activeId === tab.id ? ' is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function DevTabPanel({ activeId, id, children }) {
  return (
    <div role="tabpanel" id={`devpanel-${id}`} aria-labelledby={`devtab-${id}`} hidden={activeId !== id}>
      {children}
    </div>
  );
}
