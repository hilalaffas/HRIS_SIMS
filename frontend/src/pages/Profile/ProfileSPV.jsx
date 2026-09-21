import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';

const ProfileSPV = () => (
  <ProfilePageBase currentUserRole={ROLES.SPV} />
);

export default ProfileSPV;
