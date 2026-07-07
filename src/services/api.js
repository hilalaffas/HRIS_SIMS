// Menggunakan fetch (atau Anda bisa install axios)
const BASE_URL = 'http://localhost:5000/api'; // Ganti dengan URL backend Anda

export const fetchLeaveStats = async (userId) => {
  // Contoh fungsi yang siap disambungkan ke backend
  try {
    const response = await fetch(`${BASE_URL}/leave-stats/${userId}`);
    if (!response.ok) throw new Error('Gagal mengambil data cuti');
    return await response.json();
  } catch (error) {
    console.error(error);
    // Mengembalikan data dummy sementara backend belum siap
    return { annualLeave: 8, companyQuota: 3 }; 
  }
};