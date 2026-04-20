import { AnnouncementRepo } from "../modules/announcement/announcement.repo";
import { AnnouncementService } from "../modules/announcement/announcement.service";
import { AiReportSqlService } from "../modules/ai/ai-report-sql.service";
import { AiReportRenderService } from "../modules/ai/ai-report-render.service";
import { SearchRepo } from "../modules/search/search.repo";
import { SearchService } from "../modules/search/search.service";
import type { SurveyCommandContract, SurveyQueryContract } from "../modules/survey/survey.contract";
import { SurveyRepo } from "../modules/survey/survey.repo";
import { SurveyService } from "../modules/survey/survey.service";
import type { AnnouncementCommandContract, AnnouncementQueryContract } from "../modules/announcement/announcement.contract";
import type { ApiTokenCommandContract, ApiTokenQueryContract } from "../modules/api-token/api-token.contract";
import { ApiTokenRepo } from "../modules/api-token/api-token.repo";
import { ApiTokenService } from "../modules/api-token/api-token.service";
import type { AuthCommandContract, AuthQueryContract } from "../modules/auth/auth.contract";
import { DashboardService } from "../modules/dashboard/dashboard.service";
import { DashboardRepo } from "../modules/dashboard/dashboard.repo";
import type { DashboardQueryContract } from "../modules/dashboard/dashboard.contract";
import type { FeedbackCommandContract, FeedbackQueryContract } from "../modules/feedback/feedback.contract";
import { FeedbackRepo } from "../modules/feedback/feedback.repo";
import { FeedbackService } from "../modules/feedback/feedback.service";
import type { ContentLogCommandContract, ContentLogQueryContract } from "../modules/content-log/content-log.contract";
import { ContentLogRepo } from "../modules/content-log/content-log.repo";
import { ContentLogService } from "../modules/content-log/content-log.service";
import { DocumentRepo } from "../modules/document/document.repo";
import { DocumentService } from "../modules/document/document.service";
import type { DocumentCommandContract, DocumentQueryContract } from "../modules/document/document.contract";
import type {
  NotificationCommandContract,
  NotificationIngestContract,
  NotificationQueryContract
} from "../modules/notifications/notification.contract";
import { NotificationRepo } from "../modules/notifications/notification.repo";
import { NotificationService } from "../modules/notifications/notification.service";
import type { IssueCommandContract, IssueQueryContract } from "../modules/issue/issue.contract";
import type { IssueAttachmentCommandContract, IssueAttachmentQueryContract } from "../modules/issue/attachment/issue-attachment.contract";
import { IssueAttachmentRepo } from "../modules/issue/attachment/issue-attachment.repo";
import { IssueAttachmentService } from "../modules/issue/attachment/issue-attachment.service";
import type { IssueCommentCommandContract, IssueCommentQueryContract } from "../modules/issue/comment/issue-comment.contract";
import { IssueCommentRepo } from "../modules/issue/comment/issue-comment.repo";
import { IssueCommentService } from "../modules/issue/comment/issue-comment.service";
import type { IssueParticipantCommandContract, IssueParticipantQueryContract } from "../modules/issue/participant/issue-participant.contract";
import { IssueParticipantRepo } from "../modules/issue/participant/issue-participant.repo";
import { IssueParticipantService } from "../modules/issue/participant/issue-participant.service";
import type { IssueBranchCommandContract, IssueBranchQueryContract } from "../modules/issue/branch/issue-branch.contract";
import { IssueBranchRepo } from "../modules/issue/branch/issue-branch.repo";
import { IssueBranchService } from "../modules/issue/branch/issue-branch.service";
import { IssueRepo } from "../modules/issue/issue.repo";
import { IssueService } from "../modules/issue/issue.service";
import { createInMemoryEventBus } from "../shared/event/in-memory-event-bus";
import type { EventBusLogger } from "../shared/event/in-memory-event-bus";
import type { AppConfig } from "../shared/env/env";
import { AuthRepo } from "../modules/auth/auth.repo";
import { AuthService } from "../modules/auth/auth.service";
import type { ProjectCommandContract, ProjectQueryContract } from "../modules/project/project.contract";
import type { ProjectAccessContract } from "../modules/project/project-access.contract";
import { ProjectAccessService } from "../modules/project/project-access.service";
import { ProjectRepo } from "../modules/project/project.repo";
import { ProjectService } from "../modules/project/project.service";
import type { ProfileCommandContract, ProfileQueryContract } from "../modules/profile/profile.contract";
import { ProfileRepo } from "../modules/profile/profile.repo";
import { ProfileService } from "../modules/profile/profile.service";
import type { PersonalTokenCommandContract, PersonalTokenQueryContract } from "../modules/personal-token/personal-token.contract";
import { PersonalTokenRepo } from "../modules/personal-token/personal-token.repo";
import { PersonalTokenService } from "../modules/personal-token/personal-token.service";
import type { RdCommandContract, RdQueryContract } from "../modules/rd/rd.contract";
import { RdRepo } from "../modules/rd/rd.repo";
import { RdService } from "../modules/rd/rd.service";
import type { ReleaseCommandContract, ReleaseQueryContract } from "../modules/release/release.contract";
import { ReleaseRepo } from "../modules/release/release.repo";
import { ReleaseService } from "../modules/release/release.service";
import type { SharedConfigCommandContract, SharedConfigQueryContract } from "../modules/shared-config/shared-config.contract";
import { SharedConfigRepo } from "../modules/shared-config/shared-config.repo";
import { SharedConfigService } from "../modules/shared-config/shared-config.service";
import { HealthQueryService } from "../modules/system/health.query";
import type { UploadCommandContract, UploadQueryContract } from "../modules/upload/upload.contract";
import { UploadRepo } from "../modules/upload/upload.repo";
import { UploadService } from "../modules/upload/upload.service";
import type { UserCommandContract, UserQueryContract } from "../modules/user/user.contract";
import { UserRepo } from "../modules/user/user.repo";
import { UserService } from "../modules/user/user.service";
import type Database from "better-sqlite3";
import OpenAI from "openai";
import { AiIssueService } from "../modules/ai/ai-issue.service";
import { ReportPublicRepo } from "../modules/report-public/report-public.repo";
import { ReportPublicService } from "../modules/report-public/report-public.service";

