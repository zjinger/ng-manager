import { z } from "zod";

export const addIssueParticipantSchema = z.object({
  userId: z.string().trim().min(1)
});

export const addIssueParticipantsBatchSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).min(1)
});
