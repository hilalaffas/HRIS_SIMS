import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';

const ProfileManager = () => (
  <ProfilePageBase currentUserRole={ROLES.MANAGER}/>
);

export default ProfileManager;
