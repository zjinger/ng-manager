// import { computed, inject, Injectable, signal } from '@angular/core';
// import { ProjectStateService } from '@pages/projects/services/project.state.service';
// import { ApiClient } from '../api';
// import { ProjectMemberEntity } from '@pages/rd/models/rd.model';

// @Injectable({ providedIn: 'root' })
// export class ProjectContextStore {
//   // TODO：不再依赖projectState，后面自己获取数据
//   private projectState = inject(ProjectStateService);
//   private apiClient = inject(ApiClient);
//   private readonly currentProject = this.projectState.currentProject;
// //   private readonly members = signal<ProjectMemberEntity>()

//   currentProjectKey = computed(() => this.currentProject()?.env?.['NGM_HUB_V2_PROJECT_KEY']);
//   currentProjectToken = computed(() => this.currentProject()?.env?.['NGM_HUB_V2_TOKEN']);
//   isHubProjectValid = computed(() => {
//     return !!(
//       this.currentProject()?.env?.['NGM_HUB_V2_PROJECT_KEY'] &&
//       this.currentProject()?.env?.['NGM_HUB_V2_TOKEN']
//     );
//   });
//   currentProjectMembers = 


// }
