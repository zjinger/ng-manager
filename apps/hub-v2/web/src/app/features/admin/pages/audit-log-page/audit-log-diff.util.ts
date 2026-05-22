import type { AuditLogEntity } from '../../models/audit-log.model';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface ParsedJsonValue {
  value: JsonValue | null;
  raw: string | null;
  valid: boolean;
}

export interface AuditChangeRow {
  key: string;
  label: string;
  before: string;
  after: string;
  kind: 'added' | 'removed' | 'changed';
}

const TECHNICAL_FIELDS = new Set(['createdAt', 'updatedAt']);
const FIELD_ORDER = [
  'username',
  'displayName',
  'email',
  'mobile',
  'organizationTitleName',
  'organizationTitleCode',
  'defaultProjectTitleName',
  'defaultProjectTitleCode',
  'loginEnabled',
  'status',
  'source',
  'remark',
  'departments',
  'primaryDepartment',
  'managerUser',
  'managerUserId',
  'name',
  'code',
  'description',
  'externalFinanceCode',
  'parentId',
  'sort',
  'titleName',
  'titleCode',
  'roleCode',
  'purposeName',
  'purposeCode',
  'permissionIds',
  'users',
  'groupName',
  'groupCode',
  'domainName',
  'domainCode',
  'isBuiltin',
  'mustChangePassword',
  'lastLoginAt',
];
const FIELD_ORDER_MAP = new Map(FIELD_ORDER.map((key, index) => [key, index]));
const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  username: '用户名',
  displayName: '姓名',
  email: '邮箱',
  mobile: '手机号',
  organizationTitleCode: '组织职务编码',
  organizationTitleName: '组织职务',
  defaultProjectTitleCode: '默认项目角色编码',
  defaultProjectTitleName: '默认项目角色',
  avatarUploadId: '头像上传 ID',
  avatarUrl: '头像',
  loginEnabled: '登录权限',
  status: '状态',
  source: '来源',
  remark: '备注',
  departments: '所属部门',
  primaryDepartment: '主部门',
  managerUserId: '上级用户',
  managerUser: '上级',
  lastLoginAt: '最近登录时间',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  name: '名称',
  code: '编码',
  description: '描述',
  externalFinanceCode: '外部财务编码',
  parentId: '上级部门',
  sort: '排序',
  titleCode: '职务编码',
  titleName: '职务',
  departmentId: '部门',
  departmentName: '部门名称',
  roleCode: '部门角色',
  purposeCode: '角色用途编码',
  purposeName: '角色用途',
  permissionIds: '权限项',
  users: '用户',
  userId: '用户',
  groupCode: '权限分组编码',
  groupName: '权限分组',
  domainCode: '权限域编码',
  domainName: '权限域',
  isBuiltin: '内置项',
  mustChangePassword: '下次登录改密',
};
const VALUE_LABELS: Record<string, string> = {
  active: '启用',
  inactive: '停用',
  local: '本地',
  true: '是',
  false: '否',
};

export function buildAuditChangeRows(item: AuditLogEntity | null): AuditChangeRow[] {
  if (!item) {
    return [];
  }
  const before = parseJson(item.beforeJson);
  const after = parseJson(item.afterJson);
  if (!before.raw && !after.raw) {
    return [];
  }
  if (!before.valid || !after.valid) {
    return buildRawFallbackRows(before, after);
  }

  const beforeRecord = asRecord(before.value);
  const afterRecord = asRecord(after.value);
  const rows = beforeRecord || afterRecord
    ? diffRecords(beforeRecord ?? {}, afterRecord ?? {})
    : diffRootValue(before.value, after.value);
  const businessRows = rows.filter((row) => !TECHNICAL_FIELDS.has(row.key));
  return (businessRows.length > 0 ? businessRows : rows).sort((a, b) => compareFieldOrder(a.key, b.key));
}

