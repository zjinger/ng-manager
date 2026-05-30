import type { EventBus } from "../../../shared/event/event-bus";
import type { ProjectAccessContract } from "../../project/project-access.contract";
import type { UploadCommandContract } from "../../upload/upload.contract";
import type { RdRepo } from "../rd.repo";

export interface RdServiceContext {
  repo: RdRepo;
  projectAccess: ProjectAccessContract;
  eventBus: EventBus;
  uploadCommand: UploadCommandContract;
}
