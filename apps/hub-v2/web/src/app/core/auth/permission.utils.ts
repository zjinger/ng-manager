export type PermissionMatchMode = 'any' | 'all';

export function normalizePermissionList(raw: unknown): string[] {
  if (!raw) {
    return [];
  }
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => !!item);
}

export function hasRequiredPermissions(
  grantedCodes: Iterable<string>,
  requiredCodes: string[],
  mode: PermissionMatchMode = 'any'
): boolean {
  if (requiredCodes.length === 0) {
    return true;
  }
  const granted = new Set(grantedCodes);
  if (granted.size === 0) {
    return false;
  }
  return mode === 'all'
    ? requiredCodes.every((code) => granted.has(code))
    : requiredCodes.some((code) => granted.has(code));
}
