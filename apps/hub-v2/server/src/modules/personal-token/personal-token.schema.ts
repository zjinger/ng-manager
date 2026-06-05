import { z } from "zod";
import { createIssueSchema } from "../issue/issue.schema";
import { createRdItemSchema } from "../rd/rd.schema";

export const createPersonalIssueSchema = createIssueSchema.omit({ projectId: true }).strict();

export const createPersonalRdItemSchema = createRdItemSchema.omit({ projectId: true }).strict();

export const createPersonalRdStageTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    ownerIds: z.array(z.string().trim().min(1)).min(1),
    plannedStartAt: z.string().trim().nullable().optional(),
    plannedEndAt: z.string().trim().nullable().optional(),
    sortOrder: z.coerce.number().int().optional(),
    remark: z.string().trim().max(1000).nullable().optional()
  })
  .strict();

export const createPersonalTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z
    .array(
      z.enum([
        "issue:create:write",
        "issue:comment:write",
        "issue:transition:write",
        "issue:assign:write",
        "issue:branch:write",
        "issue:participant:write",
        "doc:create:write",
        "doc:update:write",
        "doc:publish:write",
        "rd:create:write",
        "rd:progress:write",
        "rd:stage-task:write",
        "rd:transition:write",
        "rd:edit:write"
      ])
    )
    .min(1)
    .max(16),
  expiresAt: z.string().trim().min(1).optional().nullable()
});

export const personalTokenIdParamSchema = z.object({
  tokenId: z.string().trim().min(1)
});

export const personalProjectParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80)
});

export const personalIssueIdParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  issueId: z.string().trim().min(1)
});

export const personalIssueParticipantParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  issueId: z.string().trim().min(1),
  participantId: z.string().trim().min(1)
});

export const personalIssueBranchParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  issueId: z.string().trim().min(1),
  branchId: z.string().trim().min(1)
});

export const personalRdItemIdParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  itemId: z.string().trim().min(1)
});

export const personalDocumentProjectParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80)
});

export const personalDocumentIdParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  docId: z.string().trim().min(1)
});

export const createPersonalDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    content: z.string().min(1).optional(),
    contentMd: z.string().min(1).optional(),
    slug: z.string().trim().min(1).max(80).optional(),
    category: z.string().trim().max(80).optional(),
    categoryId: z.string().trim().max(80).optional(),
    summary: z.string().trim().max(500).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    status: z.enum(["draft"]).optional(),
    source: z.string().trim().max(40).optional(),
    version: z.string().trim().max(40).optional()
  })
  .refine((value) => Boolean(value.content?.trim() || value.contentMd?.trim()), {
    message: "content is required",
    path: ["content"]
  });

export const updatePersonalDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    content: z.string().min(1).optional(),
    contentMd: z.string().min(1).optional(),
    slug: z.string().trim().min(1).max(80).optional(),
    category: z.string().trim().max(80).optional(),
    categoryId: z.string().trim().max(80).optional(),
    summary: z.string().trim().max(500).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    source: z.string().trim().max(40).optional(),
    version: z.string().trim().max(40).nullable().optional()
  })
  .strict()
  .refine(
    (value) =>
      value.title !== undefined ||
      value.content !== undefined ||
      value.contentMd !== undefined ||
      value.slug !== undefined ||
      value.category !== undefined ||
      value.categoryId !== undefined ||
      value.summary !== undefined ||
      value.version !== undefined,
    {
      message: "at least one document field is required",
      path: ["title"]
    }
  );

export const publishPersonalDocumentSchema = z
  .object({
    source: z.string().trim().max(40).optional()
  })
  .strict();
