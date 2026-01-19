import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { configRoutes, dashboardRoutes, depsRoutes, fsRoutes, projectRoutes, systemRoutes, taskRoutes } from "../routes";

export default fp(async function configPlugin(fastify: FastifyInstance) {
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
});