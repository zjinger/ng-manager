import type { FrontendStandard } from "./frontend-standard.schema";

export const defaultFrontendStandard: FrontendStandard = {
  framework: {
    name: "Angular",
  },
  uiLibrary: {
    name: "NG-ZORRO",
    componentPrefix: "nz",
  },
  style: {
    language: "Less",
    fileExtension: ".less",
  },
  naming: {
    branchPatterns: [
      "feature/{issueId}-{short-name}",
      "fix/{issueId}-{short-name}",
      "refactor/{module}-{short-name}",
      "hotfix/{date}-{short-name}",
    ],
    commitTypes: ["feat", "fix", "refactor", "docs", "test", "chore"],
    componentSuffixes: ["page", "component", "dialog", "drawer", "table", "form"],
  },
  structure: {
    pagesDir: "src/app/pages",
    componentsDir: "src/app/components",
    servicesDir: "src/app/services",
    modelsDir: "src/app/models",
    maxComponentFileLines: 400,
  },
  git: {
    branchPatterns: [
      "^feature/[A-Za-z0-9]+-[a-z0-9][a-z0-9-]*$",
      "^fix/[A-Za-z0-9]+-[a-z0-9][a-z0-9-]*$",
      "^refactor/[a-z0-9][a-z0-9-]*-[a-z0-9][a-z0-9-]*$",
      "^hotfix/\\d{8}-[a-z0-9][a-z0-9-]*$",
    ],
    commitPattern: "^(feat|fix|refactor|docs|test|chore)\\([a-z0-9-]+\\): .+",
  },
  testing: {
    requireServiceSpec: true,
    requireUtilSpec: true,
    suggestComponentSpec: true,
  },
  review: {
    requireChecklist: true,
    riskKeywords: ["auth", "permission", "token", "password", "delete", "migration", "runtime", "process"],
  },
};
