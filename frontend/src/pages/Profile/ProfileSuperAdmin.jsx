import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';
import { MOCK_PROFILE_DATA } from './data/profileMockData';

const ProfileSuperAdmin = () => (
  <ProfilePageBase currentUserRole={ROLES.SUPER_ADMIN} mockData={MOCK_PROFILE_DATA.superAdmin} />
);

export default ProfileSuperAdmin;
