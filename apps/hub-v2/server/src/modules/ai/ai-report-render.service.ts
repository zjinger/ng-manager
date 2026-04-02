import type Database from "better-sqlite3";

import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";

export interface RenderedBlock {
  type: "stat_card" | "trend_chart" | "distribution_chart" | "leaderboard" | "table" | "empty";
  title: string;
  description?: string;
  value?: number | string;
  subText?: string;
  subValue?: string;
  trend?: "up" | "down" | "flat";
  chart?: {
    type: "bar" | "line" | "pie" | "donut";
    labels: string[];
    datasets: { label: string; data: number[]; color?: string }[];
  };
  columns?: { key: string; label: string }[];
  rows?: Record<string, unknown>[];
  items?: { rank: number; label: string; value: number; percent?: number }[];
}

interface VisualizationType {
  type: RenderedBlock["type"];
  dateCol?: string;
  categoryCol?: string;
  valueCol?: string;
}

export class AiReportRenderService {
  private readonly maxExecutionTimeMs = 5000;
  private readonly maxRows = 1000;
  private readonly columnLabelMap: Record<string, string> = {
    id: "ID",
    project_id: "项目ID",
    project_key: "项目标识",
    project_name: "项目",
    issue_no: "测试单编号",
    rd_no: "需求编号",
    title: "标题",
    name: "名称",
    date: "日期",
    day: "日期",
    week: "周",
    month: "月",
    type: "类型",
    status: "状态",
    priority: "优先级",
    assignee: "负责人",
    reporter: "提出人",
    verifier: "验证人",
    module_code: "模块",
    version_code: "版本",
    environment_code: "环境",
    created_at: "创建时间",
    updated_at: "更新时间",
    resolved_at: "解决时间",
    closed_at: "关闭时间",
    count: "数量",
    total_count: "总数",
    tracking_count: "测试单数量",
    issue_count: "测试单数量",
    created_count: "新建数量",
    closed_count: "关闭数量",
    resolved_count: "已解决数量",
    open_count: "待处理数量",
    in_progress_count: "处理中数量",
    verified_count: "已验证数量",
    reopened_count: "重新打开数量",
    completion_rate: "完成率",
    member_count: "成员数量",
    active_member_count: "活跃成员数量",
    rd_count: "研发项数量",
    completed_rd_count: "已完成研发项数量",
    pending_rd_count: "待处理研发项数量",
    avg_progress: "平均进度",
    assignee_name: "负责人",
    creator_name: "创建人",
    reviewer_name: "评审人"
  };
  private readonly statusValueMap: Record<string, string> = {
    open: "待处理",
    in_progress: "处理中",
    resolved: "已解决",
    verified: "已验证",
    closed: "已关闭",
    reopened: "重新打开"
  };
  private readonly priorityValueMap: Record<string, string> = {
    low: "低",
    medium: "中",
    high: "高",
    critical: "紧急"
  };
  private readonly typeValueMap: Record<string, string> = {
    bug: "缺陷",
    feature: "新功能",
    change: "需求变更",
    improvement: "优化改进",
    task: "任务",
    test: "测试"
  };

  constructor(private readonly readonlyDb: Database.Database) {}

  executeAndRender(sql: string, params: string[]): RenderedBlock {
    const rows = this.executeQuery(sql, params);
    if (rows.length === 0) {
      return { type: "empty", title: "暂无数据" };
    }
    const viz = this.inferVisualization(rows);
    return this.render(rows, viz);
  }

