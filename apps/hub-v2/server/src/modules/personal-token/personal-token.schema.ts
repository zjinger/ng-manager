import { z } from "zod";

export const createPersonalTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z
    .array(
      z.enum([
        "issue:comment:write",
        "issue:transition:write",
        "issue:assign:write",
        "issue:participant:write",
        "rd:transition:write",
        "rd:edit:write",
        "rd:delete:write"
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

export const personalRdItemIdParamSchema = z.object({
  projectKey: z.string().trim().min(1).max(80),
  itemId: z.string().trim().min(1)
});
