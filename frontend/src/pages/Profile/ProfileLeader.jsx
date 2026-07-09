import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';
import { MOCK_PROFILE_DATA } from './data/profileMockData';

const ProfileLeader = () => (
  <ProfilePageBase currentUserRole={ROLES.LEADER} mockData={MOCK_PROFILE_DATA.leader} />
);

export default ProfileLeader;
