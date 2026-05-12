const ASSET_TYPE_COLOR_MAP: Record<string, string> = {
  js: '#1677ff',
  css: '#52c41a',
  html: '#722ed1',
  image: '#fa8c16',
  font: '#13c2c2',
  asset: '#8c8c8c',
};

const ASSET_TYPE_ICON_MAP: Record<string, string> = {
  js: 'code',
  css: 'bg-colors',
  html: 'html5',
  image: 'picture',
  font: 'font-size',
  asset: 'file',
};

export function getAssetTypeColor(type: string): string {
  return ASSET_TYPE_COLOR_MAP[type] || '#d9d9d9';
}

export function getAssetTypeIcon(type: string): string {
  return ASSET_TYPE_ICON_MAP[type] || 'file';
}

export function getSizeLevel(size?: number | null): string {
  const value = Number(size ?? 0);
  if (value > 500 * 1024) return 'danger';
  if (value > 200 * 1024) return 'warning';
  return 'good';
}
