import React, { useState } from 'react';

const employeeData = [
  { id: 'E001', name: 'Andi Saputra', role: 'Senior Engineer', dept: 'Engineering', date: '12 Mar 2021', email: 'andi.s@perusahaan.co.id', initials: 'AS', avatarColor: 'bg-cyan-500', deptColor: 'text-blue-600 bg-blue-50', status: 'Aktif' },
  { id: 'E002', name: 'Dewi Lestari', role: 'Marketing Manager', dept: 'Marketing', date: '5 Jan 2020', email: 'dewi.l@perusahaan.co.id', initials: 'DL', avatarColor: 'bg-purple-600', deptColor: 'text-pink-600 bg-pink-50', status: 'Aktif' },
  { id: 'E003', name: 'Budi Hartono', role: 'Finance Analyst', dept: 'Finance', date: '22 Jul 2022', email: 'budi.h@perusahaan.co.id', initials: 'BH', avatarColor: 'bg-indigo-500', deptColor: 'text-emerald-600 bg-emerald-50', status: 'Aktif' },
  { id: 'E004', name: 'Sari Indah', role: 'HR Specialist', dept: 'HR', date: '14 Feb 2019', email: 'sari.i@perusahaan.co.id', initials: 'SI', avatarColor: 'bg-indigo-600', deptColor: 'text-yellow-600 bg-yellow-50', status: 'Aktif' },
  { id: 'E005', name: 'Reza Firmansyah', role: 'Backend Developer', dept: 'Engineering', date: '3 Sep 2023', email: 'reza.f@perusahaan.co.id', initials: 'RF', avatarColor: 'bg-emerald-500', deptColor: 'text-blue-600 bg-blue-50', status: 'Aktif' },
  { id: 'E006', name: 'Nina Oktavia', role: 'UI/UX Designer', dept: 'Design', date: '18 Nov 2021', email: 'nina.o@perusahaan.co.id', initials: 'NO', avatarColor: 'bg-pink-500', deptColor: 'text-purple-600 bg-purple-50', status: 'Aktif' },
  { id: 'E007', name: 'Fajar Nugroho', role: 'Operations Lead', dept: 'Operations', date: '7 Jun 2018', email: 'fajar.n@perusahaan.co.id', initials: 'FN', avatarColor: 'bg-cyan-500', deptColor: 'text-cyan-600 bg-cyan-50', status: 'Nonaktif' },
  { id: 'E008', name: 'Laila Putri', role: 'Content Strategist', dept: 'Marketing', date: '29 Apr 2022', email: 'laila.p@perusahaan.co.id', initials: 'LP', avatarColor: 'bg-indigo-500', deptColor: 'text-pink-600 bg-pink-50', status: 'Aktif' },
];

const filters = ['Semua', 'Engineering', 'Marketing', 'Finance', 'HR', 'Design', 'Operations'];

export default function Karyawan() {
  const [activeFilter, setActiveFilter] = useState('Semua');

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Data Karyawan</h2>
          <p className="text-sm text-gray-500">7 karyawan aktif dari 8 total</p>
        </div>
        <button className="bg-[#1e345e] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <i className="fa-solid fa-plus"></i> Tambah Karyawan
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
          <input type="text" placeholder="Cari nama atau jabatan..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (
            <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeFilter === filter ? 'bg-[#1e345e] text-white font-medium' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {employeeData.map((emp) => (
          <div key={emp.id} className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow ${emp.status === 'Nonaktif' ? 'opacity-75' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <div className={`w-10 h-10 rounded-full ${emp.avatarColor} text-white flex items-center justify-center font-bold`}>{emp.initials}</div>
              <span className={`text-xs font-semibold ${emp.status === 'Aktif' ? 'text-emerald-500' : 'text-gray-400'}`}>{emp.status}</span>
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">{emp.name}</h3>
            <p className="text-xs text-gray-500 mb-4">{emp.role}</p>
            <div className="space-y-3 text-[11px] border-t border-gray-100 pt-3">
              <div className="flex justify-between items-center"><span className="text-gray-500">Departemen</span><span className={`px-2 py-0.5 rounded font-medium ${emp.deptColor}`}>{emp.dept}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">ID</span><span className="font-medium text-gray-800">{emp.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Bergabung</span><span className="font-medium text-gray-800">{emp.date}</span></div>
              <div className="text-gray-400 mt-2 truncate text-[10px]">{emp.email}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}