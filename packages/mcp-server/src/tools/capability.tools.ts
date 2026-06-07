import { z } from "zod";
import { ok } from "../utils/result";
import type { McpToolDefinition } from "./index";
import { blockedLocalActions, capabilityCatalog, toolCatalog } from "./tool-catalog";

const routeTaskSchema = z.object({
  query: z.string().trim().min(1),
}).strict();

type RouteMatch = {
  skills: string[];
  tools: string[];
  reason: string;
};

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function routeTask(query: string): RouteMatch {
  const text = query.toLowerCase();
  const localExecution = hasAny(text, [
    "start",
    "stop",
    "restart",
    "run script",
    "package.json",
    "npm",
    "pnpm",
    "yarn",
    "启动",
    "停止",
    "重启",
    "脚本",
    "运行命令",
  ]);
  const runtime = hasAny(text, ["node", "runtime", "nvm", "volta", "version", "版本", "运行时"]);
  const nginx = hasAny(text, ["nginx", "proxy", "upstream", "server block", "reload", "代理", "端口转发"]);
  const workspace = hasAny(text, [
    "workspace",
    "monorepo",
    "packages/",
    "package",
    "mcp",
    "tool",
    "codegraph",
    "api debugging",
    "api 调试",
    "design handoff",
    "代码上下文",
    "工作区",
    "仓库",
    "能力",
  ]);
  const frontendStandard = hasAny(text, [
    "frontend",
    "angular",
    "ng-zorro",
    "standard",
    "review",
    "commit",
    "branch",
    "spec",
    "workflow",
    "前端",
    "规范",
    "评审",
    "提交",
    "分支",
    "测试",
    "组件",
    "流程",
  ]);
  const hubV2 = hasAny(text, [
    "issue",
    "issues",
    "rd",
    "研发项",
    "需求文档",
    "项目文档",
    "协作",
    "project token",
    "hub v2",
    "hub-v2",
  ]);
  const hubDocs = hasAny(text, ["doc", "docs", "document", "文档", "需求文档", "项目文档"]);

  if ((localExecution || runtime || nginx || workspace || frontendStandard) && !hasAny(text, ["查一下某个研发项的需求文档"])) {
    const skills = ["ngm-router"];
    const tools = ["ngm.capabilities"];

    if (workspace) {
      skills.push("ngm-workspace");
      tools.push("ngm.workspace.summary", "ngm.workspace.mcpTools", "ngm.workspace.capabilityMap");
    }
    if (localExecution) {
      skills.push("ngm-project");
      tools.push("ngm.project.find", "ngm.project.readPackageJson", "ngm.task.list");
    }
    if (runtime) {
      skills.push("ngm-runtime");
      tools.push("ngm.runtime.current", "ngm.runtime.detectRequirement", "ngm.runtime.resolveForProject");
    }
    if (nginx) {
      skills.push("ngm-nginx");
      tools.push("ngm.nginx.status", "ngm.nginx.servers.list", "ngm.nginx.config.validate");
    }
    if (frontendStandard) {
      skills.push("ngm-frontend-standard");
      tools.push("ngm.standard.get", "ngm.standard.validateProject", "ngm.workflow.validateBeforeWrite", "ngm.review.generateChecklist");
    }
    if (skills.length === 1) {
      skills.push("ngm-workspace");
      tools.push("ngm.workspace.summary");
    }

    return {
      skills: unique(skills),
      tools: unique(tools),
      reason: "The request mentions local ng-manager engineering control or workspace context.",
    };
  }

  if (hubV2) {
    const skills = ["ngm-router", "hub-v2-api"];
    const tools = ["hub_v2_projects_list"];
    if (hubDocs) {
      skills.push("hub-v2-docs");
      tools.push("hub_v2_docs_list", "hub_v2_docs_get", "hub_v2_docs_get_by_slug");
    }
    if (hasAny(text, ["issue", "issues", "问题"])) {
      tools.push("hub_v2_issues_list", "hub_v2_issues_get");
    }
    if (hasAny(text, ["rd", "研发项"])) {
      tools.push("hub_v2_rd_list", "hub_v2_rd_get");
    }
    return {
      skills: unique(skills),
      tools: unique(tools),
      reason: "The request appears to target Hub V2 collaboration data.",
    };
  }

  return {
    skills: ["ngm-router", "ngm-workspace"],
    tools: ["ngm.capabilities", "ngm.workspace.summary", "ngm.workspace.capabilityMap"],
    reason: "No narrower domain was detected; start with local workspace capability discovery.",
  };
}

export function capabilityTools(): McpToolDefinition[] {
  return [
    {
      name: "ngm.capabilities",
      description: "List ng-manager MCP capability groups, matching skills, tool names, and currently blocked local actions.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      handler() {
        return ok("ngm.capabilities", {
          capabilities: capabilityCatalog,
          tools: toolCatalog,
          blockedLocalActions,
        });
      },
    },
    {
      name: "ngm.routeTask",
      description: "Route a user request to Hub V2 or NGM local skills and recommend read-only MCP tools.",
      riskLevel: "read",
      inputSchema: routeTaskSchema,
      handler(args) {
        return ok("ngm.routeTask", {
          query: args.query,
          ...routeTask(args.query),
        });
      },
    },
  ];
}
