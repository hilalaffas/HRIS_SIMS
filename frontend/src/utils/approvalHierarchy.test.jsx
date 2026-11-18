import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { approvalRolesFor } from './approvalHierarchy';
import ApprovalFlowSection from '../pages/Cuti/applycuti/components/ApprovalFlowSection';

const cases = [
  ['MEMBER', ['LEADER', 'SPV', 'MANAGER'], [false, false, false]],
  ['LEADER', ['SPV', 'MANAGER'], [false, false]],
  ['SPV', ['MANAGER'], [false]],
  ['MANAGER', ['MANAGER'], [false]],
  ['HRD_ADMIN', ['HRD'], [false]],
  ['HRD_KARYAWAN', ['HRD'], [false]],
];
for (const [role, expected, disabled] of cases) {
  test(`${role} sees only its required approver dropdowns`, () => {
    const stages = approvalRolesFor(role); assert.deepEqual(stages, expected);
    const person = { employeeId: 99, fullName: 'Rekan Approver' };
    const html = renderToStaticMarkup(<ApprovalFlowSection approvalRoles={stages}
      isHrdRequester={stages.includes('HRD')} isSupervisor={['LEADER', 'SPV', 'MANAGER'].includes(role)}
      approvers={{ LEADER: [person], SPV: [person], MANAGER: [person], HRD: [person] }} />);
    const buttons = html.match(/<button[^>]*>/g) || [];
    assert.deepEqual(buttons.map((button) => button.includes('disabled')), disabled);
  });
}
test('role prefixes and casing use the same hierarchy', () => {
  assert.deepEqual(approvalRolesFor(' role_leader '), ['SPV', 'MANAGER']);
  assert.deepEqual(approvalRolesFor('role_hrd_karyawan'), ['HRD']);
});
