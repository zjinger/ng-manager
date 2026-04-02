import type OpenAI from "openai";
import type { IssuePriority, IssueType } from "../issue/issue.types";
import type {
  AiIssueRecommendInput,
  AiIssueRecommendResult,
  AiAssigneeRecommendInput,
  AiAssigneeRecommendResult,
  HistoricalIssue,
  HistoricalAssignee
} from "./ai.types";
import type { AiRepo } from "./ai.repo";

const SYSTEM_PROMPT = `你是一个专业的 Issue 分析助手。

给定 Issue 的标题和描述，请分析并推荐：
1. type（类型）：bug / feature / task / change / improvement / test
2. priority（优先级）：low / medium / high / critical

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
  "confidence": 0.92,
  "reason": "根据描述，该问题涉及用户无法正常登录，属于高优先级 bug"
}

confidence 为置信度 0~1，根据信息明确程度判断。`;

function buildPrompt(
  title: string,
  description: string | null | undefined,
  historicalIssues: HistoricalIssue[]
): string {
  let prompt = "";

  if (historicalIssues.length > 0) {
    prompt += "参考以下该项目的历史 Issue 分类模式：\n\n";
    for (const issue of historicalIssues.slice(0, 30)) {
      prompt += `- [${issue.type}] ${issue.title} → priority=${issue.priority}\n`;
    }
    prompt += "\n";
  }

  prompt += `请分析新 Issue：\n标题：${title}\n`;
  if (description?.trim()) {
    prompt += `描述：${description.trim().slice(0, 500)}\n`;
  }

  prompt += "\n请输出 JSON 格式的推荐结果。";
  return prompt;
}

interface LlmResponse {
  type?: string;
  priority?: string;
  confidence?: number;
  reason?: string;
}

export class AiIssueService {
  private readonly openai: OpenAI | null;

  constructor(
    openaiClient: OpenAI | null,
    private readonly aiRepo: AiRepo
  ) {
    this.openai = openaiClient;
  }

  async recommend(input: AiIssueRecommendInput, historicalIssues: HistoricalIssue[]): Promise<AiIssueRecommendResult> {
    if (!this.openai) {
      return {
        type: null,
        priority: null,
        confidence: 0,
        reason: "AI 服务未配置"
      };
    }

    const prompt = buildPrompt(input.title, input.description, historicalIssues);

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
          confidence: 0,
          reason: "AI 返回为空"
        };
      }

      const parsed = JSON.parse(content) as LlmResponse;
      return this.normalizeResult(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        type: null,
        priority: null,
        confidence: 0,
        reason: `AI 调用失败: ${message}`
      };
    }
  }

  private normalizeResult(parsed: LlmResponse): AiIssueRecommendResult {
    const validTypes: IssueType[] = ["bug", "feature", "task", "change", "improvement", "test"];
    const validPriorities: IssuePriority[] = ["low", "medium", "high", "critical"];

    const type = parsed.type && validTypes.includes(parsed.type as IssueType)
      ? (parsed.type as IssueType)
      : null;

    const priority = parsed.priority && validPriorities.includes(parsed.priority as IssuePriority)
      ? (parsed.priority as IssuePriority)
      : null;

    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

    return {
      type,
      priority,
      confidence,
      reason: parsed.reason?.trim() || ""
    };
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
            content: `你是一个专业的 Issue 指派助手。

根据 Issue 的类型和历史指派记录，推荐最合适的负责人。

输出格式（JSON）：
{
  "userId": "usr_xxx",
  "userName": "张三",
  "confidence": 0.85,
  "reason": "张三处理过 12 个类似的 bug，平均解决时间 2 天"
}

优先选择：
1. 处理过同类型 Issue 数量最多的人
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
    let prompt = `Issue 类型：${input.type}\n标题：${input.title}\n`;
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
