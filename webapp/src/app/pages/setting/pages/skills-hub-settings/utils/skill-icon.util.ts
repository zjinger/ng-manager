import type { SkillEntity } from '../models/skill-hub.model';

export function skillIconType(item: Pick<SkillEntity, 'category' | 'tags'>): string {
  const source = `${item.category} ${item.tags.join(' ')}`.toLowerCase();
  if (source.includes('api')) return 'api';
  if (source.includes('data') || source.includes('db')) return 'database';
  if (source.includes('doc') || source.includes('markdown')) return 'file-text';
  if (source.includes('image') || source.includes('img')) return 'picture';
  if (source.includes('cli') || source.includes('shell')) return 'code';
  return 'appstore';
}

export function skillIconTone(item: Pick<SkillEntity, 'id' | 'category' | 'tags'>): string {
  const source = `${item.category} ${item.tags.join(' ')}`.toLowerCase();
  if (source.includes('api')) return 'purple';
  if (source.includes('data') || source.includes('db')) return 'green';
  if (source.includes('doc') || source.includes('markdown')) return 'blue';
  if (source.includes('image') || source.includes('img')) return 'rose';
  if (source.includes('cli') || source.includes('shell')) return 'cyan';
  return ['blue', 'purple', 'green', 'orange', 'rose', 'cyan', 'indigo'][hashText(item.id) % 7];
}

export function avatarTone(item: Pick<SkillEntity, 'ownerUserId' | 'ownerName' | 'id'>): string {
  return `a${(hashText(item.ownerUserId || item.ownerName || item.id) % 4) + 1}`;
}

export function avatarText(name: string | null): string {
  const n = (name || '作者').trim();
  return n.slice(-1);
}

function hashText(value: string): number {
  return Array.from(value || 'skill').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}
