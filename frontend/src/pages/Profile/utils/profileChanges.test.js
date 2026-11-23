import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getProfileChanges } from './profileChanges.js';
import { ROLES } from '../config/profileFieldConfig.js';
import { validateRequired } from '../../../utils/validation.js';

for (const role of Object.values(ROLES)) {
  test(`${role}: password-only save has no profile fields or required profile validation`, () => {
    const original = { email: 'user@example.com', nomorTeleponDarurat: '', hubunganDarurat: '' };
    const change = getProfileChanges(original, { ...original }, role);
    assert.deepEqual(change.payload, {});
    assert.deepEqual(change.changedFields, []);
  });
  test(`${role}: single field update does not send unrelated incomplete fields`, () => {
    const original = { email: 'old@example.com', nomorTeleponDarurat: '', hubunganDarurat: '' };
    const change = getProfileChanges(original, { ...original, email: 'new@example.com' }, role);
    assert.deepEqual(change.payload, { email: 'new@example.com' });
    assert.deepEqual(change.changedFields.filter(cfg => cfg.required), []);
  });
}

test('only editable fields are sent; changing a locked name is ignored for member', () => {
  const original = { namaLengkap: 'Member', divisi: 'A', email: 'old@example.com' };
  const draft = { namaLengkap: 'Other', divisi: 'B', email: 'new@example.com' };
  assert.deepEqual(getProfileChanges(original, draft, ROLES.STAFF).payload, { email: 'new@example.com' });
  assert.deepEqual(getProfileChanges(original, draft, ROLES.HRD_ADMIN).payload,
    { fullName: 'Other', email: 'new@example.com' });
});

test('editing relationship alone does not require emergency phone', () => {
  const result = getProfileChanges({ hubunganDarurat: '', nomorTeleponDarurat: '' },
    { hubunganDarurat: 'Orang Tua', nomorTeleponDarurat: '' }, ROLES.STAFF);
  assert.deepEqual(result.payload, { emergencyContactRelationship: 'Orang Tua' });
  assert.deepEqual(result.changedFields.map(cfg => cfg.key), ['hubunganDarurat']);
});

test('clearing a previously filled required field still fails validation', () => {
  const draft = { hubunganDarurat: '' };
  const result = getProfileChanges({ hubunganDarurat: 'Orang Tua' }, draft, ROLES.STAFF);
  const validation = validateRequired(result.changedFields.filter(cfg => cfg.required)
    .map(cfg => ({ field: cfg.key, label: cfg.label, value: draft[cfg.key] })));
  assert.equal(validation.isValid, false);
  assert.equal(validation.firstErrorField, 'hubunganDarurat');
});
