import { AnnouncementRepo } from "../modules/announcement/announcement.repo";
import { AnnouncementService } from "../modules/announcement/announcement.service";
import type { ApprovalTemplateCommandContract, ApprovalTemplateQueryContract } from "../modules/approval-template/approval-template.contract";
import { ApprovalTemplateRepo } from "../modules/approval-template/approval-template.repo";
import { ApprovalTemplateService } from "../modules/approval-template/approval-template.service";
import type { AuditLogCommandContract, AuditLogQueryContract } from "../modules/audit-log/audit-log.contract";
import { AuditLogRepo } from "../modules/audit-log/audit-log.repo";
import { AuditLogService } from "../modules/audit-log/audit-log.service";
import { AiReportSqlService } from "../modules/ai/ai-report-sql.service";
import { AiReportRenderService } from "../modules/ai/ai-report-render.service";
import { AdminSearchService } from "../modules/admin-search/admin-search.service";
import { SearchRepo } from "../modules/search/search.repo";
import { SearchService } from "../modules/search/search.service";
import type { SurveyCommandContract, SurveyQueryContract } from "../modules/survey/survey.contract";
import { SurveyRepo } from "../modules/survey/survey.repo";
import { SurveyService } from "../modules/survey/survey.service";
import type { AnnouncementCommandContract, AnnouncementQueryContract } from "../modules/announcement/announcement.contract";
import type { ApiTokenCommandContract, ApiTokenQueryContract } from "../modules/api-token/api-token.contract";
import { ApiTokenRepo } from "../modules/api-token/api-token.repo";
import { ApiTokenService } from "../modules/api-token/api-token.service";
import type {
  ApiTokenAuditLogCommandContract,
  ApiTokenAuditLogQueryContract
} from "../modules/api-token-audit-log/api-token-audit-log.contract";
import { ApiTokenAuditLogRepo } from "../modules/api-token-audit-log/api-token-audit-log.repo";
import { ApiTokenAuditLogService } from "../modules/api-token-audit-log/api-token-audit-log.service";
import type { AuthCommandContract, AuthQueryContract } from "../modules/auth/auth.contract";
import { DashboardService } from "../modules/dashboard/dashboard.service";
import { DashboardRepo } from "../modules/dashboard/dashboard.repo";
import type { DashboardQueryContract } from "../modules/dashboard/dashboard.contract";
import type { DeliveryWeeklyReportCommandContract, DeliveryWeeklyReportQueryContract } from "../modules/delivery-weekly-report/delivery-weekly-report.contract";
import { DeliveryWeeklyReportRepo } from "../modules/delivery-weekly-report/delivery-weekly-report.repo";
import { DeliveryWeeklyReportService } from "../modules/delivery-weekly-report/delivery-weekly-report.service";
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
import type { OrganizationCommandContract, OrganizationQueryContract } from "../modules/organization/organization.contract";
import { OrganizationRepo } from "../modules/organization/organization.repo";
import { OrganizationService } from "../modules/organization/organization.service";
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
import { ProjectAuthorizationService } from "../modules/project/project-authorization.service";
import { ProjectAccessService } from "../modules/project/project-access.service";
import { ProjectRepo } from "../modules/project/project.repo";
import { ProjectService } from "../modules/project/project.service";
import type { ProfileCommandContract, ProfileQueryContract } from "../modules/profile/profile.contract";
import { ProfileRepo } from "../modules/profile/profile.repo";
import { ProfileService } from "../modules/profile/profile.service";
import type { PersonalTokenCommandContract, PersonalTokenQueryContract } from "../modules/personal-token/personal-token.contract";
import { PersonalTokenRepo } from "../modules/personal-token/personal-token.repo";
import { PersonalTokenService } from "../modules/personal-token/personal-token.service";
import type { PersonalTodoCommandContract, PersonalTodoQueryContract } from "../modules/personal-todo/personal-todo.contract";
import { PersonalTodoRepo } from "../modules/personal-todo/personal-todo.repo";
import { PersonalTodoService } from "../modules/personal-todo/personal-todo.service";
import type { RdCommandContract, RdQueryContract } from "../modules/rd/rd.contract";
import { RdRepo } from "../modules/rd/rd.repo";
import { RdService } from "../modules/rd/rd.service";
import type { RdTaskSheetCommandContract, RdTaskSheetQueryContract } from "../modules/rd/rd-task-sheet.contract";
import { RdTaskSheetRepo } from "../modules/rd/rd-task-sheet.repo";
import { RdTaskSheetService } from "../modules/rd/rd-task-sheet.service";
import type { ReleaseCommandContract, ReleaseQueryContract } from "../modules/release/release.contract";
import { ReleaseRepo } from "../modules/release/release.repo";
import { ReleaseService } from "../modules/release/release.service";
import type { SharedConfigCommandContract, SharedConfigQueryContract } from "../modules/shared-config/shared-config.contract";
import { SharedConfigRepo } from "../modules/shared-config/shared-config.repo";
import { SharedConfigService } from "../modules/shared-config/shared-config.service";
import type { SystemRbacCommandContract, SystemRbacQueryContract } from "../modules/system-rbac/system-rbac.contract";
import { SystemRbacRepo } from "../modules/system-rbac/system-rbac.repo";
import { SystemRbacService } from "../modules/system-rbac/system-rbac.service";
import type { ProjectTitleCommandContract, ProjectTitleQueryContract } from "../modules/project-title/project-title.contract";
import { ProjectTitleRepo } from "../modules/project-title/project-title.repo";
import { ProjectTitleService } from "../modules/project-title/project-title.service";
import type { OrganizationTitleCommandContract, OrganizationTitleQueryContract } from "../modules/organization-title/organization-title.contract";
import { OrganizationTitleRepo } from "../modules/organization-title/organization-title.repo";
import { OrganizationTitleService } from "../modules/organization-title/organization-title.service";
import type { SystemSettingsCommandContract, SystemSettingsQueryContract } from "../modules/system-settings/system-settings.contract";
import { SystemSettingsRepo } from "../modules/system-settings/system-settings.repo";
import { SystemSettingsService } from "../modules/system-settings/system-settings.service";
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
import type { ReimbursementCommandContract, ReimbursementQueryContract } from "../modules/reimbursement/reimbursement.contract";
import { ReimbursementRepo } from "../modules/reimbursement/reimbursement.repo";
import { ReimbursementService } from "../modules/reimbursement/reimbursement.service";
import type { ErrorReportCommandContract, ErrorReportQueryContract } from "../modules/error-report/error-report.contract";
import { ErrorReportRepo } from "../modules/error-report/error-report.repo";
import { ErrorReportService } from "../modules/error-report/error-report.service";

