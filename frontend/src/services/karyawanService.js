// src/services/karyawanService.js
import { api, getStoredToken } from './api'; // Import dari folder yang sama

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// 1. CREATE / REGISTER (Khusus FormData, bypass JSON.stringify dari api.js)
export const registerKaryawan = async (formData) => {
    const token = getStoredToken();
    
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
            // PENTING: Jangan tulis 'Content-Type': 'multipart/form-data'
            // Biarkan browser mengisinya otomatis agar terbentuk boundary yang benar.
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
    });

    const rawText = await response.text();
    let data = rawText;
    try { data = JSON.parse(rawText); } catch(e) {}

    if (!response.ok) {
        throw new Error(data.message || data || 'Gagal mendaftarkan karyawan');
    }
    return data;
};

// 2. GET LIST (Bisa langsung pakai wrapper api.js)
export const getKaryawanList = () => {
    return api.get('/api/karyawan'); // Ganti dengan endpoint Get All Karyawan Anda
};

// 3. UPDATE
export const updateKaryawan = (id, data) => {
    return api.put(`/api/employees/${id}`, data);
};

// 4. DELETE
export const deleteKaryawan = (id) => {
    return api.delete(`/api/employees/${id}`);
};