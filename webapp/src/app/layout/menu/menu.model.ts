export interface MenuItem {
    level: number;
    title: string;
    icon?: string;
    path?: string;
    open?: boolean;
    selected?: boolean;
    children?: MenuItem[];
    expanded?: boolean;
    disabled?: boolean;
    hidden?: boolean;
    taskCountBadge?: boolean;
}