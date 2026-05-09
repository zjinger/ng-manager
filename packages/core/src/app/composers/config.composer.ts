import { ConfigService, createDefaultConfigRegistry } from "@yinuo-ngm/config";
import type { ProjectService } from "@yinuo-ngm/project";

export function createConfigDomain(_project: ProjectService) {
    return new ConfigService(createDefaultConfigRegistry());
}