  private executeQuery(sql: string, params: string[]): Record<string, unknown>[] {
    const startTime = Date.now();
    let rows: Record<string, unknown>[];
    try {
      const stmt = this.readonlyDb.prepare(sql);
      rows = stmt.all(...params) as Record<string, unknown>[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(ERROR_CODES.AI_SQL_INVALID, `Invalid SQL: ${message}`, 400);
    }

    const executionTime = Date.now() - startTime;
    if (executionTime > this.maxExecutionTimeMs) {
      console.warn(`[AI Report] Slow query detected: ${executionTime}ms`);
    }

    if (rows.length > this.maxRows) {
      return rows.slice(0, this.maxRows);
    }
    return rows;
  }

  private inferVisualization(rows: Record<string, unknown>[]): VisualizationType {
    const firstRow = rows[0];
    const columns = Object.keys(firstRow);
    const numericColumns = columns.filter((key) => this.isNumericValue(firstRow[key]));
    const dateColumn = columns.find((key) => this.looksLikeDateColumn(key, firstRow[key]));
    const textColumns = columns.filter((key) => typeof firstRow[key] === "string");

    if (rows.length === 1 && numericColumns.length === 1 && columns.length <= 2) {
      return { type: "stat_card", valueCol: numericColumns[0] };
    }

    if (dateColumn && numericColumns.length > 0) {
      return { type: "trend_chart", dateCol: dateColumn };
    }

    if (textColumns.length === 1 && numericColumns.length === 1 && rows.length <= 12) {
      return {
        type: "distribution_chart",
        categoryCol: textColumns[0],
        valueCol: numericColumns[0]
      };
    }

    if (rows.length <= 20 && numericColumns.length > 0) {
      return { type: "leaderboard", valueCol: numericColumns[0] };
    }

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

  private renderStatCard(rows: Record<string, unknown>[], viz: VisualizationType): RenderedBlock {
    const row = rows[0];
    const valueCol = viz.valueCol || Object.keys(row)[0];
    const value = row[valueCol];
    return {
      type: "stat_card",
      title: this.humanizeColumnName(valueCol),
      value: this.toNumber(value) ?? String(value ?? "")
    };
  }

  private renderTrendChart(rows: Record<string, unknown>[], viz: VisualizationType): RenderedBlock {
    const dateCol = viz.dateCol || "date";
    const numericColumns = Object.keys(rows[0]).filter((key) => this.isNumericValue(rows[0][key]));
    const sortedRows = [...rows].sort((a, b) => {
      const aDate = String(a[dateCol] ?? "");
      const bDate = String(b[dateCol] ?? "");
      return aDate.localeCompare(bDate);
    });

    return {
      type: "trend_chart",
      title: "趋势分析",
      chart: {
        type: "line",
        labels: sortedRows.map((row) => String(row[dateCol] ?? "")),
        datasets: numericColumns.map((col) => ({
          label: this.humanizeColumnName(col),
          data: sortedRows.map((row) => this.toNumber(row[col]) ?? 0)
        }))
      }
    };
  }

  private renderDistributionChart(rows: Record<string, unknown>[], viz: VisualizationType): RenderedBlock {
    const firstRow = rows[0];
    const categoryCol =
      viz.categoryCol || Object.keys(firstRow).find((key) => typeof firstRow[key] === "string") || "category";
    const valueCol =
      viz.valueCol || Object.keys(firstRow).find((key) => this.isNumericValue(firstRow[key])) || "value";

    return {
      type: "distribution_chart",
      title: "分布分析",
      chart: {
        type: "donut",
        labels: rows.map((row) => this.localizeValueByColumn(categoryCol, row[categoryCol])),
        datasets: [
          {
            label: this.humanizeColumnName(valueCol),
            data: rows.map((row) => this.toNumber(row[valueCol]) ?? 0)
          }
        ]
      }
    };
  }

  private renderLeaderboard(rows: Record<string, unknown>[], viz: VisualizationType): RenderedBlock {
    const firstRow = rows[0];
    const valueCol =
      viz.valueCol || Object.keys(firstRow).find((key) => this.isNumericValue(firstRow[key])) || "value";
    const labelCol = Object.keys(firstRow).find((key) => typeof firstRow[key] === "string") || Object.keys(firstRow)[0];

    const sortedRows = [...rows].sort((a, b) => (this.toNumber(b[valueCol]) ?? 0) - (this.toNumber(a[valueCol]) ?? 0));
    const maxValue = Math.max(...sortedRows.map((row) => this.toNumber(row[valueCol]) ?? 0), 0);

    return {
      type: "leaderboard",
      title: "排行榜",
      items: sortedRows.map((row, index) => {
        const current = this.toNumber(row[valueCol]) ?? 0;
        return {
          rank: index + 1,
          label: this.localizeValueByColumn(labelCol, row[labelCol]),
          value: current,
          percent: maxValue > 0 ? Math.round((current / maxValue) * 100) : 0
        };
      })
    };
  }

  private renderTable(rows: Record<string, unknown>[]): RenderedBlock {
    const keys = Object.keys(rows[0]);
    const columns = keys.map((key) => ({
      key,
      label: this.humanizeColumnName(key)
    }));
    const localizedRows = rows.map((row) => {
      const next: Record<string, unknown> = {};
      for (const key of keys) {
        next[key] = this.localizeValueByColumnRaw(key, row[key]);
      }
      return next;
    });

    return {
      type: "table",
      title: "数据列表",
      columns,
      rows: localizedRows
    };
  }

  private isNumericValue(value: unknown): boolean {
    return typeof value === "number" && Number.isFinite(value);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private looksLikeDateColumn(columnName: string, value: unknown): boolean {
    if (typeof value !== "string") {
      return false;
    }
    if (!/date|time|_at$/i.test(columnName)) {
      return false;
    }
    return !Number.isNaN(Date.parse(value));
  }

  private humanizeColumnName(key: string): string {
    const normalized = this.normalizeColumnKey(key);
    if (this.columnLabelMap[normalized]) {
      return this.columnLabelMap[normalized];
    }
    if (/^avg_/.test(normalized)) {
      return `平均${this.humanizeColumnName(normalized.slice(4))}`;
    }
    if (/_count$/.test(normalized)) {
      return `${this.humanizeColumnName(normalized.slice(0, -6))}数量`;
    }
    if (/_rate$/.test(normalized)) {
      return `${this.humanizeColumnName(normalized.slice(0, -5))}率`;
    }
    if (/count\(\*\)/i.test(normalized)) {
      return "数量";
    }

    const readable = normalized
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return readable
      .split(" ")
      .map((part) => (this.columnLabelMap[part] ? this.columnLabelMap[part] : part.toUpperCase()))
      .join(" ");
  }

  private localizeValueByColumn(columnKey: string, value: unknown): string {
    const localized = this.localizeValueByColumnRaw(columnKey, value);
    return String(localized ?? "");
  }

  private localizeValueByColumnRaw(columnKey: string, value: unknown): unknown {
    if (typeof value !== "string") {
      return value;
    }
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) {
      return value;
    }

    const normalizedColumn = this.normalizeColumnKey(columnKey);
    if (this.isTypeColumn(normalizedColumn) && this.typeValueMap[normalizedValue]) {
      return this.typeValueMap[normalizedValue];
    }
    if (this.isStatusColumn(normalizedColumn) && this.statusValueMap[normalizedValue]) {
      return this.statusValueMap[normalizedValue];
    }
    if (this.isPriorityColumn(normalizedColumn) && this.priorityValueMap[normalizedValue]) {
      return this.priorityValueMap[normalizedValue];
    }
    return value;
  }

  private isTypeColumn(columnKey: string): boolean {
    return columnKey === "type" || columnKey.endsWith("_type");
  }

  private isStatusColumn(columnKey: string): boolean {
    return columnKey === "status" || columnKey.endsWith("_status");
  }

  private isPriorityColumn(columnKey: string): boolean {
    return columnKey === "priority" || columnKey.endsWith("_priority");
  }

  private normalizeColumnKey(key: string): string {
    return key
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toLowerCase();
  }
}
