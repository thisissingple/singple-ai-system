export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function isAdminUser(userRole: string | undefined | null): boolean {
  return userRole === "admin" || userRole === "manager";
}

export function hasRole(userRole: string | undefined | null, requiredRoles: string[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}