// import type { FastifyInstance } from "fastify";
// import type { TopicHandler } from "./topic.types";
// import { safeSend } from "../ws.utils";

// export function createTaskTopic(
//     fastify: FastifyInstance,
//     subs: Map<string, Set<string>>
// ): TopicHandler {
//     return {
//         validate: (msg) => {
//             if (!msg?.taskId || typeof msg.taskId !== "string") {
//                 return { ok: false as const, code: "INVALID_MSG", message: "taskId required" };
//             }
//             if (msg.tail !== undefined && typeof msg.tail !== "number") {
//                 return { ok: false as const, code: "INVALID_MSG", message: "tail must be number" };
//             }
//             return { ok: true as const };
//         },

//         sub: async ({ connId, conn }, msg) => {
//             subs.get(connId)!.add(msg.taskId);

//             const tail = Math.min(Math.max(msg.tail ?? 200, 1), 2000);
//             const entries = fastify.core.log.tail(tail, { refId: msg.taskId });

//             for (const entry of entries) {
//                 safeSend(conn, { op: "log", taskId: msg.taskId, entry });
//             }

//             const status = await fastify.core.task.status(msg.taskId);
//             safeSend(conn, { op: "status", taskId: msg.taskId, event: "snapshot", payload: status });
//         },

//         unsub: ({ connId }, msg) => {
//             subs.get(connId)?.delete(msg.taskId);
//         },
//     };
// }
