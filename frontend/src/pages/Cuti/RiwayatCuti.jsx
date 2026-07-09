import React from 'react';
import { Link } from 'react-router-dom';

const leaveData = [
  { id: 1, name: 'Sari Indah', role: 'HR Admin', type: 'Sakit', period: '22 Jun 2026 - 23 Jun 2026', days: '2h', reason: 'Demam dan Flu', submitted: '21 Jun 2026', status: 'Disetujui', initials: 'SI', color: 'bg-indigo-600' },
  { id: 2, name: 'Dewi Lestari', role: 'Marketing', type: 'Cuti Tahunan', period: '1 Jul 2026 - 5 Jul 2026', days: '5h', reason: 'Liburan Keluarga', submitted: '20 Jun 2026', status: 'Menunggu', initials: 'DL', color: 'bg-purple-600' },
  { id: 3, name: 'Andi Saputra', role: 'Engineering', type: 'Keperluan Pribadi', period: '25 Jun 2026 - 26 Jun 2026', days: '1h', reason: 'Urusan keluarga mendadak', submitted: '22 Jun 2026', status: 'Menunggu', initials: 'AS', color: 'bg-cyan-500' },
];

const stats = [
  { label: 'Total', count: 6, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Disetujui', count: 2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Menunggu', count: 3, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Ditolak', count: 1, color: 'text-rose-600', bg: 'bg-rose-50' },
];

export default function Cuti() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Pengajuan Cuti</h2>
          <p className="text-sm text-gray-500">Kelola dan pantau semua permohonan cuti karyawan</p>
        </div>
        <div className="flex gap-3">
          {/* Contoh navigasi ke sub-menu Riwayat Cuti */}
          <Link to="/cuti/riwayat" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Riwayat Cuti
          </Link>
          <button className="bg-[#1e345e] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <i className="fa-solid fa-plus"></i> Ajukan Cuti
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-4 flex-1 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {['Semua', 'Menunggu 3', 'Disetujui 2', 'Ditolak 1'].map((tab, i) => (
          <button key={tab} className={`px-4 py-1.5 rounded-full text-xs font-medium ${i === 0 ? 'bg-[#1e345e] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{tab}</button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[11px] uppercase text-gray-400 font-bold border-b border-gray-200">
              <th className="px-6 py-4">Karyawan</th>
              <th className="px-6 py-4">Jenis</th>
              <th className="px-6 py-4">Periode</th>
              <th className="px-6 py-4 text-center">Hari</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {leaveData.map((leave) => (
              <tr key={leave.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${leave.color} text-white flex items-center justify-center text-[10px] font-bold`}>{leave.initials}</div>
                    <div><div className="font-semibold text-gray-800 text-xs">{leave.name}</div></div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs">{leave.type}</td>
                <td className="px-6 py-4 text-xs text-gray-600">{leave.period}</td>
                <td className="px-6 py-4 text-center text-xs font-medium">{leave.days}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${leave.status === 'Disetujui' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-amber-500 bg-amber-50 border-amber-100'}`}>
                    {leave.status}
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