export type AppContainer = {
  healthQuery: HealthQueryService;
  authCommand: AuthCommandContract;
  authQuery: AuthQueryContract;
  apiTokenCommand: ApiTokenCommandContract;
  apiTokenQuery: ApiTokenQueryContract;
  apiTokenAuditLogCommand: ApiTokenAuditLogCommandContract;
  apiTokenAuditLogQuery: ApiTokenAuditLogQueryContract;
  userCommand: UserCommandContract;
  userQuery: UserQueryContract;
  projectCommand: ProjectCommandContract;
  projectQuery: ProjectQueryContract;
  projectAccess: ProjectAccessContract;
  profileCommand: ProfileCommandContract;
  profileQuery: ProfileQueryContract;
  personalTodoCommand: PersonalTodoCommandContract;
  personalTodoQuery: PersonalTodoQueryContract;
  personalTokenCommand: PersonalTokenCommandContract;
  personalTokenQuery: PersonalTokenQueryContract;
  announcementCommand: AnnouncementCommandContract;
  announcementQuery: AnnouncementQueryContract;
  approvalTemplateCommand: ApprovalTemplateCommandContract;
  approvalTemplateQuery: ApprovalTemplateQueryContract;
  auditLogCommand: AuditLogCommandContract;
  auditLogQuery: AuditLogQueryContract;
  dashboardQuery: DashboardQueryContract;
  deliveryWeeklyReportCommand: DeliveryWeeklyReportCommandContract;
  deliveryWeeklyReportQuery: DeliveryWeeklyReportQueryContract;
  notificationQuery: NotificationQueryContract;
  notificationCommand: NotificationCommandContract;
  notificationIngest: NotificationIngestContract;
  organizationCommand: OrganizationCommandContract;
  organizationQuery: OrganizationQueryContract;
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
  rdTaskSheetCommand: RdTaskSheetCommandContract;
  rdTaskSheetQuery: RdTaskSheetQueryContract;
  releaseCommand: ReleaseCommandContract;
  releaseQuery: ReleaseQueryContract;
  sharedConfigCommand: SharedConfigCommandContract;
  sharedConfigQuery: SharedConfigQueryContract;
  systemRbacCommand: SystemRbacCommandContract;
  systemRbacQuery: SystemRbacQueryContract;
  projectTitleCommand: ProjectTitleCommandContract;
  projectTitleQuery: ProjectTitleQueryContract;
  organizationTitleCommand: OrganizationTitleCommandContract;
  organizationTitleQuery: OrganizationTitleQueryContract;
  systemSettingsCommand: SystemSettingsCommandContract;
  systemSettingsQuery: SystemSettingsQueryContract;
  uploadCommand: UploadCommandContract;
  uploadQuery: UploadQueryContract;
  eventBus: ReturnType<typeof createInMemoryEventBus>;
  aiIssueService: AiIssueService;
  aiReportSqlService: AiReportSqlService;
  aiReportRenderService: AiReportRenderService;
  adminSearchService: AdminSearchService;
  reportPublicService: ReportPublicService;
  searchService: SearchService;
  surveyCommand: SurveyCommandContract;
  surveyQuery: SurveyQueryContract;
  reimbursementCommand: ReimbursementCommandContract;
  reimbursementQuery: ReimbursementQueryContract;
  errorReportCommand: ErrorReportCommandContract;
  errorReportQuery: ErrorReportQueryContract;
};

