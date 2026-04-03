export interface ReportCaliberDto {
  summary: string;
  scope: string;
  timeRange: string;
  metric: string;
  dataSource: string;
}

export function buildReportCaliber(input: {
  query: string;
  sql: string;
  title?: string;
  description?: string;
}): ReportCaliberDto {
  const normalizedQuery = input.query.trim();
  const normalizedTitle = input.title?.trim() || normalizedQuery || "报表分析";
  const normalizedDesc = input.description?.trim() || "";
  const summary = normalizedDesc ? `${normalizedTitle}：${normalizedDesc}` : normalizedTitle;

  return {
    summary,
    scope: inferScope(normalizedQuery),
    timeRange: inferTimeRange(normalizedQuery, input.sql),
    metric: inferMetric(normalizedTitle, normalizedQuery),
    dataSource: inferDataSource(input.sql)
  };
}

function inferScope(query: string): string {
  if (/(各项目|按项目|项目对比|项目分布)/.test(query)) {
    return "按项目维度统计，仅包含你有权限访问的项目数据";
  }
  if (/(成员|负责人|处理人|指派人|人员)/.test(query)) {
    return "按成员维度统计，仅包含你有权限访问的项目数据";
  }
  if (/(研发项|需求)/.test(query)) {
    return "按研发项相关数据统计，仅包含你有权限访问的项目数据";
  }
  return "仅包含你有权限访问的项目数据";
}

function inferTimeRange(query: string, sql: string): string {
  const queryRangeMatch = query.match(/最近\s*\d+\s*(?:天|周|月|年)|本周|本月|本季度|今年|今天|昨日|昨天/);
  if (queryRangeMatch?.[0]) {
    return `按“${queryRangeMatch[0]}”范围统计`;
  }

  const sqlRangeMatch = sql.match(
    /datetime\(\s*'now'\s*,\s*'-(\d+)\s*(day|days|week|weeks|month|months|year|years)'\s*\)/i
  );
  if (sqlRangeMatch) {
    const amount = sqlRangeMatch[1];
    const unitMap: Record<string, string> = {
      day: "天",
      days: "天",
      week: "周",
      weeks: "周",
      month: "个月",
      months: "个月",
      year: "年",
      years: "年"
    };
    const unit = unitMap[sqlRangeMatch[2].toLowerCase()] || "";
    return `按最近 ${amount}${unit} 统计`;
  }
  return "未显式指定时默认按最近 90 天统计";
}

function inferMetric(title: string, query: string): string {
  const base = title || query;
  const normalized = base.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "统计口径由当前查询语义自动推断";
  }
  return `核心指标：${normalized}`;
}

function inferDataSource(sql: string): string {
  const sourceMap: Array<{ table: string; label: string }> = [
    { table: "issues", label: "测试单" },
    { table: "rd_items", label: "研发项" },
    { table: "project_members", label: "项目成员" },
    { table: "projects", label: "项目" },
    { table: "rd_stages", label: "研发阶段" },
    { table: "users", label: "成员信息" }
  ];
  const sources = sourceMap
    .filter((item) => new RegExp(`\\b${item.table}\\b`, "i").test(sql))
    .map((item) => item.label);

  if (sources.length === 0) {
    return "测试追踪业务数据";
  }
  return sources.join("、");
}
