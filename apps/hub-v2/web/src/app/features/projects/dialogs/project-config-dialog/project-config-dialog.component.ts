import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

import { DialogShellComponent } from '@shared/ui';
import type {
  CreateRdStageInput,
  CreateRdStageTaskTemplateInput,
  RdStageEntity,
  RdStageTaskTemplateEntity,
  UpdateRdStageInput,
  UpdateRdStageTaskTemplateInput,
} from '../../../rd/models/rd.model';
import type {
  CreateProjectApiTokenInput,
  CreateProjectMetaItemInput,
  CreateProjectVersionItemInput,
  ProjectApiTokenEntity,
  ProjectMobileAppConfig,
  MobileAppPlatform,
  ProjectMetaItem,
  ProjectSummary,
  ProjectVersionItem,
  UpdateProjectMobileAppConfigInput,
  UpdateProjectMetaItemInput,
  UpdateProjectVersionItemInput,
} from '../../models/project.model';
import { ProjectConfigApiTokensTabComponent } from './components/project-config-api-tokens-tab.component';
import { ProjectConfigEnvironmentsTabComponent } from './components/project-config-environments-tab.component';
import { ProjectConfigMobileAppTabComponent } from './components/project-config-mobile-app-tab.component';
import { ProjectConfigRdStagesTabComponent } from './components/project-config-rd-stages-tab.component';
import { ProjectConfigVersionsTabComponent } from './components/project-config-versions-tab.component';

@Component({
  selector: 'app-project-config-dialog',
  standalone: true,
  imports: [
    NzButtonModule,
    NzTabsModule,
    DialogShellComponent,
    ProjectConfigEnvironmentsTabComponent,
    ProjectConfigVersionsTabComponent,
    ProjectConfigRdStagesTabComponent,
    ProjectConfigApiTokensTabComponent,
    ProjectConfigMobileAppTabComponent,
  ],
  templateUrl: './project-config-dialog.component.html',
  styleUrls: ['./project-config-dialog.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectConfigDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly environments = input<ProjectMetaItem[]>([]);
  readonly versions = input<ProjectVersionItem[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly stageTaskTemplates = input<RdStageTaskTemplateEntity[]>([]);
  readonly apiTokens = input<ProjectApiTokenEntity[]>([]);
  readonly mobileAppConfig = input<ProjectMobileAppConfig | null>(null);
  readonly latestCreatedToken = input<string | null>(null);
  readonly pendingEnvironmentIds = input<string[]>([]);
  readonly pendingVersionIds = input<string[]>([]);
  readonly pendingStageIds = input<string[]>([]);
  readonly pendingStageTaskTemplateIds = input<string[]>([]);
  readonly pendingTokenIds = input<string[]>([]);
  readonly pendingMobileAppPlatforms = input<MobileAppPlatform[]>([]);
  readonly canManageConfig = input(false);

  readonly cancel = output<void>();
  readonly createEnvironment = output<CreateProjectMetaItemInput>();
  readonly updateEnvironment = output<{ id: string; patch: UpdateProjectMetaItemInput }>();
  readonly removeEnvironment = output<string>();
  readonly createVersion = output<CreateProjectVersionItemInput>();
  readonly updateVersion = output<{ id: string; patch: UpdateProjectVersionItemInput }>();
  readonly removeVersion = output<string>();
  readonly createStage = output<CreateRdStageInput>();
  readonly updateStage = output<{ id: string; patch: UpdateRdStageInput }>();
  readonly removeStage = output<string>();
  readonly createStageTaskTemplate = output<CreateRdStageTaskTemplateInput>();
  readonly updateStageTaskTemplate = output<{ id: string; patch: UpdateRdStageTaskTemplateInput }>();
  readonly removeStageTaskTemplate = output<string>();
  readonly createApiToken = output<CreateProjectApiTokenInput>();
  readonly revokeApiToken = output<string>();
  readonly copyLatestToken = output<string>();
  readonly clearLatestToken = output<void>();
  readonly saveMobileAppConfig = output<UpdateProjectMobileAppConfigInput>();
  readonly uploadMobileAppPackage = output<{ platform: MobileAppPlatform; file: File }>();
  readonly removeMobileAppPackage = output<MobileAppPlatform>();
  readonly copyMobileAppDownloadPageUrl = output<string>();
}
