import { ConfigServiceImpl } from "@yinuo-ngm/config";
import type { ProjectService } from "@yinuo-ngm/project";

export function createConfigDomain(project: ProjectService) {
    return new ConfigServiceImpl(project);
}