export type AppContainer = {
  healthQuery: HealthQueryService;
  authCommand: AuthCommandContract;
  authQuery: AuthQueryContract;
  apiTokenCommand: ApiTokenCommandContract;
  apiTokenQuery: ApiTokenQueryContract;
  userCommand: UserCommandContract;
  userQuery: UserQueryContract;
  projectCommand: ProjectCommandContract;
  projectQuery: ProjectQueryContract;
  projectAccess: ProjectAccessContract;
  profileCommand: ProfileCommandContract;
  profileQuery: ProfileQueryContract;
  personalTokenCommand: PersonalTokenCommandContract;
  personalTokenQuery: PersonalTokenQueryContract;
  announcementCommand: AnnouncementCommandContract;
  announcementQuery: AnnouncementQueryContract;
  dashboardQuery: DashboardQueryContract;
  notificationQuery: NotificationQueryContract;
  notificationCommand: NotificationCommandContract;
  notificationIngest: NotificationIngestContract;
  feedbackCommand: FeedbackCommandContract;
  feedbackQuery: FeedbackQueryContract;
  contentLogCommand: ContentLogCommandContract;
  contentLogQuery: ContentLogQueryContract;
  documentCommand: DocumentCommandContract;
  documentQuery: DocumentQueryContract;
  issueCommand: IssueCommandContract;
  issueQuery: IssueQueryContract;
  issueAttachmentCommand: IssueAttachmentCommandContract;
  issueAttachmentQuery: IssueAttachmentQueryContract;
  issueCommentCommand: IssueCommentCommandContract;
  issueCommentQuery: IssueCommentQueryContract;
  issueParticipantCommand: IssueParticipantCommandContract;
  issueParticipantQuery: IssueParticipantQueryContract;
  issueBranchCommand: IssueBranchCommandContract;
  issueBranchQuery: IssueBranchQueryContract;
  rdCommand: RdCommandContract;
  rdQuery: RdQueryContract;
  releaseCommand: ReleaseCommandContract;
  releaseQuery: ReleaseQueryContract;
  sharedConfigCommand: SharedConfigCommandContract;
  sharedConfigQuery: SharedConfigQueryContract;
  uploadCommand: UploadCommandContract;
  uploadQuery: UploadQueryContract;
  eventBus: ReturnType<typeof createInMemoryEventBus>;
  aiIssueService: AiIssueService;
  aiReportSqlService: AiReportSqlService;
  aiReportRenderService: AiReportRenderService;
  reportPublicService: ReportPublicService;
  searchService: SearchService;
  surveyCommand: SurveyCommandContract;
  surveyQuery: SurveyQueryContract;
};

type BuildContainerOptions = {
  eventBusLogger?: EventBusLogger;
};

