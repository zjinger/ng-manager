import * as fs from "fs";
import * as  path from "path";
import type { Project } from "../../domain/project/project.model";
import type { ProjectRepo } from "../../domain/project/project.repo";

interface DbShape {
    projects: Project[];
}

export class JsonProjectRepo implements ProjectRepo {
    private file: string;

    constructor(dbDir: string) {
        this.file = path.join(dbDir, "projects.json");
        this.ensure();
    }

    private ensure() {
        const dir = path.dirname(this.file);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.file)) {
            const init: DbShape = { projects: [] };
            fs.writeFileSync(this.file, JSON.stringify(init, null, 2), "utf-8");
        }
    }

    private read(): DbShape {
        const raw = fs.readFileSync(this.file, "utf-8");
        return JSON.parse(raw) as DbShape;
    }

    private write(db: DbShape) {
        fs.writeFileSync(this.file, JSON.stringify(db, null, 2), "utf-8");
    }

    async list(): Promise<Project[]> {
        return this.read().projects;
    }

    async get(id: string): Promise<Project | null> {
        const db = this.read();
        return db.projects.find(p => p.id === id) ?? null;
    }

    async findByRoot(root: string): Promise<Project | null> {
        const db = this.read();
        return db.projects.find(p => p.root === root) ?? null;
    }

    async create(p: Project): Promise<void> {
        const db = this.read();
        db.projects.push(p);
        this.write(db);
    }

    async update(id: string, patch: Partial<Project>): Promise<Project> {
        const db = this.read();
        const i = db.projects.findIndex(p => p.id === id);
        if (i === -1) throw new Error(`Project not found: ${id}`);
        db.projects[i] = { ...db.projects[i], ...patch };
        this.write(db);
        return db.projects[i];
    }

    async remove(id: string): Promise<void> {
        const db = this.read();
        db.projects = db.projects.filter(p => p.id !== id);
        this.write(db);
    }
}
