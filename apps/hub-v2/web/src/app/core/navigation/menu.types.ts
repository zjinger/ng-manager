export interface NavItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  badge?: string;
  tone?: 'default' | 'info' | 'warning' | 'danger';
  adminOnly?: boolean;
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}
