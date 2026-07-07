import React, { useState } from 'react';

const attendanceData = [
  { id: 'A001', name: 'Andi Saputra', dept: 'Engineering', date: '22 Jun 2026', in: '08:02', out: '17:10', status: 'Hadir', initials: 'AS', avatarColor: 'bg-cyan-500', deptColor: 'text-blue-600 bg-blue-50' },
  { id: 'A002', name: 'Dewi Lestari', dept: 'Marketing', date: '22 Jun 2026', in: '08:45', out: '17:30', status: 'Terlambat', initials: 'DL', avatarColor: 'bg-purple-600', deptColor: 'text-pink-600 bg-pink-50' },
  { id: 'A003', name: 'Budi Hartono', dept: 'Finance', date: '22 Jun 2026', in: '07:58', out: '17:00', status: 'Hadir', initials: 'BH', avatarColor: 'bg-indigo-500', deptColor: 'text-emerald-600 bg-emerald-50' },
  { id: 'A004', name: 'Sari Indah', dept: 'HR', date: '22 Jun 2026', in: '-', out: '-', status: 'Izin', initials: 'SI', avatarColor: 'bg-indigo-600', deptColor: 'text-yellow-600 bg-yellow-50' },
  { id: 'A005', name: 'Reza Firmansyah', dept: 'Engineering', date: '22 Jun 2026', in: '08:05', out: '18:20', status: 'Hadir', initials: 'RF', avatarColor: 'bg-emerald-500', deptColor: 'text-blue-600 bg-blue-50' },
  { id: 'A006', name: 'Nina Oktavia', dept: 'Design', date: '22 Jun 2026', in: '09:15', out: '17:45', status: 'Terlambat', initials: 'NO', avatarColor: 'bg-pink-500', deptColor: 'text-purple-600 bg-purple-50' },
  { id: 'A007', name: 'Fajar Nugroho', dept: 'Operations', date: '22 Jun 2026', in: '-', out: '-', status: 'Alfa', initials: 'FN', avatarColor: 'bg-cyan-500', deptColor: 'text-cyan-600 bg-cyan-50' },
  { id: 'A008', name: 'Laila Putri', dept: 'Marketing', date: '22 Jun 2026', in: '07:55', out: '17:00', status: 'Hadir', initials: 'LP', avatarColor: 'bg-indigo-500', deptColor: 'text-pink-600 bg-pink-50' },
];

const filters = ['Semua', 'Hadir', 'Terlambat', 'Izin', 'Alfa'];

export default function Absensi() {
  const [activeFilter, setActiveFilter] = useState('Semua');

  const getStatusColor = (status) => {
    switch(status) {
      case 'Hadir': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'Terlambat': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'Izin': return 'text-blue-500 bg-blue-50 border-blue-100';
      case 'Alfa': return 'text-rose-500 bg-rose-50 border-rose-100';
      default: return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Absensi Karyawan</h2>
          <p className="text-sm text-gray-500">Rekap kehadiran harian seluruh karyawan</p>
        </div>
        <button className="bg-[#1e345e] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <i className="fa-solid fa-plus"></i> Tambah Absensi
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
          <input 
            type="text" 
            placeholder="Cari karyawan..." 
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeFilter === filter 
                  ? 'bg-[#1e345e] text-white font-medium' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[11px] uppercase text-gray-500 font-bold border-b border-gray-200">
              <th className="px-6 py-4 font-semibold">#</th>
              <th className="px-6 py-4 font-semibold">KARYAWAN</th>
              <th className="px-6 py-4 font-semibold">DEPARTEMEN</th>
              <th className="px-6 py-4 font-semibold">TANGGAL</th>
              <th className="px-6 py-4 font-semibold">MASUK</th>
              <th className="px-6 py-4 font-semibold">KELUAR</th>
              <th className="px-6 py-4 font-semibold">STATUS</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {attendanceData.map((data) => (
              <tr key={data.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-xs text-gray-400">{data.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${data.avatarColor} text-white flex items-center justify-center text-[10px] font-bold`}>
                      {data.initials}
                    </div>
                    <div className="font-semibold text-gray-800 text-sm">{data.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${data.deptColor}`}>
                    {data.dept}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">{data.date}</td>
                <td className="px-6 py-4 text-xs font-medium text-gray-600">
                  <span className="text-emerald-500 mr-1">→</span> {data.in}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-gray-600">
                  <span className="text-rose-500 mr-1">←</span> {data.out}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded text-[10px] font-bold border ${getStatusColor(data.status)}`}>
                    {data.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 