import type { RequestContext } from "../../shared/context/request-context";
import type {
  ListProfileActivitiesQuery,
  ProfileActivityItem,
  ProfileNotificationPrefs,
  UpdateProfileNotificationPrefsInput
} from "./profile.types";

export interface ProfileQueryContract {
  getNotificationPrefs(ctx: RequestContext): Promise<ProfileNotificationPrefs>;
  listActivities(query: ListProfileActivitiesQuery, ctx: RequestContext): Promise<ProfileActivityItem[]>;
}

export interface ProfileCommandContract {
  updateNotificationPrefs(input: UpdateProfileNotificationPrefsInput, ctx: RequestContext): Promise<ProfileNotificationPrefs>;
}
