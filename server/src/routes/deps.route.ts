import type { FastifyInstance } from "fastify";

export default async function depsRoutes(fastify: FastifyInstance) {

    fastify.get("/list/:projectId", async (req) => {
        const { projectId } = req.params as any;
        const data = await fastify.core.deps.list(projectId);
        return data;
    });

    fastify.post("/install/:projectId", async (req) => {
        const { projectId } = req.params as any;
        const body = req.body as {
            name: string;
            group: "dependencies" | "devDependencies";
            target: "required" | "latest" | "custom";
            version?: string;
        };

        await fastify.core.deps.install(projectId, body);
        return { ok: true };
    });

    fastify.post("/uninstall/:projectId", async (req) => {
        const { projectId } = req.params as any;
        const body = req.body as {
            name: string;
            group: "dependencies" | "devDependencies";
        };

        await fastify.core.deps.uninstall(projectId, body);
        return { ok: true };
    });

    fastify.post("/devtools/install/:projectId", async (req) => {
        // // 先给最小实现：安装一组推荐包（可按需要改）
        // const { projectId } = req.params as any;
        // const project = await fastify.core.project.get(projectId);

        // // 举例：eslint/prettier（也可以换成你自己的 devtools 集合）
        // const pkgs = ["eslint", "prettier"];
        // for (const name of pkgs) {
        //     await fastify.core.deps.install(projectId, {
        //         name,
        //         group: "devDependencies",
        //         target: "latest",
        //     });
        // }
        return { ok: true };
    });
}
