import { NginxApp } from '@yinuo-ngm/nginx';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { getNginxBindingStorePath, loadPersistedNginxPath } from './nginx.binding.store';

export default fp(async function nginxPlugin(fastify: FastifyInstance) {
    const nginxApp = new NginxApp();

    fastify.decorate('nginx', nginxApp);

    const persistedPath = await loadPersistedNginxPath();
    if (persistedPath) {
        try {
            await nginxApp.service.bind(persistedPath);
            fastify.log.info(`[nginx] restored binding from ${persistedPath}`);
        } catch (error: any) {
            fastify.log.warn(
                `[nginx] failed to restore binding from ${getNginxBindingStorePath()}: ${error?.message || error}`
            );
        }
    }

    fastify.log.info('[nginx] nginx module initialized');
});
