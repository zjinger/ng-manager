import type { EChartsOption } from 'echarts';

import type { DashboardBoardData } from '../../models/dashboard.model';

export type DashboardChartColors = {
  blue: string;
  green: string;
  purple: string;
  border: string;
  grid: string;
  textMuted: string;
  background: string;
};

export function readDashboardChartColors(): DashboardChartColors {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#6366f1',
    border: read('--border-color', '#d9e0ea'),
    grid: read('--border-color-soft', '#e8edf4'),
    textMuted: read('--text-muted', '#64748b'),
    background: read('--bg-container', '#ffffff'),
  };
}

export function buildIssueTrendOption(data: DashboardBoardData, colors: DashboardChartColors): EChartsOption {
  const hasData = [...data.trend.issueCreated, ...data.trend.issueClosed].some((value) => value > 0);
  return {
    color: [colors.blue, colors.green],
    tooltip: { trigger: 'axis' },
    legend: {
      top: 6,
      textStyle: { color: colors.textMuted },
    },
    grid: { left: 36, right: 20, top: 42, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.trend.labels.map((value) => value.slice(5)),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.textMuted },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.textMuted },
    },
    series: [
      { name: '新增', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: data.trend.issueCreated },
      { name: '关闭', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: data.trend.issueClosed },
    ],
    graphic: hasData ? undefined : [noDataGraphic(colors)],
  };
}

export function buildRdTrendOption(data: DashboardBoardData, colors: DashboardChartColors): EChartsOption {
  const hasData = data.trend.rdCompleted.some((value) => value > 0);
  return {
    color: [colors.purple],
    tooltip: { trigger: 'axis' },
    legend: {
      top: 6,
      textStyle: { color: colors.textMuted },
    },
    grid: { left: 36, right: 20, top: 42, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.trend.labels.map((value) => value.slice(5)),
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.textMuted },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.grid } },
      axisLabel: { color: colors.textMuted },
    },
    series: [{ name: '完成', type: 'bar', barMaxWidth: 18, data: data.trend.rdCompleted, itemStyle: { borderRadius: [4, 4, 0, 0] } }],
    graphic: hasData ? undefined : [noDataGraphic(colors)],
  };
}

export function buildIssueDistributionOption(data: DashboardBoardData, colors: DashboardChartColors): EChartsOption {
  const leftData = data.distribution.issueByStatus.map((item) => ({ name: item.label, value: item.value }));
  const rightData = data.distribution.issueByPriority.map((item) => ({ name: item.label, value: item.value }));
  const hasData = [...leftData, ...rightData].some((item) => item.value > 0);
  return {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { color: colors.textMuted },
    },
    title: [
      { text: '按状态', left: '25%', top: 6, textAlign: 'center', textStyle: { fontSize: 12, color: colors.textMuted, fontWeight: 500 } },
      { text: '按优先级', left: '75%', top: 6, textAlign: 'center', textStyle: { fontSize: 12, color: colors.textMuted, fontWeight: 500 } },
    ],
    series: [
      {
        type: 'pie',
        radius: ['34%', '56%'],
        center: ['25%', '52%'],
        label: { formatter: '{b}: {c}', color: colors.textMuted, fontSize: 11 },
        data: leftData,
      },
      {
        type: 'pie',
        radius: ['34%', '56%'],
        center: ['75%', '52%'],
        label: { formatter: '{b}: {c}', color: colors.textMuted, fontSize: 11 },
        data: rightData,
      },
    ],
    graphic: hasData ? undefined : [noDataGraphic(colors)],
  };
}

export function buildRdDistributionOption(data: DashboardBoardData, colors: DashboardChartColors): EChartsOption {
  const leftData = data.distribution.rdByStatus.map((item) => ({ name: item.label, value: item.value }));
  const rightData = data.distribution.rdByStage.map((item) => ({ name: item.label, value: item.value }));
  const hasData = [...leftData, ...rightData].some((item) => item.value > 0);
  return {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { color: colors.textMuted },
    },
    title: [
      { text: '按状态', left: '25%', top: 6, textAlign: 'center', textStyle: { fontSize: 12, color: colors.textMuted, fontWeight: 500 } },
      { text: '按阶段', left: '75%', top: 6, textAlign: 'center', textStyle: { fontSize: 12, color: colors.textMuted, fontWeight: 500 } },
    ],
    series: [
      {
        type: 'pie',
        radius: ['34%', '56%'],
        center: ['25%', '52%'],
        label: { formatter: '{b}: {c}', color: colors.textMuted, fontSize: 11 },
        data: leftData,
      },
      {
        type: 'pie',
        radius: ['34%', '56%'],
        center: ['75%', '52%'],
        label: { formatter: '{b}: {c}', color: colors.textMuted, fontSize: 11 },
        data: rightData,
      },
    ],
    graphic: hasData ? undefined : [noDataGraphic(colors)],
  };
}

function noDataGraphic(colors: DashboardChartColors) {
  return {
    type: 'text',
    left: 'center',
    top: 'middle',
    style: {
      text: '暂无数据',
      fill: colors.textMuted,
      fontSize: 13,
    },
  };
}
