import * as path from "path";
import { ProjectServiceImpl } from "../project.service.impl";
import type { Project } from "../project.types";
import { migrateProjectsIfNeeded, ProjectRepoJsonKv } from "./index";
import { JsonFileKvRepo } from "@yinuo-ngm/storage";

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
