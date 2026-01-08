// import type { FastifyInstance } from "fastify";
// import type { TopicHandler } from "./topic.types";
// import { safeSend } from "../ws.utils";

// export function createLogTopic(
//     fastify: FastifyInstance,
//     logSubs: Set<string>
// ): TopicHandler {
//     return {
//         validate: (msg) => {
//             if (msg.tail !== undefined && typeof msg.tail !== "number") {
//                 return { ok: false as const, code: "INVALID_MSG", message: "tail must be number" };
//             }
//             return { ok: true as const };
//         },

//         sub: ({ connId, conn }, msg) => {
//             logSubs.add(connId);

//             const tail = Math.min(Math.max(msg.tail ?? 200, 1), 2000);
//             const entries = fastify.core.log.tail(tail);

//             for (const entry of entries) {
//                 safeSend(conn, { op: "log", entry });
//             }
//         },

//         unsub: ({ connId }) => {
//             logSubs.delete(connId);
//         },
//     };
// }
