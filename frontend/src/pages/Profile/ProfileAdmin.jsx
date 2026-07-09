import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';
import { MOCK_PROFILE_DATA } from './data/profileMockData';

const ProfileAdmin = () => (
  <ProfilePageBase currentUserRole={ROLES.HRD_ADMIN} mockData={MOCK_PROFILE_DATA.hrAdmin} />
);

export default ProfileAdmin;
