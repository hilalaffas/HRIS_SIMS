import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';
import { MOCK_PROFILE_DATA } from './data/profileMockData';

const ProfileManager = () => (
  <ProfilePageBase currentUserRole={ROLES.MANAGER} mockData={MOCK_PROFILE_DATA.manager} />
);

export default ProfileManager;
