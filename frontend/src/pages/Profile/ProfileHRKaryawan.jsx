import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';

const ProfileHRKaryawan = () => (
  <ProfilePageBase currentUserRole={ROLES.HRD_KARYAWAN}/>
);

export default ProfileHRKaryawan;
