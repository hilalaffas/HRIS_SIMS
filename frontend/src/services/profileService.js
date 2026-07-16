import { api, toApiUrl } from './api';

export const getMyProfile = async () => {
  const profile = await api.get('/api/profile/me');
  return { ...profile, photoUrl: toApiUrl(profile.photoUrl) };
};

export const updateMyProfile = (profile, photoFile) => {
  const formData = new FormData();
  Object.entries(profile).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  if (photoFile) formData.append('photo', photoFile);
  return api.putForm('/api/profile/me', formData).then((profile) => ({
    ...profile,
    photoUrl: toApiUrl(profile.photoUrl),
  }));
};

export const changeMyPassword = (oldPassword, newPassword, confirmPassword) =>
  api.put('/api/auth/change-password', { oldPassword, newPassword, confirmPassword });
