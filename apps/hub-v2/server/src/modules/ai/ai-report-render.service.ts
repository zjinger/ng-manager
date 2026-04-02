import type Database from "better-sqlite3";

export interface RenderedBlock {
  type: "stat_card" | "trend_chart" | "distribution_chart" | "leaderboard" | "table" | "empty";
  title: string;
  description?: string;
  // stat_card
  value?: number | string;
  subText?: string;
  subValue?: string;
  trend?: "up" | "down" | "flat";
  // chart
  chart?: {
    type: "bar" | "line" | "pie" | "donut";
    labels: string[];
    datasets: { label: string; data: number[]; color?: string }[];
  };
  // table
  columns?: { key: string; label: string }[];
  rows?: Record<string, unknown>[];
  // leaderboard
  items?: { rank: number; label: string; value: number; percent?: number }[];
}

interface VisualizationType {
  type: RenderedBlock["type"];
  dateCol?: string;
  categoryCol?: string;
  valueCol?: string;
}

export class AiReportRenderService {
  constructor(private readonly readonlyDb: Database.Database) {}

  executeAndRender(sql: string, params: string[]): RenderedBlock {
    // 执行 SQL（只读），带超时保护
    const startTime = Date.now();
    const MAX_EXECUTION_TIME_MS = 5000; // 5 秒超时

    // 使用 statement timeout 防止慢查询
    const stmt = this.readonlyDb.prepare(sql);
    stmt.raw(true); // 启用原始模式以提高性能

    const rows = stmt.all(...params) as Record<string, unknown>[];

    const executionTime = Date.now() - startTime;
    if (executionTime > MAX_EXECUTION_TIME_MS) {
      console.warn(`[AI Report] Slow query detected: ${executionTime}ms, SQL: ${sql.slice(0, 100)}...`);
    }

    // 分析结果结构，自动选择可视化方式
    const viz = this.inferVisualization(rows);

    // 渲染
    return this.render(rows, viz);
  }

  private inferVisualization(rows: Record<string, unknown>[]): VisualizationType {
    if (rows.length === 0) {
      return { type: "empty" };
    }

    const columns = Object.keys(rows[0]);
    const sample = rows[0];

    // 单行 + 单数值列 → 数字卡片
    if (rows.length === 1) {
      const numCols = columns.filter((c) => typeof sample[c] === "number");
      if (numCols.length === 1 && columns.length === 1) {
        return { type: "stat_card", valueCol: numCols[0] };
      }
    }

    // 有时间列 + 数值列 → 趋势图
    const dateCol = columns.find(
      (c) => /date|time|at$/i.test(c) && typeof sample[c] === "string"
    );
    const numCols = columns.filter((c) => typeof sample[c] === "number");
    if (dateCol && numCols.length > 0) {
      return { type: "trend_chart", dateCol };
    }

    // 分类列 + 数值列（≤10 类）→ 分布图
    const strCols = columns.filter((c) => typeof sample[c] === "string");
    if (strCols.length === 1 && numCols.length === 1 && rows.length <= 10) {
      return {
        type: "distribution_chart",
        categoryCol: strCols[0],
        valueCol: numCols[0]
      };
    }

    // ≤20 行 + 有数值 → 排行榜
    if (rows.length <= 20 && numCols.length > 0) {
      return { type: "leaderboard", valueCol: numCols[0] };
    }

    // 默认表格
    return { type: "table" };
  }

  private render(rows: Record<string, unknown>[], viz: VisualizationType): RenderedBlock {
    switch (viz.type) {
      case "stat_card":
        return this.renderStatCard(rows, viz);
      case "trend_chart":
        return this.renderTrendChart(rows, viz);
      case "distribution_chart":
        return this.renderDistributionChart(rows, viz);
      case "leaderboard":
        return this.renderLeaderboard(rows, viz);
      case "table":
        return this.renderTable(rows);
      case "empty":
        return { type: "empty", title: "暂无数据" };
      default:
        return this.renderTable(rows);
    }
  }

  private renderStatCard(
    rows: Record<string, unknown>[],
    viz: VisualizationType
  ): RenderedBlock {
    const valueCol = viz.valueCol || Object.keys(rows[0])[0];
    const value = Number(rows[0][valueCol]) || 0;

    return {
      type: "stat_card",
      title: this.humanizeColumnName(valueCol),
      value
    };
  }

  private renderTrendChart(
    rows: Record<string, unknown>[],
    viz: VisualizationType
  ): RenderedBlock {
    const dateCol = viz.dateCol || "date";
    const numericColumns = Object.keys(rows[0]).filter(
      (k) => typeof rows[0][k] === "number"
    );

    // 按日期排序
    const sortedRows = [...rows].sort((a, b) => {
      const aDate = String(a[dateCol]);
      const bDate = String(b[dateCol]);
      return aDate.localeCompare(bDate);
    });

    return {
      type: "trend_chart",
      title: "趋势分析",
      chart: {
        type: "line",
        labels: sortedRows.map((r) => String(r[dateCol])),
        datasets: numericColumns.map((col) => ({
          label: this.humanizeColumnName(col),
          data: sortedRows.map((r) => Number(r[col]) || 0)
        }))
      }
    };
  }

  private renderDistributionChart(
    rows: Record<string, unknown>[],
    viz: VisualizationType
  ): RenderedBlock {
    const categoryCol = viz.categoryCol || Object.keys(rows[0]).find(
      (k) => typeof rows[0][k] === "string"
    ) || "category";
    const valueCol = viz.valueCol || Object.keys(rows[0]).find(
      (k) => typeof rows[0][k] === "number"
    ) || "value";

    return {
      type: "distribution_chart",
      title: "分布分析",
      chart: {
        type: "donut",
        labels: rows.map((r) => String(r[categoryCol])),
        datasets: [
          {
            label: this.humanizeColumnName(valueCol),
            data: rows.map((r) => Number(r[valueCol]) || 0)
          }
        ]
      }
    };
  }

  private renderLeaderboard(
    rows: Record<string, unknown>[],
    viz: VisualizationType
  ): RenderedBlock {
    const valueCol = viz.valueCol || Object.keys(rows[0]).find(
      (k) => typeof rows[0][k] === "number"
    ) || "value";
    const labelCol = Object.keys(rows[0]).find(
      (k) => typeof rows[0][k] === "string"
    ) || Object.keys(rows[0])[0];

    // 按数值降序排序
    const sortedRows = [...rows].sort(
      (a, b) => (Number(b[valueCol]) || 0) - (Number(a[valueCol]) || 0)
    );

    const maxValue = Math.max(...sortedRows.map((r) => Number(r[valueCol]) || 0));

    return {
      type: "leaderboard",
      title: "排行榜",
      items: sortedRows.map((r, index) => ({
        rank: index + 1,
        label: String(r[labelCol]),
        value: Number(r[valueCol]) || 0,
        percent: maxValue > 0 ? Math.round(((Number(r[valueCol]) || 0) / maxValue) * 100) : 0
      }))
    };
  }

  private renderTable(rows: Record<string, unknown>[]): RenderedBlock {
    const columns = Object.keys(rows[0]).map((key) => ({
      key,
      label: this.humanizeColumnName(key)
    }));

    return {
      type: "table",
      title: "数据列表",
      columns,
      rows
    };
  }

  private humanizeColumnName(key: string): string {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
