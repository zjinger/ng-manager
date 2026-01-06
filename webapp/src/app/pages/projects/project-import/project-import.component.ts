import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FsExplorerComponent } from '../components/fs-explorer/fs-explorer.component';
import { ProjectImportState } from '../services/project-import.state.service';

@Component({
  selector: 'app-project-import',
  imports: [
    CommonModule,
    FormsModule,
    NzGridModule,
    NzButtonModule,
    NzIconModule,
    FsExplorerComponent
  ],
  template: `
    <div nz-row class="page">
      <div nz-col nzSpan="16" nzOffset="4" class="explorer-container">
        <app-fs-explorer></app-fs-explorer>
      </div>
      <div class="actions-bar center">
        <button nz-button nzSize="large" nzType="primary" (click)="importState.import()" [disabled]="importState.checking() || !importState.canImport()">
          <nz-icon nzType="import" nzTheme="outline" />
          导入这个文件夹
        </button>
      </div>
    </div>
  `,
  styles: [`
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
  `]
})
export class ProjectImportComponent {
  importState = inject(ProjectImportState);
}
