import { FIELD_CONFIG } from '../config/profileFieldConfig.js';

const API_FIELDS = {
  namaLengkap: 'fullName', alamatLengkap: 'address', email: 'email',
  nomorTelepon: 'phoneNumber', nomorTeleponDarurat: 'emergencyContactPhone',
  hubunganDarurat: 'emergencyContactRelationship',
};

export function getProfileChanges(original, draft, role) {
  const changedFields = FIELD_CONFIG.filter(cfg => API_FIELDS[cfg.key]
    && !cfg.lockedFor?.includes(role)
    && String(draft[cfg.key] ?? '') !== String(original[cfg.key] ?? ''));
  const payload = Object.fromEntries(changedFields.map(cfg => [API_FIELDS[cfg.key], draft[cfg.key] ?? '']));
  return { changedFields, payload };
}
