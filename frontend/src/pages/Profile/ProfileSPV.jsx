import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';
import { MOCK_PROFILE_DATA } from './data/profileMockData';

const ProfileSPV = () => (
  <ProfilePageBase currentUserRole={ROLES.SPV} mockData={MOCK_PROFILE_DATA.spv} />
);

export default ProfileSPV;