export function buildContainer(config: AppConfig, db: Database.Database, options: BuildContainerOptions = {}): AppContainer {
  const eventBus = createInMemoryEventBus({
    logger: options.eventBusLogger
  });
  const authRepo = new AuthRepo(db);
  const authService = new AuthService(config, authRepo);
  const userRepo = new UserRepo(db);
  const userService = new UserService(userRepo, authRepo);
  const projectRepo = new ProjectRepo(db);
  const rdRepo = new RdRepo(db);
  const projectAccess = new ProjectAccessService(projectRepo);
  const projectService = new ProjectService(projectRepo, userRepo, rdRepo, projectAccess, eventBus, db);
  const profileRepo = new ProfileRepo(db);
  const profileService = new ProfileService(profileRepo);
  const personalTokenRepo = new PersonalTokenRepo(db);
  const personalTokenService = new PersonalTokenService(personalTokenRepo, projectRepo, userRepo);
  const contentLogRepo = new ContentLogRepo(db);
  const contentLogService = new ContentLogService(contentLogRepo);
  const uploadRepo = new UploadRepo(db);
  const uploadService = new UploadService(uploadRepo, config.uploadDir);
  const announcementRepo = new AnnouncementRepo(db);
  const announcementService = new AnnouncementService(announcementRepo, projectAccess, eventBus, contentLogService);
  const documentRepo = new DocumentRepo(db);
  const documentService = new DocumentService(documentRepo, projectAccess, eventBus, contentLogService, uploadService);
  const issueRepo = new IssueRepo(db);
  const issueService = new IssueService(issueRepo, projectAccess, eventBus, uploadService);
  const issueAttachmentRepo = new IssueAttachmentRepo(db);
  const issueAttachmentService = new IssueAttachmentService(
    issueRepo,
    issueAttachmentRepo,
    uploadService,
    projectAccess,
    eventBus
  );
  const issueCommentRepo = new IssueCommentRepo(db);
  const issueCommentService = new IssueCommentService(issueRepo, issueCommentRepo, projectAccess, eventBus);
  const issueParticipantRepo = new IssueParticipantRepo(db);
  const issueParticipantService = new IssueParticipantService(issueRepo, issueParticipantRepo, projectAccess, eventBus);
  const issueBranchService = new IssueBranchService(
    issueRepo,
    new IssueBranchRepo(db),
    issueParticipantRepo,
    projectAccess,
    eventBus
  );
  const rdService = new RdService(rdRepo, projectAccess, eventBus, uploadService);
  const releaseRepo = new ReleaseRepo(db);
  const releaseService = new ReleaseService(releaseRepo, projectRepo, projectAccess, eventBus, contentLogService);
  const dashboardService = new DashboardService(
    projectAccess,
    announcementService,
    documentService,
    contentLogService,
    issueService,
    rdService,
    new DashboardRepo(db),
    projectService
  );
  const notificationService = new NotificationService(profileService, new NotificationRepo(db));
  const feedbackRepo = new FeedbackRepo(db);
  const feedbackService = new FeedbackService(feedbackRepo, projectRepo, projectAccess);
  const apiTokenRepo = new ApiTokenRepo(db);
  const apiTokenService = new ApiTokenService(
    apiTokenRepo,
    authRepo,
    projectRepo,
    projectAccess,
    issueService,
    issueCommentService,
    issueParticipantService,
    issueAttachmentService,
    issueBranchService,
    projectService,
    rdService,
    feedbackService
  );
  const sharedConfigRepo = new SharedConfigRepo(db);
  const sharedConfigService = new SharedConfigService(sharedConfigRepo, projectAccess);
  authService.ensureDefaultAdmin();

  const openaiClient = config.openaiApiKey
    ? new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl ?? undefined
    })
    : null;
  const aiIssueService = new AiIssueService(config, openaiClient);
  const aiReportSqlService = new AiReportSqlService(config, openaiClient, projectAccess);
  const aiReportRenderService = new AiReportRenderService(db);
  const reportPublicService = new ReportPublicService(config, new ReportPublicRepo(db), projectRepo);
  const searchService = new SearchService(new SearchRepo(db), projectAccess);
  const surveyService = new SurveyService(new SurveyRepo(db));

  return {
    healthQuery: new HealthQueryService(config),
    authCommand: authService,
    authQuery: authService,
    apiTokenCommand: apiTokenService,
    apiTokenQuery: apiTokenService,
    userCommand: userService,
    userQuery: userService,
    projectCommand: projectService,
    projectQuery: projectService,
    projectAccess,
    profileCommand: profileService,
    profileQuery: profileService,
    personalTokenCommand: personalTokenService,
    personalTokenQuery: personalTokenService,
    announcementCommand: announcementService,
    announcementQuery: announcementService,
    dashboardQuery: dashboardService,
    notificationQuery: notificationService,
    notificationCommand: notificationService,
    notificationIngest: notificationService,
    feedbackCommand: feedbackService,
    feedbackQuery: feedbackService,
    contentLogCommand: contentLogService,
    contentLogQuery: contentLogService,
    documentCommand: documentService,
    documentQuery: documentService,
    issueCommand: issueService,
    issueQuery: issueService,
    issueAttachmentCommand: issueAttachmentService,
    issueAttachmentQuery: issueAttachmentService,
    issueCommentCommand: issueCommentService,
    issueCommentQuery: issueCommentService,
    issueParticipantCommand: issueParticipantService,
    issueParticipantQuery: issueParticipantService,
    issueBranchCommand: issueBranchService,
    issueBranchQuery: issueBranchService,
    rdCommand: rdService,
    rdQuery: rdService,
    releaseCommand: releaseService,
    releaseQuery: releaseService,
    sharedConfigCommand: sharedConfigService,
    sharedConfigQuery: sharedConfigService,
    uploadCommand: uploadService,
    uploadQuery: uploadService,
    eventBus,
    aiIssueService,
    aiReportSqlService,
    aiReportRenderService,
    reportPublicService,
    searchService,
    surveyCommand: surveyService,
    surveyQuery: surveyService
  };
}
