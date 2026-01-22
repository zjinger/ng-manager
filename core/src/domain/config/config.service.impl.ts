import { FileLock } from "../../infra/storage/file-lock";
import { ProjectService } from "../project";
import { ConfigCatalog, ConfigCatalogDocV1, ConfigFileType, ConfigTreeNode } from "./catalog";
import { ConfigService } from "./config.service";
import { ConfigPatch, diffToText } from "./patch";
import { ConfigSchema, ConfigViewModel, ConfigViewModelQuery, assertPatchBeforeMatch, getProviderByFramework } from "./providers";
import { WorkspaceModel, validateWorkspace, writeWorkspace } from "./workspace";

export class ConfigServiceImpl implements ConfigService {

    private fileLock = new FileLock();

    constructor(private projectService: ProjectService) { }

    async getCatalogDoc(projectId: string): Promise<ConfigCatalogDocV1> {
        const project = await this.projectService.get(projectId);
        const catalog = new ConfigCatalog();
        const tree = catalog.getTree();
        // 从 tree 收集所有出现的 file.type（去重）
        const types = new Set<ConfigFileType>();
        const walk = (nodes: ConfigTreeNode[]) => {
            for (const n of nodes) {
                if (n.file?.type) types.add(n.file.type);
                if (n.children?.length) walk(n.children);
            }
        };
        walk(tree);
        // 按 type 拿 schema（MVP：tsconfig/eslint/prettier 可先不实现）
        const schemas: Record<string, ConfigSchema> = {};
        for (const t of types) {
            try {
                const provider = getProviderByFramework(project.framework, t);
                schemas[t] = provider.getSchema();
            } catch {
                // 未实现的 provider：先不给 schema，前端可以展示“仅支持 Raw/未实现”
                // 也可以抛错更严格
            }
        }
        return {
            projectId,
            framework: project.framework,
            tree,
            schemas,
            version: 1,
        };
    }

    async getTree(projectId: string): Promise<ConfigTreeNode[]> {
        const project = await this.projectService.get(projectId);
        // MVP：catalog 先静态；后续可根据文件存在与否裁剪
        const catalog = new ConfigCatalog(/* future: framework */);
        return catalog.getTree();
    }

    async getSchema(projectId: string, type?: ConfigFileType): Promise<ConfigSchema> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, type);
        return provider.getSchema();
    }

    async getWorkspace(projectId: string, opts?: { type?: ConfigFileType; relPath?: string; }): Promise<Pick<WorkspaceModel, "filePath" | "raw">> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, opts?.type);
        const ws = await provider.load(project.root, opts?.relPath);
        validateWorkspace(ws);
        return { filePath: ws.filePath, raw: ws.raw };
    }

    async getViewModel(projectId: string, opts?: { type?: ConfigFileType; } & ConfigViewModelQuery): Promise<ConfigViewModel> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, opts?.type);
        const ws = await provider.load(project.root);
        validateWorkspace(ws);

        return provider.toViewModel(ws, {
            project: opts?.project,
            target: opts?.target,
            configuration: opts?.configuration,
        });

    }
    async diff(projectId: string, patch: ConfigPatch, opts?: { type?: ConfigFileType; }): Promise<{ patch: ConfigPatch; diffText: string; nextRawPreview: any; }> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, opts?.type);
        const ws = await provider.load(project.root);
        validateWorkspace(ws);

        // diff 也做 before 校验：早发现冲突
        assertPatchBeforeMatch(ws.raw, patch);

        const next = provider.applyPatch(ws, patch);
        validateWorkspace(next);

        return {
            patch,
            diffText: diffToText(patch),
            nextRawPreview: next.raw,
        };

    }

    async apply(projectId: string, patch: ConfigPatch, opts?: { type?: ConfigFileType; force?: boolean; }): Promise<{ saved: true; forced: boolean; filePath: string; diffText: string; }> {
        const project = await this.projectService.get(projectId);
        const provider = getProviderByFramework(project.framework, opts?.type);

        // 锁外仅为拿 filePath
        const ws = await provider.load(project.root);
        validateWorkspace(ws);

        const forced = opts?.force === true;

        return await this.fileLock.withLock(ws.filePath, async () => {
            const locked = await provider.load(project.root);
            validateWorkspace(locked);

            if (!forced) {
                assertPatchBeforeMatch(locked.raw, patch);
            }

            const next = provider.applyPatch(locked, patch);
            validateWorkspace(next);

            await writeWorkspace(next);

            return {
                saved: true as const,
                forced,
                filePath: next.filePath,
                diffText: diffToText(patch),
            };
        });
    }


}