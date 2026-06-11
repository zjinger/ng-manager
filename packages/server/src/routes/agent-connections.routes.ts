import type { FastifyInstance } from "fastify";
import {
  parseCreateHubV2ConnectionInput,
  parseHubV2NameParam,
  parseUpdateHubV2ConnectionInput,
} from "../modules/agent-connections/agent-connections.schema";
import { AgentConnectionsService } from "../modules/agent-connections/agent-connections.service";
import type { AgentConnectionsRoutesOptions } from "../modules/agent-connections/agent-connections.types";

export default async function agentConnectionsRoutes(
  fastify: FastifyInstance,
  opts: AgentConnectionsRoutesOptions
) {
  const service = new AgentConnectionsService({ dataDir: opts?.dataDir });

  fastify.get("/hub-v2", async () => {
    return service.listHubV2Connections();
  });

  fastify.post("/hub-v2", async (req) => {
    const input = parseCreateHubV2ConnectionInput(req.body);
    return service.createHubV2Connection(input);
  });

  fastify.put<{ Params: { name: string } }>("/hub-v2/:name", async (req) => {
    const name = parseHubV2NameParam(req.params?.name);
    const patch = parseUpdateHubV2ConnectionInput(req.body);
    return service.updateHubV2Connection(name, patch);
  });

  fastify.delete<{ Params: { name: string } }>("/hub-v2/:name", async (req) => {
    const name = parseHubV2NameParam(req.params?.name);
    return service.deleteHubV2Connection(name);
  });

  fastify.post<{ Params: { name: string } }>("/hub-v2/:name/set-default", async (req) => {
    const name = parseHubV2NameParam(req.params?.name);
    return service.setDefaultHubV2Connection(name);
  });

  fastify.post<{ Params: { name: string } }>("/hub-v2/:name/test", async (req) => {
    const name = parseHubV2NameParam(req.params?.name);
    return service.testHubV2Connection(name);
  });

  fastify.post("/mcp-check", async () => {
    return service.checkMcpServer();
  });

  fastify.post("/mcp-doctor", async () => {
    return service.runMcpDoctor();
  });
}
