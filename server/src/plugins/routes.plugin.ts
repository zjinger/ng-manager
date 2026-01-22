import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { configRoutes, dashboardRoutes, depsRoutes, fsRoutes, projectRoutes, rssRoutes, systemRoutes, taskRoutes } from "../routes";

export default fp(async function routesPlugin(fastify: FastifyInstance) {
    // system
    await fastify.register(systemRoutes);
    // routes
    await fastify.register(taskRoutes, { prefix: '/api/tasks' });
    //projects 
    await fastify.register(projectRoutes, { prefix: '/api/projects' });
    // deps 
    await fastify.register(depsRoutes, { prefix: '/api/deps' });
    // fs
    await fastify.register(fsRoutes, { prefix: '/api/fs' });
    // config
    await fastify.register(configRoutes, { prefix: '/api/config' });

    // dashboard
    await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });

    // rss
    await fastify.register(rssRoutes, { prefix: '/api/rss' });
});