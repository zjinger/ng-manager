
import type { ConfigViewModel } from "../config-provider";

export type AngularOptions = {
    projects: string[];
    targets: string[];
    configurations: string[];
};

export interface AngularViewModel extends ConfigViewModel<Record<string, any>, AngularOptions> {
}