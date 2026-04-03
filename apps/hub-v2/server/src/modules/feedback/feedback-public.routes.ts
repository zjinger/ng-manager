import type { FastifyInstance } from "fastify";
import { ok } from "../../shared/http/response";
import { createRequestContext } from "../../shared/context/request-context";
import { createFeedbackSchema, createSurveyFeedbackSchema } from "./feedback.schema";

const surveyRoleLabelMap = {
  developer: "研发/工程师",
  tester: "测试/质量",
  pm: "产品/项目",
  ops: "运维/支持",
  other: "其他"
} as const;

const surveyFrequencyLabelMap = {
  daily: "每天",
  weekly: "每周",
  monthly: "每月",
  first_time: "首次使用"
} as const;

const surveyModuleLabelMap = {
  dashboard: "Dashboard",
  issues: "测试跟踪",
  rd: "研发管理",
  content: "内容中心",
  report: "积木报表",
  other: "其他"
} as const;

function resolveClientIp(request: { headers?: Record<string, unknown>; ip?: string; socket?: { remoteAddress?: string } }) {
  const forwarded = request.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || undefined;
  }
  return request.ip || request.socket?.remoteAddress || undefined;
}

export default async function feedbackPublicRoutes(app: FastifyInstance) {
  app.post("/feedbacks/survey", async (request, reply) => {
    const body = createSurveyFeedbackSchema.parse(request.body);
    const focusModules = Array.from(new Set(body.focusModules));
    const nickname = body.nickname?.trim();

    const content = [
      "# Hub v2 问卷反馈",
      "",
      `- 角色：${surveyRoleLabelMap[body.role]}`,
      `- 使用频率：${surveyFrequencyLabelMap[body.usageFrequency]}`,
      `- 满意度：${body.satisfaction}/5`,
      `- 常用模块：${focusModules.map((item) => surveyModuleLabelMap[item]).join("、")}`,
      `- 亮点：${body.highlights?.trim() || "（未填写）"}`,
      `- 改进建议：${body.improvement.trim()}`
    ].join("\n");

    const contact = [nickname, body.contact?.trim()].filter(Boolean).join(" / ") || undefined;
    const item = await app.container.feedbackCommand.submit(
      {
        projectKey: null,
        source: "web",
        category: "other",
        title: `Hub v2 问卷（${body.satisfaction}/5 分）`,
        content,
        contact,
        clientName: "hub-v2-public-survey",
        clientVersion: "1.0",
        osInfo: request.headers["user-agent"] ? String(request.headers["user-agent"]) : undefined,
        clientIp: resolveClientIp(request)
      },
      createRequestContext({
        source: "http",
        ip: request.ip,
        requestId: request.id
      })
    );

    return reply.status(201).send(ok(item, "survey submitted"));
  });

  app.post("/feedbacks", async (request, reply) => {
    const body = createFeedbackSchema.parse(request.body);

    const item = await app.container.feedbackCommand.submit(
      {
        projectKey: body.projectKey ?? null,
        source: body.source,
        category: body.category,
        title: body.title,
        content: body.content,
        contact: body.contact,
        clientName: body.clientName,
        clientVersion: body.clientVersion,
        osInfo: body.osInfo,
        clientIp: body.clientIp ?? resolveClientIp(request)
      },
      createRequestContext({
        source: "http",
        ip: request.ip,
        requestId: request.id
      })
    );

    return reply.status(201).send(ok(item, "feedback submitted"));
  });
}
