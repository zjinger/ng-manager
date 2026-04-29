export const ProjectEvents = {
    ADDED: "project.added",
    UPDATED: "project.updated",
    REMOVED: "project.removed",
} as const;

export interface ProjectEventMap {
    "project.added": { projectId: string };
    "project.updated": { projectId: string };
    "project.removed": { projectId: string };
}
