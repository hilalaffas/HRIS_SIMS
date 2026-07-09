// src/services/holidayService.js
import { LOCAL_HOLIDAYS_2026 } from '../constants/holidays';

/**
 * Mengambil data libur nasional berdasarkan tahun tertentu.
 * Otomatis menggabungkan data API eksternal dengan data lokal cadangan.
 * * @param {number} year - Tahun kalender yang ingin dicari
 * @returns {Promise<Object>} Object Map tanggal merah { "YYYY-MM-DD": "Nama Libur" }
 */
export const getHolidaysByYear = async (year) => {
  try {
    const response = await fetch(`https://dayoffapi.vercel.app/api?year=${year}`);
    
    if (!response.ok) {
      throw new Error("Respon API tidak sukses.");
    }
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      const holidayMap = {};
      
      data.forEach(item => {
        // Ambil format YYYY-MM-DD saja dari string tanggal API
        const dateKey = item.date.split('T')[0];
        holidayMap[dateKey] = item.name;
      });
      
      // Gabungkan data lokal 2026 dengan data API agar makin akurat
      return { ...LOCAL_HOLIDAYS_2026, ...holidayMap };
    }
    
    return LOCAL_HOLIDAYS_2026;
  } catch (error) {
    console.warn("[HolidayService] Gagal memuat API, beralih ke database lokal:", error.message);
    
    // Penyelamat jika user offline atau API ngambek/CORS error
    return LOCAL_HOLIDAYS_2026;
  }
};