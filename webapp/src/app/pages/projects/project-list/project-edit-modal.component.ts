import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ProjectStateService } from '../services/project.state.service';

@Component({
  selector: 'app-project-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzButtonModule, NzModalModule, NzIconModule],
  template: `
    <nz-modal
      [nzClosable]="false"
      [nzMaskClosable]="false"
      [nzVisible]="projectState.isEditModalVisible()"
      nzTitle="编辑项目"
      (nzOnCancel)="projectState.closeEditModal()"
    >
      <ng-container *nzModalContent>
        @if(editingProject()){
          <div class="modal-body">
            <label class="label">名称</label>
            <nz-input-wrapper >
              <input
                nz-input
                [ngModel]="editingProject()!.name"
                (ngModelChange)="projectState.editingProject()!.name = $event"
                placeholder="请输入新名称"
                (keydown.enter)="projectState.confirmEditProject()"
                autofocus
              />
              <nz-icon nzInputPrefix nzType="folder" nzTheme="fill" />
            </nz-input-wrapper>
            <div class="hint">输入新名称，将同步更新项目显示名称（不会重命名磁盘目录）。</div>
            <label class="label">Git仓库地址</label>
            <nz-input-wrapper >
              <input
                nz-input
                [ngModel]="editingProject()!.repoPageUrl"
                (ngModelChange)="projectState.editingProject()!.repoPageUrl = $event"
                placeholder="Git仓库地址"
              />
              <nz-icon nzInputPrefix nzType="github" nzTheme="outline" />
            </nz-input-wrapper>

            <div class="section-title">NGM Hub V2</div>
            <label class="label">Hub 地址</label>
            <nz-input-wrapper>
              <input
                nz-input
                [ngModel]="editingProject()!.hubV2.baseUrl"
                (ngModelChange)="projectState.editingProject()!.hubV2.baseUrl = $event"
                placeholder="例如：http://192.168.1.31:7008"
              />
              <nz-icon nzInputPrefix nzType="link" nzTheme="outline" />
            </nz-input-wrapper>

            <label class="label">Project Key</label>
            <nz-input-wrapper>
              <input
                nz-input
                [ngModel]="editingProject()!.hubV2.projectKey"
                (ngModelChange)="projectState.editingProject()!.hubV2.projectKey = $event"
                placeholder="例如：NGM"
              />
              <nz-icon nzInputPrefix nzType="key" nzTheme="outline" />
            </nz-input-wrapper>

            <label class="label">API Token</label>
            <nz-input-wrapper>
              <input
                nz-input
                type="password"
                [ngModel]="editingProject()!.hubV2.token"
                (ngModelChange)="projectState.editingProject()!.hubV2.token = $event"
                placeholder="粘贴 hub-v2 项目 token"
              />
              <nz-icon nzInputPrefix nzType="safety-certificate" nzTheme="outline" />
            </nz-input-wrapper>
            <div class="hint">以上配置会写入项目 env：NGM_HUB_V2_BASE_URL / NGM_HUB_V2_PROJECT_KEY / NGM_HUB_V2_TOKEN。</div>

            <!-- <label class="label">原尺寸图标SVN地址</label>
            <nz-input-wrapper >
              <input
                nz-input
                [ngModel]="editingProject()!.iconsRepoUrl"
                (ngModelChange)="projectState.editingProject()!.iconsRepoUrl = $event"
                placeholder="原尺寸图标SVN地址"
              />
              <nz-icon nzInputPrefix nzType="proj:svn" nzTheme="outline" />
            </nz-input-wrapper>
            <div class="hint">输入项目的原尺寸图标SVN地址，用于制作项目所需雪碧图。</div>
            <div class="hint">示例：svn://192.168.1.10/项目管理/xx项目/02.项目文档/05.系统设计/02-原型设计/02-UI设计效果图&切图/3-原尺寸图标</div> -->

            <label class="label">描述</label>
            <nz-input-wrapper>
              <textarea
                nz-input
                rows="3"
                style="resize: none;"
                [ngModel]="editingProject()!.description"
                (ngModelChange)="projectState.editingProject()!.description = $event"
                placeholder="请输入新描述"
                (keydown.enter)="projectState.confirmEditProject()"
              ></textarea>
            </nz-input-wrapper>
          </div>
        }
      </ng-container>

      <ng-container *nzModalFooter>
        <button nz-button (click)="projectState.closeEditModal()">取消</button>
        <button
          nz-button
          nzType="primary"
          (click)="projectState.confirmEditProject()"
          [disabled]="!projectState.editingProject()?.name?.trim() || projectState.isEditSaving()"
          [nzLoading]="projectState.isEditSaving()"
        >
          确定
        </button>
      </ng-container>
    </nz-modal>

  `,
  styles: [`
    .modal-body { display: grid; gap: 12px; }
    .section-title { font-size: 13px; font-weight: 600; opacity: .9; margin-top: 4px; }
    .hint { font-size: 12px; opacity: .75; }
  `],
})
export class ProjectEditModalComponent {
  projectState = inject(ProjectStateService)
  editingProject = this.projectState.editingProject;

}
