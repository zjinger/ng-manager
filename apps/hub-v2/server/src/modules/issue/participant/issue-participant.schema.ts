import { z } from "zod";

export const addIssueParticipantSchema = z.object({
  userId: z.string().trim().min(1)
});
