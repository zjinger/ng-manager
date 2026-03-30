import type { ContentLogCommandContract, ContentLogQueryContract } from "./content-log.contract";
import { ContentLogRepo } from "./content-log.repo";
import type { ContentLogAction, ContentLogEntity } from "./content-log.types";

export class ContentLogService implements ContentLogCommandContract, ContentLogQueryContract {
  constructor(private readonly repo: ContentLogRepo) {}

  create(entry: ContentLogEntity): void {
    this.repo.create(entry);
  }

  listRecent(projectIds: string[], limit: number, actions?: ContentLogAction[]): ContentLogEntity[] {
    return this.repo.listRecent(projectIds, limit, actions);
  }
}

