import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';

// [BARU] Halaman profil untuk akun dev (role DEV).
const ProfileDev = () => (
  <ProfilePageBase currentUserRole={ROLES.DEV}/>
);

export default ProfileDev;
