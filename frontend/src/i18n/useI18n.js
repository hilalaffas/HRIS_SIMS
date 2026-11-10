// src/i18n/useI18n.js
import { useContext } from 'react';
import { I18nContext } from './I18nContext';

// const { t, tRich, lang, setLang, formatDate } = useI18n();
export default function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n harus dipakai di dalam <I18nProvider>.');
  return context;
}
