import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';

const ProfileSuperAdmin = () => (
  <ProfilePageBase currentUserRole={ROLES.SUPER_ADMIN}/>
);

export default ProfileSuperAdmin;
