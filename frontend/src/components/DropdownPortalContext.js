// src/components/DropdownPortalContext.js
//
// [BARU] Saklar opt-in untuk <Dropdown>. Secara default daftar pilihan dropdown
// digambar di tempatnya (position: absolute) -- itu terpotong kalau dropdown
// berada di dalam wadah yang bisa di-scroll (mis. popup formulir panjang), karena
// wadah itu memotong apa pun yang keluar dari batasnya. Membungkus area popup
// dengan <DropdownPortalContext.Provider value> membuat semua Dropdown di
// dalamnya menggambar daftar pilihannya di luar wadah (fixed + otomatis membuka
// ke atas bila ruang bawah sempit). Tanpa Provider, perilaku Dropdown tidak berubah.
//
// Contoh pemakaian:
// <DropdownPortalContext.Provider value>
//   <LeaveForm ... />
// </DropdownPortalContext.Provider>
import { createContext } from 'react';

export const DropdownPortalContext = createContext(false);
