// src/components/LanguageSwitcher.jsx
// Pemilih bahasa (Indonesia / 日本語). Murni presentasional: state bahasa ada di
// i18n/I18nProvider. Dipakai di Navbar (variant "default") dan halaman Login
// (variant "floating").
//
// Aksesibilitas: radiogroup dengan roving tabindex -- Tab masuk ke pilihan
// aktif, tombol panah berpindah pilihan.
import React from 'react';
import useI18n from '../i18n/useI18n';
import './LanguageSwitcher.css';

export default function LanguageSwitcher({ variant = 'default' }) {
  const { lang, setLang, languages, t } = useI18n();

  const handleKeyDown = (event, index) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const next = languages[(index + step + languages.length) % languages.length];
    setLang(next.code);
    // Fokus ikut pindah ke tombol yang baru aktif.
    event.currentTarget.parentElement
      ?.querySelector(`[data-lang="${next.code}"]`)
      ?.focus();
  };

  return (
    <div
      className={`lang-switch lang-switch--${variant}`}
      role="radiogroup"
      aria-label={t('lang.label')}
    >
      {languages.map((item, index) => {
        const isActive = item.code === lang;
        return (
          <button
            key={item.code}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            data-lang={item.code}
            lang={item.code}
            className={`lang-switch__option${isActive ? ' is-active' : ''}`}
            title={t('lang.switchTo', { language: item.label })}
            onClick={() => setLang(item.code)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.short}
          </button>
        );
      })}
    </div>
  );
}
