import { createNodeRuntimeService } from "@yinuo-ngm/node-runtime";
import type { NodeRuntimeService } from "@yinuo-ngm/node-runtime";

export function createNodeRuntimeDomain(opts: { dataDir: string }): NodeRuntimeService {
    return createNodeRuntimeService({ dataDir: opts.dataDir });
}

export type { NodeRuntimeService };
