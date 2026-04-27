import * as path from "path";

import { ProjectServiceImpl } from "../../domain/project";
import type { Project } from "../../domain/project/project.types";
import { migrateProjectsIfNeeded, ProjectRepoJsonKv } from "../../infra/project";
import { JsonFileKvRepo } from "../../infra/storage/json-file-kv.repo";

export async function createProjectDomain(dataDir: string) {
    const projectKv = new JsonFileKvRepo<Project>(path.join(dataDir, "projects.kv.json"));

    await migrateProjectsIfNeeded({
        dbDir: dataDir,
        projectKv,
        legacyFileName: "projects.json",
        backup: true,
    });

    const projectRepo = new ProjectRepoJsonKv(projectKv);
    return new ProjectServiceImpl(projectRepo);
}
