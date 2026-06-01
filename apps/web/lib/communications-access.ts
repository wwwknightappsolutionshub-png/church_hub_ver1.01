/** Church Communication Hub CRUD: admin and pastor only. */
export function canManageCommunications(userRoles: string[] | undefined): boolean {
  if (!userRoles?.length) return false;
  return userRoles.some((r) => r === 'ADMIN' || r === 'PASTOR');
}
