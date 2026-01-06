import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  constructor(public projectState: ProjectStateService) { }
  ngOnInit() {
    this.projectState.getProjects();
  }
} 
