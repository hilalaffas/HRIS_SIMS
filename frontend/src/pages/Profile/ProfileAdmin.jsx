import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';


const ProfileAdmin = () => (
  <ProfilePageBase currentUserRole={ROLES.HRD_ADMIN}/>
);

export default ProfileAdmin;
