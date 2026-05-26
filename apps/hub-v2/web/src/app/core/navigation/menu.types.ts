export interface NavItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  activeRoutes?: string[];
  exact?: boolean;
  badge?: string;
  tone?: 'default' | 'info' | 'warning' | 'danger';
  permissions?: string[];
  permissionMode?: 'any' | 'all';
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}
