import type OpenAI from "openai";
import type { IssuePriority, IssueType } from "../issue/issue.types";
import type {
  AiIssueRecommendInput,
  AiIssueRecommendResult,
  AiAssigneeRecommendInput,
  AiAssigneeRecommendResult,
  HistoricalIssue,
  HistoricalAssignee,
  ProjectModule
} from "./ai.types";

const SYSTEM_PROMPT = `你是一个专业的测试单分析助手。

给定测试单的标题和描述，请分析并推荐：
1. type（类型）：bug / feature / task / change / improvement / test
2. priority（优先级）：low / medium / high / critical
3. module（模块）：从项目已有模块中选择最相关的

分类依据：
- bug=缺陷报告，如崩溃、报错、功能失效
- feature=新功能请求
- task=任务
- change=需求变更
- improvement=优化改进
- test=测试相关

优先级依据：
- critical=数据丢失/系统崩溃/安全漏洞/核心功能完全不可用
- high=重要功能受限/严重影响用户体验
- medium=功能部分受限/一般问题
- low=界面显示问题/体验优化/建议类

输出格式（JSON）：
{
  "type": "bug",
  "priority": "high",
  "module": { "code": "<模块code>", "name": "<模块名称>" },
  "confidence": 0.92,
  "reason": "根据描述，该问题涉及用户无法正常登录，属于高优先级 bug"
}

如果未提供“项目可用模块”列表，module 必须为 null。

confidence 为置信度 0~1，根据信息明确程度判断。`;

function buildPrompt(
  title: string,
  description: string | null | undefined,
  historicalIssues: HistoricalIssue[],
  projectModules: ProjectModule[]
): string {
  let prompt = "";

  // 项目已有模块
  if (projectModules.length > 0) {
    prompt += "项目可用模块：\n";
    for (const m of projectModules) {
      prompt += `- ${m.code}: ${m.name}\n`;
    }
    prompt += "仅可使用上述模块 code 作为 module.code，禁止输出列表外值。\n";
    prompt += "\n";
  } else {
    prompt += "当前项目未配置功能模块，请不要推荐模块，module 输出为 null。\n\n";
  }

  // 历史测试单（含模块）
  if (historicalIssues.length > 0) {
    prompt += "参考以下该项目的历史测试单分类模式：\n\n";
    for (const issue of historicalIssues.slice(0, 30)) {
      const moduleInfo = issue.moduleCode ? ` [${issue.moduleCode}]` : "";
      prompt += `- [${issue.type}]${moduleInfo} ${issue.title} → priority=${issue.priority}\n`;
    }
    prompt += "\n";
  }

  prompt += `请分析新测试单：\n标题：${title}\n`;
  if (description?.trim()) {
    prompt += `描述：${description.trim().slice(0, 500)}\n`;
  }

  prompt += "\n请输出 JSON 格式的推荐结果。";
  return prompt;
}

interface LlmResponse {
  type?: string;
  priority?: string;
  module?: { code?: string; name?: string } | string;
  confidence?: number;
  reason?: string;
}

export class AiIssueService {
  private readonly openai: OpenAI | null;

  constructor(
    openaiClient: OpenAI | null
  ) {
    this.openai = openaiClient;
  }

  async recommend(
    input: AiIssueRecommendInput,
    historicalIssues: HistoricalIssue[],
    projectModules: ProjectModule[]
  ): Promise<AiIssueRecommendResult> {
    if (!this.openai) {
      return {
        type: null,
        priority: null,
        module: null,
        confidence: 0,
        reason: "AI 服务未配置"
      };
    }

    const prompt = buildPrompt(input.title, input.description, historicalIssues, projectModules);

    try {
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          type: null,
          priority: null,
          module: null,
          confidence: 0,
          reason: "AI 返回为空"
        };
      }

