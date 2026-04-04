import { z } from "zod";

const surveyStatusSchema = z.enum(["draft", "published", "archived"]);
const surveyQuestionTypeSchema = z.enum(["text", "textarea", "single_choice", "multi_choice", "rating"]);

const surveyOptionInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120),
  sort: z.coerce.number().int().min(0).optional()
});

const surveyQuestionInputSchema = z
  .object({
    key: z.string().trim().min(1).max(40).optional(),
    pageTitle: z.string().trim().max(40).optional(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(400).optional(),
    type: surveyQuestionTypeSchema,
    required: z.boolean().optional(),
    sort: z.coerce.number().int().min(0).optional(),
    placeholder: z.string().trim().max(200).optional(),
    minValue: z.coerce.number().int().optional(),
    maxValue: z.coerce.number().int().optional(),
    maxSelect: z.coerce.number().int().positive().optional(),
    options: z.array(surveyOptionInputSchema).max(30).optional()
  })
  .superRefine((value, ctx) => {
    if ((value.type === "single_choice" || value.type === "multi_choice") && (!value.options || value.options.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "choice question must have at least 2 options",
        path: ["options"]
      });
    }

    if (value.type === "rating") {
      const min = value.minValue ?? 1;
      const max = value.maxValue ?? 5;
      if (min < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minValue must be >= 0",
          path: ["minValue"]
        });
      }
      if (max <= min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "maxValue must be greater than minValue",
          path: ["maxValue"]
        });
      }
    }
  });

const baseSurveyInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional(),
    slug: z.string().trim().min(1).max(80).optional(),
    isPublic: z.boolean().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    questions: z.array(surveyQuestionInputSchema).min(1).max(100)
  })
  .superRefine((value, ctx) => {
    if (value.startAt && value.endAt && value.startAt > value.endAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startAt must be earlier than endAt",
        path: ["startAt"]
      });
    }
  });

export const createSurveySchema = baseSurveyInputSchema;
export const updateSurveySchema = baseSurveyInputSchema;

export const listSurveysQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional(),
  status: surveyStatusSchema.optional()
});

export const listSurveySubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().optional()
});

export const createSurveySubmissionSchema = z.object({
  contact: z.string().trim().max(120).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1).max(80),
        value: z.unknown()
      })
    )
    .max(100)
});