export function formatAuditLogJson(value: string | null): string {
  if (!value) {
    return '-';
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return `原始数据无法解析\n${value}`;
  }
}

function buildRawFallbackRows(before: ParsedJsonValue, after: ParsedJsonValue): AuditChangeRow[] {
  if (before.raw === after.raw) {
    return [];
  }
  return [
    {
      key: 'raw',
      label: '原始数据',
      before: before.valid ? formatAuditValue(before.value, 'raw') : '原始数据无法解析',
      after: after.valid ? formatAuditValue(after.value, 'raw') : '原始数据无法解析',
      kind: before.raw ? after.raw ? 'changed' : 'removed' : 'added',
    },
  ];
}

function diffRootValue(before: JsonValue | null, after: JsonValue | null): AuditChangeRow[] {
  if (stableStringify(before) === stableStringify(after)) {
    return [];
  }
  return [
    {
      key: 'value',
      label: '内容',
      before: formatAuditValue(before, 'value'),
      after: formatAuditValue(after, 'value'),
      kind: before === null ? 'added' : after === null ? 'removed' : 'changed',
    },
  ];
}

function diffRecords(before: Record<string, JsonValue>, after: Record<string, JsonValue>): AuditChangeRow[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const rows: AuditChangeRow[] = [];
  for (const key of keys) {
    const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
    const beforeValue = before[key];
    const afterValue = after[key];
    if (hasBefore && hasAfter && stableStringify(beforeValue) === stableStringify(afterValue)) {
      continue;
    }
    rows.push({
      key,
      label: FIELD_LABELS[key] ?? key,
      before: hasBefore ? formatAuditValue(beforeValue, key) : '-',
      after: hasAfter ? formatAuditValue(afterValue, key) : '-',
      kind: !hasBefore ? 'added' : !hasAfter ? 'removed' : 'changed',
    });
  }
  return rows;
}

function parseJson(value: string | null): ParsedJsonValue {
  if (!value) {
    return { value: null, raw: null, valid: true };
  }
  try {
    return { value: JSON.parse(value) as JsonValue, raw: value, valid: true };
  } catch {
    return { value: null, raw: value, valid: false };
  }
}

function asRecord(value: JsonValue | null): Record<string, JsonValue> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function compareFieldOrder(left: string, right: string): number {
  const leftOrder = FIELD_ORDER_MAP.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = FIELD_ORDER_MAP.get(right) ?? Number.MAX_SAFE_INTEGER;
  return leftOrder === rightOrder ? left.localeCompare(right) : leftOrder - rightOrder;
}

function formatAuditValue(value: JsonValue | undefined, key: string): string {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return formatStringValue(value, key);
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => formatArrayItem(item, key)).join('、') : '-';
  }
  return formatObjectValue(value, key);
}

function formatStringValue(value: string, key: string): string {
  if (VALUE_LABELS[value]) {
    return VALUE_LABELS[value];
  }
  if (key.endsWith('At') && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  }
  return value;
}

function formatArrayItem(value: JsonValue, key: string): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return formatObjectValue(value, key);
  }
  return formatAuditValue(value, key);
}

function formatObjectValue(value: Record<string, JsonValue>, key: string): string {
  const label = pickObjectLabel(value);
  if (label) {
    if (key === 'departments') {
      const role = typeof value['roleCode'] === 'string' && value['roleCode'] ? `（${value['roleCode']}）` : '';
      return `${label}${role}`;
    }
    return label;
  }
  return compactStringify(value);
}

function pickObjectLabel(value: Record<string, JsonValue>): string | null {
  const candidates = ['label', 'displayName', 'username', 'name', 'titleName', 'departmentName', 'roleName', 'permissionName'];
  for (const key of candidates) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  const id = value['id'] ?? value['userId'] ?? value['departmentId'] ?? value['titleCode'];
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function stableStringify(value: JsonValue | undefined): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function compactStringify(value: JsonValue): string {
  const text = stableStringify(value);
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}
