import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { FsExplorerComponent } from "../components/fs-explorer/fs-explorer.component";
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ProjectCreateModal } from './project-create-modal.component';
import { NzIconModule } from 'ng-zorro-antd/icon';
@Component({
  selector: 'app-project-create',
  imports: [
    CommonModule,
    NzButtonModule,
    NzGridModule,
    FsExplorerComponent,
    NzIconModule
  ],
  template: `
    <div nz-row class="page">
      <div nz-col nzSpan="16" nzOffset="4" class="explorer-container">
        <app-fs-explorer></app-fs-explorer>
      </div>
      <div class="actions-bar">
        <button nz-button nzType="primary" nzSize="large" (click)="goCreate()">
          <nz-icon nzType="plus" nzTheme="outline" />
          在此创建新项目
        </button>
      </div>
    </div>
  `,
  styles: [
    `
    .page {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      .explorer-container {
        flex: 1 1 auto;
        height: 0;
      }
      .actions-bar {
        flex: 0 0 auto;
        padding: 16px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }
    `
  ],
})
export class ProjectCreateComponent {

  constructor(private modal: NzModalService) { }
  goCreate() {
    this.modal.create({
      nzTitle: '创建新项目',
      nzFooter: null,
      nzMaskClosable: false,
      nzClosable: false,
      nzContent: ProjectCreateModal,
      nzWidth: '1020px',
      nzCentered: true,
    })
  }
}