      const parsed = JSON.parse(content) as LlmResponse;
      return this.normalizeResult(parsed, projectModules, input, historicalIssues);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        type: null,
        priority: null,
        module: null,
        confidence: 0,
        reason: `AI 调用失败: ${message}`
      };
    }
  }

  private normalizeResult(
    parsed: LlmResponse,
    projectModules: ProjectModule[],
    input: AiIssueRecommendInput,
    historicalIssues: HistoricalIssue[]
  ): AiIssueRecommendResult {
    const validTypes: IssueType[] = ["bug", "feature", "task", "change", "improvement", "test"];
    const validPriorities: IssuePriority[] = ["low", "medium", "high", "critical"];

    const type = parsed.type && validTypes.includes(parsed.type as IssueType)
      ? (parsed.type as IssueType)
      : null;

    const priority = parsed.priority && validPriorities.includes(parsed.priority as IssuePriority)
      ? (parsed.priority as IssuePriority)
      : null;

    // 模块优先使用 LLM 结果；失败时用本地规则兜底，提升命中率。
    const module = projectModules.length === 0
      ? null
      : this.resolveProjectModule(parsed.module, projectModules)
        ?? this.inferModuleFromText(`${input.title}\n${input.description ?? ""}`, projectModules)
        ?? this.inferModuleFromHistory(historicalIssues, projectModules)
        ?? (projectModules.length === 1 ? projectModules[0] : null);

    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

    return {
      type,
      priority,
      module,
      confidence,
      reason: parsed.reason?.trim() || ""
    };
  }

  private resolveProjectModule(
    rawModule: LlmResponse["module"],
    projectModules: ProjectModule[]
  ): ProjectModule | null {
    if (!rawModule || projectModules.length === 0) {
      return null;
    }

    const candidates = this.getModuleCandidates(rawModule);
    if (candidates.length === 0) {
      return null;
    }

    for (const normalized of candidates) {
      const exact = projectModules.find((item) => {
        const normalizedCode = this.normalizeText(item.code);
        const normalizedName = this.normalizeText(item.name);
        return normalized === normalizedCode || normalized === normalizedName;
      });
      if (exact) {
        return exact;
      }
    }

    for (const normalized of candidates) {
      const fuzzy = projectModules.find((item) => {
        const normalizedCode = this.normalizeText(item.code);
        const normalizedName = this.normalizeText(item.name);
        return this.isFuzzyModuleMatch(normalized, normalizedCode)
          || this.isFuzzyModuleMatch(normalized, normalizedName);
      });
      if (fuzzy) {
        return fuzzy;
      }
    }

    return null;
  }

  private inferModuleFromText(text: string, projectModules: ProjectModule[]): ProjectModule | null {
    if (projectModules.length === 0) {
      return null;
    }
    const normalizedText = this.normalizeText(text);
    if (!normalizedText) {
      return null;
    }

    let best: { module: ProjectModule; score: number } | null = null;
    for (const item of projectModules) {
      const normalizedCode = this.normalizeText(item.code);
      const normalizedName = this.normalizeText(item.name);
      let score = 0;
      if (normalizedCode && normalizedText.includes(normalizedCode)) {
        score += 2;
      }
      if (normalizedName && normalizedText.includes(normalizedName)) {
        score += 3;
      }
      if (!best || score > best.score) {
        best = { module: item, score };
      }
    }

    if (!best || best.score <= 0) {
      return null;
    }
    return best.module;
  }

  private inferModuleFromHistory(
    historicalIssues: HistoricalIssue[],
    projectModules: ProjectModule[]
  ): ProjectModule | null {
    if (historicalIssues.length === 0 || projectModules.length === 0) {
      return null;
    }

    const moduleCounter = new Map<string, number>();
    for (const issue of historicalIssues) {
      const normalized = this.normalizeText(issue.moduleCode);
      if (!normalized) {
        continue;
      }
      moduleCounter.set(normalized, (moduleCounter.get(normalized) ?? 0) + 1);
    }

    let best: { module: ProjectModule; score: number } | null = null;
    for (const item of projectModules) {
      const codeScore = moduleCounter.get(this.normalizeText(item.code)) ?? 0;
      const nameScore = moduleCounter.get(this.normalizeText(item.name)) ?? 0;
      const score = Math.max(codeScore, nameScore);
      if (!best || score > best.score) {
        best = { module: item, score };
      }
    }

    if (!best || best.score <= 0) {
      return null;
    }
    return best.module;
  }

  private getModuleCandidates(rawModule: LlmResponse["module"]): string[] {
    if (!rawModule) {
      return [];
    }
    if (typeof rawModule === "string") {
      const normalized = this.normalizeText(rawModule);
      return normalized ? [normalized] : [];
    }

    const candidates: string[] = [];
    const normalizedCode = this.normalizeText(rawModule.code);
    if (normalizedCode) {
      candidates.push(normalizedCode);
    }
    const normalizedName = this.normalizeText(rawModule.name);
    if (normalizedName && !candidates.includes(normalizedName)) {
      candidates.push(normalizedName);
    }
    return candidates;
  }

  private isFuzzyModuleMatch(input: string, moduleValue: string): boolean {
    if (!input || !moduleValue) {
      return false;
    }
    return input.includes(moduleValue) || moduleValue.includes(input);
  }

  private normalizeText(value: string | null | undefined): string {
    return value?.trim().toLowerCase() || "";
  }

  async recommendAssignee(
    input: AiAssigneeRecommendInput,
    historicalAssignees: HistoricalAssignee[]
  ): Promise<AiAssigneeRecommendResult> {
    if (!this.openai) {
      return {
        assigneeId: null,
        assigneeName: null,
        confidence: 0,
        reason: "AI 服务未配置"
      };
    }

    if (historicalAssignees.length === 0) {
      return {
        assigneeId: null,
        assigneeName: null,
        confidence: 0,
        reason: "无历史指派数据"
      };
    }

    const prompt = this.buildAssigneePrompt(input, historicalAssignees);

    try {
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `你是一个专业的测试单指派助手。

根据测试单的类型和历史指派记录，推荐最合适的负责人。

输出格式（JSON）：
{
  "userId": "usr_xxx",
  "userName": "张三",
  "confidence": 0.85,
  "reason": "张三处理过 12 个类似的 bug，平均解决时间 2 天"
}

优先选择：
1. 处理过同类型测试单数量最多的人
2. 最近活跃的成员
3. 如果是 bug，优先选择熟悉该模块的人`
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          assigneeId: null,
          assigneeName: null,
          confidence: 0,
          reason: "AI 返回为空"
        };
      }

      const parsed = JSON.parse(content) as {
        userId?: string;
        userName?: string;
        confidence?: number;
        reason?: string;
      };

      return this.normalizeAssigneeResult(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        assigneeId: null,
        assigneeName: null,
        confidence: 0,
        reason: `AI 调用失败: ${message}`
      };
    }
  }

  private buildAssigneePrompt(
    input: AiAssigneeRecommendInput,
    historicalAssignees: HistoricalAssignee[]
  ): string {
    let prompt = `测试单类型：${input.type}\n标题：${input.title}\n`;
    if (input.moduleCode) {
      prompt += `模块：${input.moduleCode}\n`;
    }
    if (input.description?.trim()) {
      prompt += `描述：${input.description.trim().slice(0, 300)}\n`;
    }

    prompt += "\n历史指派记录：\n";
    for (const record of historicalAssignees.slice(0, 20)) {
      prompt += `- ${record.userName}(${record.userId}): 处理过 ${record.count} 个 ${record.type}\n`;
    }

    prompt += "\n请推荐最合适的负责人。";
    return prompt;
  }

  private normalizeAssigneeResult(parsed: {
    userId?: string;
    userName?: string;
    confidence?: number;
    reason?: string;
  }): AiAssigneeRecommendResult {
    return {
      assigneeId: parsed.userId?.trim() || null,
      assigneeName: parsed.userName?.trim() || null,
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
      reason: parsed.reason?.trim() || ""
    };
  }
}
