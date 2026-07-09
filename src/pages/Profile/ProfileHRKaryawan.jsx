import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';
import { MOCK_PROFILE_DATA } from './data/profileMockData';

const ProfileHRKaryawan = () => (
  <ProfilePageBase currentUserRole={ROLES.HRD_KARYAWAN} mockData={MOCK_PROFILE_DATA.hrKaryawan} />
);

export default ProfileHRKaryawan;
