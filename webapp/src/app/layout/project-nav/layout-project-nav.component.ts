import { CommonModule } from '@angular/common';
import { Component, computed, inject, model, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ProjectEditModalComponent } from "@pages/projects/project-list/project-edit-modal.component";
import { HubV2PersonalTokenModalComponent } from './hub-v2-personal-token-modal.component';
import { ProjectContextStore } from '@app/core/stores/project-context/project-context.store';

@Component({
  selector: 'ngm-project-nav',
  imports: [
    CommonModule,
    FormsModule,
    NzDropDownModule,
    NzMenuModule,
    NzIconModule,
    NzSwitchModule,
    NzButtonModule,
    RouterModule,
    ProjectEditModalComponent,
    HubV2PersonalTokenModalComponent
  ],
  templateUrl: './layout-project-nav.component.html',
  styleUrl: './layout-project-nav.component.less',
})
export class LayoutProjectNavComponent implements OnInit {
  isCollapsed = model(false);
  personalTokenModalVisible = false;
  @ViewChild(HubV2PersonalTokenModalComponent) personalTokenModal?: HubV2PersonalTokenModalComponent;

  private readonly projectContext = inject(ProjectContextStore);
  private readonly projectState = inject(ProjectStateService);
  readonly currentProject = this.projectContext.currentProject;
  readonly favoriteProjects = this.projectContext.favoriteProjects;
  readonly recentProjects = this.projectContext.recentProjects;

  readonly curProjectName = computed(() => {
    const name = this.projectContext.currentProject()?.name || '请选择项目'
    return this.isCollapsed() ? name?.charAt(0).toUpperCase() : name;
  });

  ngOnInit() {
    this.projectContext.loadProjects().subscribe();
  }

  openPersonalTokenModal(): void {
    this.personalTokenModalVisible = true;
    queueMicrotask(() => this.personalTokenModal?.open());
  }
} 
