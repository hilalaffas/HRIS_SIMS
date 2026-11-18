export function approvalRolesFor(roleName) {
  const role = String(roleName || '').trim().toUpperCase().replace(/^ROLE_/, '');
  if (['HRD_ADMIN', 'HRD_KARYAWAN'].includes(role)) return ['HRD'];
  if (role === 'LEADER') return ['SPV', 'MANAGER'];
  if (['SPV', 'MANAGER'].includes(role)) return ['MANAGER'];
  return ['LEADER', 'SPV', 'MANAGER'];
}
