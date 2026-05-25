import { z } from "zod";

export const addIssueParticipantSchema = z.object({
  userId: z.string().trim().min(1),
  taskTitle: z.string().trim().max(80).optional()
});

export const addIssueParticipantsBatchSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).min(1),
  tasks: z.array(z.object({
    userId: z.string().trim().min(1),
    title: z.string().trim().max(80).optional()
  })).optional()
});
