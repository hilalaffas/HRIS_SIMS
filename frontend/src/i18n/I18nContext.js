// src/i18n/I18nContext.js
// Context object dipisah dari Provider supaya aturan react-refresh (hanya
// export komponen dari file .jsx) tetap terpenuhi.
import { createContext } from 'react';

export const I18nContext = createContext(null);
