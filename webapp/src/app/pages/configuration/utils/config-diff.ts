import type { ConfigPatch, ConfigSchema } from '../models';

export interface ConfigDiffItem {
  path: string;
  label: string;
  groupTitle?: string;
  op: 'set' | 'remove' | 'append' | 'merge';
  before: unknown;
  after: unknown;
  valueType: 'text' | 'number' | 'boolean' | 'json' | 'array' | 'object' | 'unknown';
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function getByPointer(input: unknown, pointer: string): unknown {
  if (pointer === '') {
    return input;
  }
  if (!pointer.startsWith('/')) {
    return undefined;
  }
  const keys = pointer
    .slice(1)
    .split('/')
    .map((part) => decodePointerSegment(part));
  return keys.reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, input);
}

function getByDotPath(input: unknown, path: string): unknown {
  if (!path) {
    return input;
  }
  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, input);
}

function getByPatchPath(input: unknown, path: string): unknown {
  if (!path) {
    return input;
  }
  return path.startsWith('/') ? getByPointer(input, path) : getByDotPath(input, path);
}

function inferValueType(value: unknown): ConfigDiffItem['valueType'] {
  if (typeof value === 'string') {
    return 'text';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value != null && typeof value === 'object') {
    return 'object';
  }
  if (value === null) {
    return 'json';
  }
  return 'unknown';
}

export function buildConfigDiffItems(input: {
  before: unknown;
  after: unknown;
  patches: ConfigPatch[];
  schema?: ConfigSchema;
}): ConfigDiffItem[] {
  const fieldMap = new Map<string, { label: string; groupTitle?: string }>();
  for (const group of input.schema?.groups ?? []) {
    for (const field of group.fields ?? []) {
      if (!field.path) {
        continue;
      }
      fieldMap.set(field.path, { label: field.label || field.path, groupTitle: group.title });
    }
  }

  return input.patches.map((patch) => {
    const path = patch.path ?? '';
    try {
      const beforeValue = getByPatchPath(input.before, path);
      const afterValue = getByPatchPath(input.after, path);
      const meta = findFieldMeta(fieldMap, path);
      const sampleValue = afterValue !== undefined ? afterValue : beforeValue;
      return {
        path,
        label: meta?.label ?? (path || '(root)'),
        groupTitle: meta?.groupTitle,
        op: patch.op,
        before: beforeValue,
        after: afterValue,
        valueType: inferValueType(sampleValue),
      };
    } catch {
      return {
        path,
        label: path || '(root)',
        op: patch.op,
        before: undefined,
        after: patch.value,
        valueType: inferValueType(patch.value),
      };
    }
  });
}

function findFieldMeta(
  fieldMap: Map<string, { label: string; groupTitle?: string }>,
  path: string
): { label: string; groupTitle?: string } | undefined {
  const direct = fieldMap.get(path);
  if (direct) {
    return direct;
  }

  let current = path;
  while (current) {
    current = parentPath(current);
    const meta = fieldMap.get(current);
    if (meta) {
      return meta;
    }
  }
  return undefined;
}

function parentPath(path: string): string {
  if (!path) {
    return '';
  }
  const separator = path.startsWith('/') ? '/' : '.';
  const index = path.lastIndexOf(separator);
  if (index <= 0) {
    return '';
  }
  return path.slice(0, index);
}