type BuildContainerOptions = {
  eventBusLogger?: EventBusLogger;
};

export function buildContainer(config: AppConfig, db: Database.Database, options: BuildContainerOptions = {}): AppContainer {
  const eventBus = createInMemoryEventBus({
    logger: options.eventBusLogger
  });
  const authRepo = new AuthRepo(db);
  const auditLogService = new AuditLogService(new AuditLogRepo(db));
  const systemRbacRepo = new SystemRbacRepo(db);
  const authService = new AuthService(config, authRepo);
  const organizationRepo = new OrganizationRepo(db);
  const organizationService = new OrganizationService(organizationRepo, auditLogService);
  const projectTitleService = new ProjectTitleService(new ProjectTitleRepo(db), auditLogService);
  const organizationTitleService = new OrganizationTitleService(new OrganizationTitleRepo(db), auditLogService);
  const userRepo = new UserRepo(db);
  const userService = new UserService(
    userRepo,
    authRepo,
    organizationService,
    organizationTitleService,
    projectTitleService,
    auditLogService
  );
  const projectRepo = new ProjectRepo(db);
  const rdRepo = new RdRepo(db);
  const projectAuthorization = new ProjectAuthorizationService(db, projectRepo);
  const projectAccess = new ProjectAccessService(projectRepo, projectAuthorization);
  const projectService = new ProjectService(
    projectRepo,
    userRepo,
    rdRepo,
    projectAccess,
    projectAuthorization,
    eventBus,
    db,
    config.initAdminUsername
  );
  const profileRepo = new ProfileRepo(db);
  const profileService = new ProfileService(profileRepo);
  const uploadRepo = new UploadRepo(db);
  const uploadService = new UploadService(uploadRepo, config.uploadDir);
  const personalTodoService = new PersonalTodoService(new PersonalTodoRepo(db), uploadService);
  const personalTokenRepo = new PersonalTokenRepo(db);
  const personalTokenService = new PersonalTokenService(personalTokenRepo, projectRepo, userRepo);
  const contentLogRepo = new ContentLogRepo(db);
  const contentLogService = new ContentLogService(contentLogRepo);
  const announcementRepo = new AnnouncementRepo(db);
  const announcementService = new AnnouncementService(announcementRepo, projectAccess, eventBus, contentLogService);
  const approvalTemplateService = new ApprovalTemplateService(new ApprovalTemplateRepo(db));
  const documentRepo = new DocumentRepo(db);
  const documentService = new DocumentService(
    documentRepo,
    projectRepo,
    projectAccess,
    eventBus,
    contentLogService,
    uploadService
  );
  const issueRepo = new IssueRepo(db);
  const issueService = new IssueService(issueRepo, projectAccess, eventBus, uploadService);
  const issueAttachmentRepo = new IssueAttachmentRepo(db);
  const issueAttachmentService = new IssueAttachmentService(
    issueRepo,
    issueAttachmentRepo,
    uploadService,
    uploadService,
    projectAccess,
    eventBus
  );
  const issueCommentRepo = new IssueCommentRepo(db);
  const issueCommentService = new IssueCommentService(issueRepo, issueCommentRepo, projectAccess, eventBus, uploadService);
  const issueParticipantRepo = new IssueParticipantRepo(db);
  const issueBranchRepo = new IssueBranchRepo(db);
  const issueParticipantService = new IssueParticipantService(issueRepo, issueParticipantRepo, issueBranchRepo, projectAccess, eventBus);
  const issueBranchService = new IssueBranchService(
    issueRepo,
    issueBranchRepo,
    issueParticipantRepo,
    projectAccess,
    eventBus
  );
  const rdService = new RdService(rdRepo, projectAccess, eventBus, uploadService);
  const rdTaskSheetService = new RdTaskSheetService(new RdTaskSheetRepo(db), projectAccess, uploadService, rdService, issueService);
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
  const deliveryWeeklyReportService = new DeliveryWeeklyReportService(
    new DeliveryWeeklyReportRepo(db),
    projectRepo,
    projectAccess
  );
  const notificationService = new NotificationService(profileService, new NotificationRepo(db));
  const feedbackRepo = new FeedbackRepo(db);
  const feedbackService = new FeedbackService(feedbackRepo, projectRepo, projectAccess);
  const apiTokenRepo = new ApiTokenRepo(db);
  const apiTokenAuditLogService = new ApiTokenAuditLogService(new ApiTokenAuditLogRepo(db));
  const apiTokenService = new ApiTokenService(
    apiTokenRepo,
    authRepo,
    projectRepo,
    projectAccess,
    projectAuthorization,
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
  const systemRbacService = new SystemRbacService(systemRbacRepo, auditLogService);
  const systemSettingsRepo = new SystemSettingsRepo(db);
  const systemSettingsService = new SystemSettingsService(systemSettingsRepo, auditLogService);
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
  const adminSearchService = new AdminSearchService(db);
  const reportPublicService = new ReportPublicService(config, new ReportPublicRepo(db), projectRepo);
  const searchService = new SearchService(new SearchRepo(db), projectAccess);
  const surveyService = new SurveyService(new SurveyRepo(db));
  const reimbursementService = new ReimbursementService(new ReimbursementRepo(db), eventBus);
  const errorReportService = new ErrorReportService(new ErrorReportRepo(db));

  return {
    healthQuery: new HealthQueryService(config),
    authCommand: authService,
    authQuery: authService,
    apiTokenCommand: apiTokenService,
    apiTokenQuery: apiTokenService,
    apiTokenAuditLogCommand: apiTokenAuditLogService,
    apiTokenAuditLogQuery: apiTokenAuditLogService,
    userCommand: userService,
    userQuery: userService,
    projectCommand: projectService,
    projectQuery: projectService,
    projectAccess,
    profileCommand: profileService,
    profileQuery: profileService,
    personalTodoCommand: personalTodoService,
    personalTodoQuery: personalTodoService,
    personalTokenCommand: personalTokenService,
    personalTokenQuery: personalTokenService,
    announcementCommand: announcementService,
    announcementQuery: announcementService,
    approvalTemplateCommand: approvalTemplateService,
    approvalTemplateQuery: approvalTemplateService,
    auditLogCommand: auditLogService,
    auditLogQuery: auditLogService,
    dashboardQuery: dashboardService,
    deliveryWeeklyReportCommand: deliveryWeeklyReportService,
    deliveryWeeklyReportQuery: deliveryWeeklyReportService,
    notificationQuery: notificationService,
    notificationCommand: notificationService,
    notificationIngest: notificationService,
    organizationCommand: organizationService,
    organizationQuery: organizationService,
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
    rdTaskSheetCommand: rdTaskSheetService,
    rdTaskSheetQuery: rdTaskSheetService,
    releaseCommand: releaseService,
    releaseQuery: releaseService,
    sharedConfigCommand: sharedConfigService,
    sharedConfigQuery: sharedConfigService,
    systemRbacCommand: systemRbacService,
    systemRbacQuery: systemRbacService,
    projectTitleCommand: projectTitleService,
    projectTitleQuery: projectTitleService,
    organizationTitleCommand: organizationTitleService,
    organizationTitleQuery: organizationTitleService,
    systemSettingsCommand: systemSettingsService,
    systemSettingsQuery: systemSettingsService,
    uploadCommand: uploadService,
    uploadQuery: uploadService,
    eventBus,
    aiIssueService,
    aiReportSqlService,
    aiReportRenderService,
    adminSearchService,
    reportPublicService,
    searchService,
    surveyCommand: surveyService,
    surveyQuery: surveyService,
    reimbursementCommand: reimbursementService,
    reimbursementQuery: reimbursementService,
    errorReportCommand: errorReportService,
    errorReportQuery: errorReportService
  };
}
