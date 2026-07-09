import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';
import { MOCK_PROFILE_DATA } from './data/profileMockData';

const ProfileStaff = () => (
  <ProfilePageBase currentUserRole={ROLES.STAFF} mockData={MOCK_PROFILE_DATA.staff} />
);

export default ProfileStaff;
