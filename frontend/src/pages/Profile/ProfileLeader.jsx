import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';

const ProfileLeader = () => (
  <ProfilePageBase currentUserRole={ROLES.LEADER} />
);

export default ProfileLeader;
