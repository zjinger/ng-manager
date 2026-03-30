import type { ContentLogAction, ContentLogEntity } from "./content-log.types";

export interface ContentLogCommandContract {
  create(entry: ContentLogEntity): void;
}

export interface ContentLogQueryContract {
  listRecent(projectIds: string[], limit: number, actions?: ContentLogAction[]): ContentLogEntity[];
}

