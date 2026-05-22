import type { ProjectMetaItem, ProjectModuleRdLinkEntity } from '../../projects/models/project.model';

export type ModuleRdCascaderRdItem = {
  id: string;
  rdNo: string;
  title: string;
  status: string;
};

export type ModuleRdCascaderOption = {
  label: string;
  value: string;
  kind: 'subsystem' | 'module' | 'rd' | 'rd-direct' | 'rd-group';
  children?: ModuleRdCascaderOption[];
  isLeaf?: boolean;
};

export function buildModuleRdCascaderOptions(input: {
  modules: ProjectMetaItem[];
  moduleRdLinks: ProjectModuleRdLinkEntity[];
  rdItems: ModuleRdCascaderRdItem[];
  currentRdItemId?: string | null;
}): ModuleRdCascaderOption[] {
  const sortedItems = [...input.modules].sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.createdAt.localeCompare(b.createdAt);
  });
  const idSet = new Set(sortedItems.map((item) => item.id));
  const childrenByParent = new Map<string | null, ProjectMetaItem[]>();
  const rdLinksByModule = new Map<string, ModuleRdCascaderRdItem[]>();
  const rdById = new Map(input.rdItems.map((item) => [item.id, item] as const));

  for (const link of input.moduleRdLinks) {
    const rd = rdById.get(link.rdItemId);
    if (!rd) continue;
    const list = rdLinksByModule.get(link.moduleId) ?? [];
    list.push(rd);
    rdLinksByModule.set(link.moduleId, list);
  }

  for (const item of sortedItems) {
    const parentId = item.parentId && idSet.has(item.parentId) ? item.parentId : null;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(item);
    childrenByParent.set(parentId, list);
  }

  const currentRdItemId = input.currentRdItemId?.trim() || null;
  const toRdLeaf = (rd: ModuleRdCascaderRdItem): ModuleRdCascaderOption => ({
    label: `${rd.rdNo} · ${rd.title}${rd.status === 'closed' ? '（已关闭）' : ''}`,
    value: `rd:${rd.id}`,
    kind: 'rd',
    isLeaf: true
  });

  const toModuleNode = (item: ProjectMetaItem): ModuleRdCascaderOption => {
    const rdChildren = (rdLinksByModule.get(item.id) ?? []).map(toRdLeaf).filter((child) => {
      const rdId = child.value.slice(3);
      const rd = rdById.get(rdId);
      return !!rd && (rd.status !== 'closed' || currentRdItemId === rdId);
    });
    const nodeChildren = (childrenByParent.get(item.id) ?? []).map(toModuleNode);
    const children = [...nodeChildren, ...rdChildren];
    return {
      label: item.name,
      value: item.id,
      kind: item.nodeType,
      children: children.length > 0 ? children : undefined,
      isLeaf: children.length > 0 ? undefined : true
    };
  };

  const options = (childrenByParent.get(null) ?? []).map(toModuleNode);
  const directRdOptions = input.rdItems
    .filter((rd) => rd.status !== 'closed' || currentRdItemId === rd.id)
    .map((rd): ModuleRdCascaderOption => ({
      label: `${rd.rdNo} · ${rd.title}${rd.status === 'closed' ? '（已关闭）' : ''}`,
      value: `rd-direct:${rd.id}`,
      kind: 'rd-direct',
      isLeaf: true
    }));

  options.push({
    label: '关联研发项',
    value: '__rd_direct__',
    kind: 'rd-group',
    children: directRdOptions
  });
  return options;
}

export function moduleRdCascaderOptionIcon(option: Pick<ModuleRdCascaderOption, 'kind'> | null | undefined): string {
  if (option?.kind === 'subsystem') return 'cluster';
  if (option?.kind === 'module') return 'appstore';
  return 'branches';
}

export function findModuleRdSelectionPath(input: {
  modules: ProjectMetaItem[];
  moduleRdLinks: ProjectModuleRdLinkEntity[];
  moduleCode: string | null | undefined;
  rdItemId: string | null | undefined;
}): string[] | null {
  const normalizedRdId = input.rdItemId?.trim() || null;
  if (normalizedRdId) {
    const mapped = input.moduleRdLinks.find((item) => item.rdItemId === normalizedRdId)?.moduleId ?? null;
    if (mapped) {
      return [...buildModulePathById(input.modules, mapped), `rd:${normalizedRdId}`];
    }
    return ['__rd_direct__', `rd-direct:${normalizedRdId}`];
  }

  const normalizedModuleCode = input.moduleCode?.trim();
  if (!normalizedModuleCode) {
    return null;
  }
  const target = input.modules.find((item) => moduleValue(item) === normalizedModuleCode);
  return target ? buildModulePathById(input.modules, target.id) : null;
}

export function resolveModuleRdSelection(input: {
  modules: ProjectMetaItem[];
  path: string[] | null;
}): { moduleCode: string; rdItemId: string | null } {
  const path = input.path;
  if (!path || path.length === 0) {
    return { moduleCode: '', rdItemId: null };
  }
  const last = path[path.length - 1];
  if (last.startsWith('rd:')) {
    const rdItemId = last.slice(3);
    const moduleId = path.length >= 2 ? path[path.length - 2] : null;
    return { moduleCode: moduleId ? resolveModuleCodeById(input.modules, moduleId) : '', rdItemId };
  }
  if (last.startsWith('rd-direct:')) {
    return { moduleCode: '', rdItemId: last.slice('rd-direct:'.length) };
  }
  return { moduleCode: resolveModuleCodeById(input.modules, last), rdItemId: null };
}

function buildModulePathById(modules: ProjectMetaItem[], moduleId: string): string[] {
  const byId = new Map(modules.map((item) => [item.id, item] as const));
  const path: string[] = [];
  let current = byId.get(moduleId);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    path.unshift(current.id);
    visited.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

function resolveModuleCodeById(modules: ProjectMetaItem[], moduleId: string): string {
  const target = modules.find((item) => item.id === moduleId);
  return target ? moduleValue(target) : '';
}

function moduleValue(item: ProjectMetaItem): string {
  return (item.code || item.name || '').trim();
}
