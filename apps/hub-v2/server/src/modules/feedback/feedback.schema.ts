import { z } from "zod";
const feedbackStatusSchema = z.enum(["open", "processing", "resolved", "closed"]);
const feedbackCategorySchema = z.enum(["bug", "suggestion", "feature", "other"]);
const feedbackSourceSchema = z.enum(["desktop", "cli", "web", "mobile", "applet"]);
const surveyRoleSchema = z.enum(["developer", "tester", "pm", "ops", "other"]);
const surveyUsageFrequencySchema = z.enum(["daily", "weekly", "monthly", "first_time"]);
const surveyFocusModuleSchema = z.enum(["dashboard", "issues", "rd", "content", "report", "other"]);

function csvEnumArray<T extends [string, ...string[]]>(values: T) {
  const itemSchema = z.enum(values);
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(itemSchema).optional());
}

export const createFeedbackSchema = z.object({
  projectKey: z.string().trim().min(1).max(80).nullable().optional(),
  source: feedbackSourceSchema,
  category: feedbackCategorySchema,
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  contact: z.string().trim().max(120).optional(),
  clientName: z.string().trim().max(120).optional(),
  clientVersion: z.string().trim().max(60).optional(),
  osInfo: z.string().trim().max(200).optional(),
  clientIp: z.string().trim().max(80).optional()
});

export const createSurveyFeedbackSchema = z.object({
  nickname: z.string().trim().max(40).optional(),
  role: surveyRoleSchema,
  usageFrequency: surveyUsageFrequencySchema,
  satisfaction: z.coerce.number().int().min(1).max(5),
  focusModules: z.array(surveyFocusModuleSchema).min(1).max(3),
  highlights: z.string().trim().max(1000).optional(),
  improvement: z.string().trim().min(1).max(1500),
  contact: z.string().trim().max(120).optional()
});

export const updateFeedbackStatusSchema = z.object({
  status: feedbackStatusSchema
});

export const listFeedbacksQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: csvEnumArray(["open", "processing", "resolved", "closed"]),
  category: csvEnumArray(["bug", "suggestion", "feature", "other"]),
  source: csvEnumArray(["desktop", "cli", "web", "mobile", "applet"]),
  clientName: z.string().trim().max(120).optional(),
  projectId: z.string().trim().max(80).optional(),
  projectKey: z.string().trim().max(80).optional()
});
