import * as path from "path";
import { ProjectServiceImpl } from "../project.service.impl";
import type { Project } from "../project.types";
import { migrateProjectsIfNeeded } from "./project.migrate";
import { ProjectRepoJsonKv } from "./project.repo.jsonkv";
import {
    migrateJsonKvFileIfNeeded,
    type SqliteDatabase,
    SqliteJsonKvRepo,
} from "@yinuo-ngm/storage";

export async function createProjectDomain(opts: {
    dataDir: string;
    db: SqliteDatabase;
}) {
    const dataDir = opts.dataDir;
    const db = opts.db;
    const projectKv = new SqliteJsonKvRepo<Project>(db, { tableName: "projects" });

    await migrateJsonKvFileIfNeeded({
        sourceFile: path.join(dataDir, "projects.kv.json"),
        target: projectKv,
        backup: true,
    });

    await migrateProjectsIfNeeded({
        dbDir: dataDir,
        projectKv,
        legacyFileName: "projects.json",
        backup: true,
    });

    const projectRepo = new ProjectRepoJsonKv(projectKv);
    return new ProjectServiceImpl(projectRepo);
}
