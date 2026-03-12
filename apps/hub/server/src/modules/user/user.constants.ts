export const USER_TITLE_VALUES = [
  "product",
  "ui",
  "frontend_dev",
  "backend_dev",
  "qa",
  "ops",
  "other"
] as const;

export const USER_TITLES = [
  { label: "产品", value: "product" },
  { label: "UI", value: "ui" },
  { label: "前端开发", value: "frontend_dev" },
  { label: "后端开发", value: "backend_dev" },
  { label: "测试", value: "qa" },
  { label: "运维", value: "ops" },
  { label: "其他", value: "other" }
] as const;

export type UserTitleCode = (typeof USER_TITLE_VALUES)[number];
