import {
    ApiClient,
    JsonEnvRepo,
    JsonHistoryRepo,
    JsonRequestRepo,
    NodeHttpClient,
    VariableResolver,
    ApiSendService,
    JsonCollectionRepo
} from "@yinuo-ngm/api";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import * as path from "path";
import { env } from "../env";

export default fp(async function apiClientPlugin(fastify: FastifyInstance) {
    const rootDir = path.join(env.dataDir, "api");
    const repo = new JsonRequestRepo({ rootDir });
    const envRepo = new JsonEnvRepo({ rootDir });
    const historyRepo = new JsonHistoryRepo({ rootDir });
    const collectionRepo = new JsonCollectionRepo({ rootDir });

    const http = new NodeHttpClient();
    const resolver = new VariableResolver();
    const sendService = new ApiSendService(repo, envRepo, historyRepo, http, resolver);
    const apiClient = new ApiClient(repo, envRepo, historyRepo, collectionRepo, sendService);

    fastify.decorate("api", apiClient);

    fastify.log.info("[api] api client initialized");

});
