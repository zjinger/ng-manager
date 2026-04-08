import { z } from "zod";

export const createIssueBranchSchema = z.object({
  ownerUserId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(80)
});

export const startOwnIssueBranchSchema = z.object({
  title: z.string().trim().min(1).max(80)
});

export const completeIssueBranchSchema = z.object({
  summary: z.string().trim().max(500).optional()
});
