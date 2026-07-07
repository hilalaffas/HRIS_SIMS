import React, { useState } from 'react';
import ApprovalSection from './approve/components/ApprovalSection';
import LeaveListSection from './approve/components/ListSection'; // Sesuaikan nama file import-nya
import { allLeaveHistory, sisaCutiInfo } from './approve/data/mockData'; // Sesuaikan path-nya

const ManagementCuti = () => {
  // 1. Simpan seluruh data mock ke dalam Local State Komponen Induk
  const [leaveData, setLeaveData] = useState(allLeaveHistory);

  // 2. Filter data khusus untuk dilempar ke ApprovalSection 
  // (Hanya tampilkan yang statusnya "PROSES")
  const pendingApprovals = leaveData.filter(
    (item) => item.statusBerkas === "PROSES"
  );

  // 3. Fungsi yang akan dieksekusi saat tombol ACC/Revisi/Tolak diklik
  const handleApprovalAction = (id, actionType) => {
    // Tentukan status baru berdasarkan tombol apa yang diklik
    let newStatus = "";
    if (actionType === "acc") newStatus = "DISETUJUI";
    else if (actionType === "revisi") newStatus = "DIKEMBALIKAN";
    else if (actionType === "tolak") newStatus = "DITOLAK";

    // Lakukan update pada state data
    const updatedData = leaveData.map((item) => {
      // Cari data yang ID-nya cocok dengan yang diklik
      if (item.id === id) {
        return {
          ...item,
          statusBerkas: newStatus, // Ubah statusnya
          // (Opsional) Anda juga bisa nambahin log aktivitas baru ke item.riwayatLog di sini
        };
      }
      return item; // Biarkan data lain yang tidak diklik tetap sama
    });

    // Simpan perubahan ke State! 
    // Otomatis ApprovalSection & LeaveListSection akan re-render (terupdate)
    setLeaveData(updatedData);
  };

  // 4. (Opsional) Fungsi untuk membuka modal detail
  const handleOpenDetail = (item) => {
    console.log("Buka modal untuk:", item.karyawan.nama);
    // Masukkan logika set state modal detail Anda di sini
  };

  return (
    <div className="managementCutiPage">
      {/* Section 1: Approval
        Kita hanya melempar `pendingApprovals` (Data yang PROSES saja).
        Ketika tombol diklik, dia akan memanggil `handleApprovalAction`.
      */}
      <ApprovalSection 
        data={pendingApprovals} 
        sisaCuti={sisaCutiInfo}
        onAction={handleApprovalAction} 
        onOpenDetail={handleOpenDetail}
      />

      <hr style={{ margin: '32px 0' }} />

      {/* Section 2: Semua Riwayat
        Kita melempar `leaveData` (Semua Data termasuk yang sudah berubah status).
      */}
      <LeaveListSection 
        data={leaveData} 
        sisaCuti={sisaCutiInfo}
        onOpenDetail={handleOpenDetail}
      />
    </div>
  );
};

export default ManagementCuti;