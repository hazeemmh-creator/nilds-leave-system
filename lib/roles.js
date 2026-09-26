export const ROLE_PRIORITY = ['admin', 'hr', 'supervisor', 'staff'];

function normalizeTokens(values) {
  return (values || [])
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve a single app role from Appwrite user labels and/or team names.
 * Labels are preferred (present on account.get()). Team names are a fallback
 * when roles are assigned via Appwrite Teams instead of labels.
 */
export function resolveRole(user, teamNames = []) {
  const labels = normalizeTokens(user?.labels);
  const teams = normalizeTokens(teamNames);
  const combined = new Set([...labels, ...teams]);

  for (const role of ROLE_PRIORITY) {
    if (combined.has(role)) {
      return role;
    }
  }

  return 'staff';
}

export function getPermissions(role) {
  const resolved = ROLE_PRIORITY.includes(role) ? role : 'staff';

  return {
    role: resolved,
    canViewAllStaff: resolved === 'supervisor' || resolved === 'hr' || resolved === 'admin',
    canApprove: resolved === 'supervisor' || resolved === 'hr' || resolved === 'admin',
    canImport: resolved === 'hr' || resolved === 'admin',
    canCreateLeave: true
  };
}
