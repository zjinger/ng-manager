import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NZ_MODAL_DATA, NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-git-import-modal-component',
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzModalModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule
  ],
  template: `
        <div class="modal-body">
          <label class="label">URL</label>
          <nz-input-wrapper >
            <input
              nz-input
              [(ngModel)]="nzModalData.cloneUrl"
              placeholder="请输入Git仓库地址"
              autofocus
            />
            <nz-icon nzInputPrefix nzType="global" nzTheme="outline" />
          </nz-input-wrapper>
          <div class="hint">
            Git 仓库地址, 如 'username/repo'. 可以使用前缀如 'gitlab:' 或 'bitbucket:'.
          </div>
        </div>
  `,
  styles: [
    `
      .hint { margin-top: 6px; font-size: 12px; opacity: .7; }
    `
  ],
})
export class GitImportModalComponent {
  readonly nzModalData = inject<IModalData>(NZ_MODAL_DATA);
  isModalVisible = false;
  isSaving = false;
}

interface IModalData {
  cloneUrl: string;
  isSaving: boolean;
}
