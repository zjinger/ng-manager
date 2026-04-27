import { ConfigServiceImpl } from "../../domain/config";
import type { ProjectService } from "../../domain/project";

export function createConfigDomain(project: ProjectService) {
    return new ConfigServiceImpl(project);
}
