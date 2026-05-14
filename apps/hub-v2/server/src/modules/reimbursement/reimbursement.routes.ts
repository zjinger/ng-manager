import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/auth/require-auth";
import { ok } from "../../shared/http/response";
import {
  attachReimbursementUploadSchema,
  createReimbursementClaimSchema,
  listReimbursementClaimsQuerySchema,
  reimbursementActionSchema,
  reimbursementStatsQuerySchema,
  reimbursementTransferSchema,
  updateReimbursementClaimSchema
} from "./reimbursement.schema";
import type { ListReimbursementClaimsQuery, ReimbursementStatsQuery } from "./reimbursement.types";

export default async function reimbursementRoutes(app: FastifyInstance) {
  app.get("/reimbursements/dashboard", async (request) => {
    const ctx = requireAuth(request);
    return ok(await app.container.reimbursementQuery.dashboard(ctx));
  });

  app.get("/reimbursements/stats", async (request) => {
    const ctx = requireAuth(request);
    const query = reimbursementStatsQuerySchema.parse(request.query) as ReimbursementStatsQuery;
    return ok(await app.container.reimbursementQuery.stats(query, ctx));
  });

  app.get("/reimbursements/claims", async (request) => {
    const ctx = requireAuth(request);
    const query = listReimbursementClaimsQuerySchema.parse(request.query) as ListReimbursementClaimsQuery;
    return ok(await app.container.reimbursementQuery.list(query, ctx));
  });

  app.post("/reimbursements/claims", async (request, reply) => {
    const ctx = requireAuth(request);
    const body = createReimbursementClaimSchema.parse(request.body);
    return reply.status(201).send(ok(await app.container.reimbursementCommand.create(body, ctx), "reimbursement claim created"));
  });

  app.get("/reimbursements/claims/:claimId", async (request) => {
    const ctx = requireAuth(request);
    const { claimId } = request.params as { claimId: string };
    return ok(await app.container.reimbursementQuery.getById(claimId, ctx));
  });

  app.patch("/reimbursements/claims/:claimId", async (request) => {
    const ctx = requireAuth(request);
    const { claimId } = request.params as { claimId: string };
    const body = updateReimbursementClaimSchema.parse(request.body);
    return ok(await app.container.reimbursementCommand.update(claimId, body, ctx), "reimbursement claim updated");
  });

  app.post("/reimbursements/claims/:claimId/submit", async (request) => {
    const ctx = requireAuth(request);
    const { claimId } = request.params as { claimId: string };
    return ok(await app.container.reimbursementCommand.submit(claimId, ctx), "reimbursement claim submitted");
  });

  app.post("/reimbursements/claims/:claimId/approve", async (request) => {
    const ctx = requireAuth(request);
    const { claimId } = request.params as { claimId: string };
    const body = reimbursementActionSchema.parse(request.body ?? {});
    return ok(await app.container.reimbursementCommand.approve(claimId, body, ctx), "reimbursement claim approved");
  });

  app.post("/reimbursements/claims/:claimId/reject", async (request) => {
    const ctx = requireAuth(request);
    const { claimId } = request.params as { claimId: string };
    const body = reimbursementActionSchema.parse(request.body ?? {});
    return ok(await app.container.reimbursementCommand.reject(claimId, body, ctx), "reimbursement claim rejected");
  });

  app.post("/reimbursements/claims/:claimId/transfer", async (request) => {
    const ctx = requireAuth(request);
    const { claimId } = request.params as { claimId: string };
    const body = reimbursementTransferSchema.parse(request.body ?? {});
    return ok(await app.container.reimbursementCommand.transfer(claimId, body, ctx), "reimbursement approval transferred");
  });

  app.post("/reimbursements/claims/:claimId/add-sign", async (request) => {
    const ctx = requireAuth(request);
    const { claimId } = request.params as { claimId: string };
    const body = reimbursementTransferSchema.parse(request.body ?? {});
    return ok(await app.container.reimbursementCommand.addSign(claimId, body, ctx), "reimbursement approval add-sign created");
  });

  app.post("/reimbursements/claims/:claimId/attachments", async (request) => {
    const ctx = requireAuth(request);
    const { claimId } = request.params as { claimId: string };
    const body = attachReimbursementUploadSchema.parse(request.body ?? {});
    return ok(await app.container.reimbursementCommand.attach(claimId, body, ctx), "reimbursement attachment added");
  });

  app.delete("/reimbursements/claims/:claimId/attachments/:attachmentId", async (request) => {
    const ctx = requireAuth(request);
    const { claimId, attachmentId } = request.params as { claimId: string; attachmentId: string };
    return ok(await app.container.reimbursementCommand.detach(claimId, attachmentId, ctx), "reimbursement attachment removed");
  });
}
