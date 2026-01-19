import type { DashboardItem } from "./dashboard.types";

export function rectsOverlap(a: DashboardItem, b: DashboardItem): boolean {
    return !(
        a.x + a.cols <= b.x ||
        b.x + b.cols <= a.x ||
        a.y + a.rows <= b.y ||
        b.y + b.rows <= a.y
    );
}

export function canPlace(candidate: DashboardItem, items: DashboardItem[], maxCols: number): boolean {
    if (candidate.x < 0 || candidate.y < 0) return false;
    if (candidate.x + candidate.cols > maxCols) return false;
    return !items.some(it => rectsOverlap(candidate, it));
}

export function findFirstFit(
    items: DashboardItem[],
    newItem: DashboardItem,
    maxCols = 12,
    maxScanRows = 200
): { x: number; y: number } {
    // 计算扫描上限：现有最大 y + 缓冲
    const maxY = items.reduce((m, it) => Math.max(m, it.y + it.rows), 0);
    const limitY = Math.max(maxY + 20, maxScanRows);

    for (let y = 0; y <= limitY; y++) {
        for (let x = 0; x <= maxCols - newItem.cols; x++) {
            const cand: DashboardItem = { ...newItem, x, y };
            if (canPlace(cand, items, maxCols)) return { x, y };
        }
    }
    // 理论上不会到这里；兜底放底部
    return { x: 0, y: maxY + 1 };
}
