import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import routes from "../routes";

export default fp(async function routesPlugin(fastify: FastifyInstance) {
    await routes(fastify);
});