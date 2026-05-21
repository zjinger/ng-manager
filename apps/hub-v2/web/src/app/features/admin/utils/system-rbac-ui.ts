import type { SystemPermissionEntity, SystemRoleDetail, SystemRoleEntity } from '../models/system-rbac.model';

export interface SystemPermissionGroup {
  groupCode: string;
  groupName: string;
  items: SystemPermissionEntity[];
}

export type PermissionMatrixColumn = 'manage';

export const PERMISSION_MATRIX_COLUMNS: Array<{ key: PermissionMatrixColumn; label: string }> = [
  { key: 'manage', label: '管理' }
];

export function groupSystemPermissions(permissions: SystemPermissionEntity[]): SystemPermissionGroup[] {
  const groups = new Map<string, SystemPermissionGroup>();
  for (const permission of permissions) {
    if (!groups.has(permission.groupCode)) {
      groups.set(permission.groupCode, {
        groupCode: permission.groupCode,
        groupName: permission.groupName,
        items: []
      });
    }
    groups.get(permission.groupCode)!.items.push(permission);
  }
  return Array.from(groups.values());
}

export function getSystemRoleBadgeClass(roleCode: string): string {
  if (roleCode === 'super_admin') {
    return 'super-admin';
  }
  if (roleCode === 'admin') {
    return 'admin';
  }
  if (roleCode === 'member') {
    return 'member';
  }
  return 'custom';
}

export function canModifySystemRole(role: Pick<SystemRoleEntity, 'code'> | null | undefined): boolean {
  return !!role && role.code !== 'super_admin';
}

export function areStringSetsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }
  return true;
}

export function createStringSet(values: Iterable<string> = []): Set<string> {
  return new Set(values);
}

export function toggleStringSetValue(values: Set<string>, value: string, checked?: boolean): Set<string> {
  const next = new Set(values);
  const shouldAdd = checked ?? !next.has(value);
  if (shouldAdd) {
    next.add(value);
  } else {
    next.delete(value);
  }
  return next;
}

export function getRolePermissionIdSet(role: SystemRoleDetail | null): Set<string> {
  if (!role) {
    return new Set();
  }
  return new Set(role.permissions.map((permission) => permission.id));
}
