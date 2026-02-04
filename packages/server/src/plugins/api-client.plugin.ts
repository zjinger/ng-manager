import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import * as path from "path";

import { ApiClient, JsonHistoryRepo, JsonRequestRepo } from "@yinuo-ngm/api";
import { env } from "../env";
import { JsonEnvRepo } from "@yinuo-ngm/api/src/storage/json/json-env-repo";

export default fp(async function apiClientPlugin(fastify: FastifyInstance) {
    const rootDir = path.join(env.dataDir, "api");
    const repo = new JsonRequestRepo({ rootDir });
    const envRepo = new JsonEnvRepo({ rootDir });
    const historyRepo = new JsonHistoryRepo({ rootDir });

    const apiClient = new ApiClient(repo, envRepo, historyRepo);

    fastify.decorate("api", apiClient);

    fastify.log.info("[api] api client initialized");

});
