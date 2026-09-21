import React from 'react';
import ProfilePageBase from './ProfilePageBase';
import { ROLES } from './config/profileFieldConfig';

const ProfileStaff = () => (
  <ProfilePageBase currentUserRole={ROLES.STAFF}/>
);

export default ProfileStaff;
