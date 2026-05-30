import type { RdStageEntity } from "./rd.types";

export const RD_MAIN_STAGE_DEFINITIONS = [
  { key: "requirement_confirmation", name: "需求确认" },
  { key: "solution_design", name: "方案设计" },
  { key: "feature_dev", name: "功能开发" },
  { key: "testing_validation", name: "测试验证" },
  { key: "delivery_launch", name: "交付上线" },
  { key: "project_closure", name: "项目结项" }
] as const;

export type RdMainStageKey = (typeof RD_MAIN_STAGE_DEFINITIONS)[number]["key"];

export const RD_STAGE_TASK_TEMPLATES: Record<RdMainStageKey, string[]> = {
  requirement_confirmation: ["需求梳理", "需求评审", "需求确认"],
  solution_design: ["原型设计", "UI 设计", "数据库设计", "接口方案设计", "技术方案评审"],
  feature_dev: ["后端接口开发", "前端页面开发", "移动端开发", "前后端联调"],
  testing_validation: ["测试用例编写", "功能测试", "缺陷修复", "回归测试"],
  delivery_launch: ["部署准备", "上线发布", "上线验证"],
  project_closure: ["资料归档", "复盘总结", "结项确认"]
};

const STAGE_KEY_BY_NAME: Map<string, string> = new Map(RD_MAIN_STAGE_DEFINITIONS.map((stage) => [stage.name, stage.key]));
const STAGE_NAMES_BY_KEY: Map<string, string> = new Map(RD_MAIN_STAGE_DEFINITIONS.map((stage) => [stage.key, stage.name]));

export function resolveRdStageKey(stage: Pick<RdStageEntity, "id" | "name"> | string | null | undefined): string {
  if (!stage) {
    return "unknown";
  }
  if (typeof stage === "string") {
    return STAGE_KEY_BY_NAME.get(stage.trim()) ?? stage.trim();
  }
  return STAGE_KEY_BY_NAME.get(stage.name.trim()) ?? stage.id;
}

export function resolveRdStageName(stageKey: string): string {
  return STAGE_NAMES_BY_KEY.get(stageKey as RdMainStageKey) ?? stageKey;
}

export function getRdStageTaskTemplate(stageKey: string): string[] {
  return RD_STAGE_TASK_TEMPLATES[stageKey as RdMainStageKey] ?? [];
}
