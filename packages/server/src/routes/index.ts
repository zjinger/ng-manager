import configRoutes from './config.routes';
import dashboardRoutes from './dashboard.routes';
import depsRoutes from './deps.route';
import fsRoutes from './fs.routes';
import projectRoutes from './project.routes';
import rssRoutes from './rss.routes';
import { spriteRoutes } from './sprite.routes';
import systemRoutes from './system.routes';
import taskRoutes from './task.routes';
import { apiClientCollectionsRoutes, apiClientEnvsRoutes, apiClientHistoryRoutes, apiClientRequestsRoutes, apiClientSendRoutes } from './api-client';
import { FastifyInstance } from 'fastify';
import svnRoutes from './svn.routes';

export default async function routes(fastify: FastifyInstance) {
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
    // sprite
    await fastify.register(spriteRoutes, { prefix: '/api/sprite' });
    // svn
    await fastify.register(svnRoutes, { prefix: '/api/svn' });

    // api-client
    await fastify.register(apiClientEnvsRoutes, { prefix: '/api/client/envs' });
    await fastify.register(apiClientRequestsRoutes, { prefix: '/api/client/requests' });
    await fastify.register(apiClientHistoryRoutes, { prefix: '/api/client/history' });
    await fastify.register(apiClientSendRoutes, { prefix: '/api/client/send' });
    await fastify.register(apiClientCollectionsRoutes, { prefix: '/api/client/collections' });
}