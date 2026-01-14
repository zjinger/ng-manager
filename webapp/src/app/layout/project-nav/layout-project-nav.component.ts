import { CommonModule } from '@angular/common';
import { Component, computed, Input, model, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ProjectEditModalComponent } from "@pages/projects/project-list/project-edit-modal.component";

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
    ProjectEditModalComponent
  ],
  templateUrl: './layout-project-nav.component.html',
  styleUrl: './layout-project-nav.component.less',
})
export class LayoutProjectNavComponent implements OnInit {
  isCollapsed = model(false);
  constructor(public projectState: ProjectStateService) { }

  readonly curProjectName = computed(() => {
    const name = this.projectState.currentProject()?.name || '请选择项目'
    return this.isCollapsed() ? name?.charAt(0).toUpperCase() : name;
  });

  ngOnInit() {
    this.projectState.getProjects();
  }
} 
