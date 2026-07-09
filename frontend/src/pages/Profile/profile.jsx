import React from 'react';
import ProfileStaff from './ProfileStaff';
import ProfileLeader from './ProfileLeader';
import ProfileSPV from './ProfileSPV';
import ProfileManager from './ProfileManager';
import ProfileHRKaryawan from './ProfileHRKaryawan';
import ProfileAdmin from './ProfileAdmin';
import ProfileSuperAdmin from './ProfileSuperAdmin';
import { ROLES } from './config/profileFieldConfig';

// Peta role -> komponen. Sinkron dengan MOCK_USERS di authService.js.
// Tinggal ditambah kalau ada role baru di masa depan.
const PROFILE_BY_ROLE = {
  [ROLES.STAFF]: ProfileStaff,           // 'Member'
  [ROLES.LEADER]: ProfileLeader,         // 'Leader'
  [ROLES.SPV]: ProfileSPV,               // 'SPV'
  [ROLES.MANAGER]: ProfileManager,       // 'Manager'
  [ROLES.HRD_KARYAWAN]: ProfileHRKaryawan, // 'HRD_Karyawan'
  [ROLES.HRD_ADMIN]: ProfileAdmin,       // 'HRD_Admin'
  [ROLES.SUPER_ADMIN]: ProfileSuperAdmin, // 'SUPER_ADMIN'
};

// `role` didapat dari user yang sedang login, contoh:
//   const user = await loginUser(username, password); // authService.js
//   <Profile role={user.role} />
// atau dari auth context/session di project Anda, misal:
//   const { role } = useAuth();
const Profile = ({ role }) => {
  const ProfileComponent = PROFILE_BY_ROLE[role];

  if (!ProfileComponent) {
    return (
      <div className="profile-page-container">
        <p style={{ padding: 40 }}>Role "{role}" tidak dikenali / belum didukung.</p>
      </div>
    );
  }

  return <ProfileComponent />;
};

export default Profile;
