export interface NavItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  badge?: string;
  tone?: 'default' | 'warning' | 'danger';
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}
