import { z } from "zod";
import { ok } from "../utils/result";
import type { McpToolDefinition } from "./index";
import { blockedLocalActions, capabilityCatalog, toolCatalog } from "./tool-catalog";
import { createDefaultToolPolicy } from "../policy/tool-policy";
import { MCP_TOOL_NAMES } from "../registry/tool-names";

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
    const tools: string[] = [MCP_TOOL_NAMES.NGM_CAPABILITIES];

    if (workspace) {
      skills.push("ngm-workspace");
      tools.push(MCP_TOOL_NAMES.NGM_WORKSPACE_SUMMARY, MCP_TOOL_NAMES.NGM_WORKSPACE_MCP_TOOLS, MCP_TOOL_NAMES.NGM_WORKSPACE_CAPABILITY_MAP);
    }
    if (localExecution) {
      skills.push("ngm-project");
      tools.push(MCP_TOOL_NAMES.NGM_PROJECT_FIND, MCP_TOOL_NAMES.NGM_PROJECT_READ_PACKAGE_JSON, MCP_TOOL_NAMES.NGM_TASK_LIST);
    }
    if (runtime) {
      skills.push("ngm-runtime");
      tools.push(MCP_TOOL_NAMES.NGM_RUNTIME_CURRENT, MCP_TOOL_NAMES.NGM_RUNTIME_DETECT_REQUIREMENT, MCP_TOOL_NAMES.NGM_RUNTIME_RESOLVE_FOR_PROJECT);
    }
    if (nginx) {
      skills.push("ngm-nginx");
      tools.push(MCP_TOOL_NAMES.NGM_NGINX_STATUS, MCP_TOOL_NAMES.NGM_NGINX_SERVERS_LIST, MCP_TOOL_NAMES.NGM_NGINX_CONFIG_VALIDATE);
    }
    if (frontendStandard) {
      skills.push("ngm-frontend-standard");
      tools.push(
        MCP_TOOL_NAMES.NGM_STANDARD_GET,
        MCP_TOOL_NAMES.NGM_STANDARD_VALIDATE_PROJECT,
        MCP_TOOL_NAMES.NGM_WORKFLOW_VALIDATE_BEFORE_WRITE,
        MCP_TOOL_NAMES.NGM_REVIEW_GENERATE_CHECKLIST
      );
    }
    if (skills.length === 1) {
      skills.push("ngm-workspace");
      tools.push(MCP_TOOL_NAMES.NGM_WORKSPACE_SUMMARY);
    }

    return {
      skills: unique(skills),
      tools: unique(tools),
      reason: "The request mentions local ng-manager engineering control or workspace context.",
    };
  }

  if (hubV2) {
    const skills = ["ngm-router", "hub-v2-api"];
    const tools: string[] = [MCP_TOOL_NAMES.HUB_V2_PROJECTS_LIST];
    if (hubDocs) {
      skills.push("hub-v2-docs");
      tools.push(MCP_TOOL_NAMES.HUB_V2_DOCS_LIST, MCP_TOOL_NAMES.HUB_V2_DOCS_GET, MCP_TOOL_NAMES.HUB_V2_DOCS_GET_BY_SLUG);
    }
    if (hasAny(text, ["issue", "issues", "问题"])) {
      tools.push(MCP_TOOL_NAMES.HUB_V2_ISSUES_LIST, MCP_TOOL_NAMES.HUB_V2_ISSUES_GET);
    }
    if (hasAny(text, ["rd", "研发项"])) {
      tools.push(MCP_TOOL_NAMES.HUB_V2_RD_LIST, MCP_TOOL_NAMES.HUB_V2_RD_GET);
    }
    return {
      skills: unique(skills),
      tools: unique(tools),
      reason: "The request appears to target Hub V2 collaboration data.",
    };
  }

  return {
    skills: ["ngm-router", "ngm-workspace"],
    tools: [MCP_TOOL_NAMES.NGM_CAPABILITIES, MCP_TOOL_NAMES.NGM_WORKSPACE_SUMMARY, MCP_TOOL_NAMES.NGM_WORKSPACE_CAPABILITY_MAP],
    reason: "No narrower domain was detected; start with local workspace capability discovery.",
  };
}

export function capabilityTools(): McpToolDefinition[] {
  return [
    {
      name: MCP_TOOL_NAMES.NGM_CAPABILITIES,
      description: "List ng-manager MCP capability groups, matching skills, tool names, and currently blocked local actions.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      handler() {
        return ok(MCP_TOOL_NAMES.NGM_CAPABILITIES, {
          capabilities: capabilityCatalog,
          tools: toolCatalog,
          blockedLocalActions,
        });
      },
    },
    {
      name: MCP_TOOL_NAMES.NGM_DOCTOR,
      description: "Inspect ng-manager MCP server readiness, policy flags, Hub V2 configuration, and registered tool coverage. Prefer this read-only MCP diagnostic before shell checks because it reports the same controlled server/audit/policy view agents use.",
      riskLevel: "read",
      inputSchema: z.object({}).strict(),
      handler() {
        const policy = createDefaultToolPolicy();
        const counts = toolCatalog.reduce<Record<string, number>>((acc, tool) => {
          acc[tool.riskLevel] = (acc[tool.riskLevel] ?? 0) + 1;
          return acc;
        }, {});
        return ok(MCP_TOOL_NAMES.NGM_DOCTOR, {
          status: "OK",
          runtime: {
            node: process.version,
            platform: `${process.platform} ${process.arch}`,
            cwd: process.cwd(),
          },
          policy,
          tools: {
            total: toolCatalog.length,
            counts,
          },
          localServer: {
            discovery: ["runtime lock file", "NGM_MCP_SERVER_URL", "NGM_SERVER_URL"],
          },
          notes: [
            "Read tools are enabled by default.",
            "Confirmed local ngm_ write tools require NGM_MCP_ALLOW_WRITE=true.",
            "Confirmed local ngm_ execute tools require NGM_MCP_ALLOW_EXECUTE=true.",
            "Hub V2 hub_v2_ write tools require confirm=true plus Hub V2 Personal Token scopes, not local ngm_ policy flags.",
          ],
        });
      },
    },
    {
      name: MCP_TOOL_NAMES.NGM_ROUTE_TASK,
      description: "Route a user request to Hub V2 or NGM local skills and recommend read-only MCP tools.",
      riskLevel: "read",
      inputSchema: routeTaskSchema,
      handler(args) {
        return ok(MCP_TOOL_NAMES.NGM_ROUTE_TASK, {
          query: args.query,
          ...routeTask(args.query),
        });
      },
    },
  ];
}
