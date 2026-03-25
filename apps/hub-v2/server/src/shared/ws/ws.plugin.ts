import fastifyWebsocket from "@fastify/websocket";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createRequestContext } from "../context/request-context";
import type { AuthJwtPayload } from "../auth/jwt-payload";
import { WsHub } from "./ws-hub";
import type { WsClientMessage, WsServerMessage } from "./ws.types";

function parseIncomingMessage(raw: unknown): WsClientMessage | null {
  if (typeof raw !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as WsClientMessage;
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const wsPlugin = fp(async (app: FastifyInstance) => {
  const wsHub = new WsHub();
  app.decorate("wsHub", wsHub);

  await app.register(fastifyWebsocket);

  app.get(
    "/api/admin/ws",
    { websocket: true },
    async (socket, request) => {
      let payload: AuthJwtPayload | null = null;
      try {
        payload = await request.jwtVerify<AuthJwtPayload>();
      } catch {
        socket.close(1008, "unauthorized");
        return;
      }

      const requestContext = createRequestContext({
        accountId: payload.accountId,
        nickname: payload.nickname ?? null,
        userId: payload.userId ?? null,
        roles: payload.role ? [payload.role] : [],
        source: "ws",
        requestId: request.id,
        ip: request.ip,
        userAgent:
          typeof request.headers["user-agent"] === "string"
            ? request.headers["user-agent"]
            : request.headers["user-agent"]?.[0]
      });

      let projectIds: string[] = [];
      try {
        const accessibleProjects = await app.container.projectQuery.listAccessible(
          { page: 1, pageSize: 500 },
          requestContext
        );
        projectIds = accessibleProjects.items.map((item) => item.id);
      } catch {
        socket.close(1011, "project_scope_failed");
        return;
      }

      const session = wsHub.addClient(
        socket,
        {
          accountId: payload.accountId,
          userId: payload.userId ?? null,
          roles: payload.role ? [payload.role] : [],
          projectIds
        },
        requestContext
      );

      const hello: WsServerMessage = {
        type: "server.hello",
        ts: new Date().toISOString(),
        payload: {
          connectionId: session.id
        }
      };
      socket.send(JSON.stringify(hello));

      socket.on("message", (raw: unknown) => {
        const rawText =
          typeof raw === "string"
            ? raw
            : raw instanceof Buffer
              ? raw.toString("utf8")
              : null;
        const message = parseIncomingMessage(rawText);
        if (!message) {
          return;
        }
        if (message.type === "system.pong") {
          wsHub.touchPong(session.id);
          return;
        }
        if (message.type === "subscribe.project") {
          wsHub.setSubscribedProject(session.id, message.projectId?.trim() || null);
        }
      });
    }
  );
});
