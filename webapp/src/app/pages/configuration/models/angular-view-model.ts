
import type { ConfigViewModel } from "./config.model";

export type AngularOptions = {
    projects: string[];
    targets: string[];
    configurations: string[];
};

export type AngularViewModel = ConfigViewModel<Record<string, any>, AngularOptions>;