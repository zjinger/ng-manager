// src/app/projects/components/step-preset.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { CreateProjectDraft, ProjectPreset } from '../models/project-draft';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { GitImportModalComponent } from './git-import-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { inject } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-step-preset',
  imports: [CommonModule, FormsModule, NzCardModule, NzCheckboxModule, NzButtonModule, NzTagModule, NzIconModule, NzRadioModule],
  template: `
  <nz-card nzTitle="选择一套预设" [nzExtra]="reloadExtraTpl">
    <ng-template #reloadExtraTpl>
      <button nz-button nzType="text" nzSize="small" (click)="requestDetect.emit()">
        <nz-icon nzType="reload" nzTheme="outline" />
      </button>
    </ng-template>
    <nz-radio-group [(ngModel)]="draft.preset" (ngModelChange)="presetChange($event)">
      <div nz-radio nzValue="angular">
        <label for="angular">Angular</label>
        <div class="hint">
          适用于使用 Angular 框架开发的项目，支持 Angular CLI 相关任务和配置。
        </div>
      </div>
      <div nz-radio nzValue="vue3">
        <label for="vue3">Vue 3</label>
        <div class="hint">
          适用于使用 Vue 3 框架开发的项目，支持 Vite 和 Vue CLI 相关任务和配置。
        </div>
      </div>
      <div nz-radio nzValue="manual">
        <label for="manual">手动</label>
        <div class="hint">
          不使用任何预设，手动配置项目功能和任务。
        </div>
      </div>
      <div nz-radio nzValue="git">
        <label for="git">Git导入</label>
        <div class="hint">
          从现有的 Git 仓库导入项目，自动识别项目结构和配置。
        </div>
      </div>
    </nz-radio-group>
  </nz-card>
  <!-- <nz-card nzTitle="识别结果" [nzExtra]="extraTpl">
    <ng-template #extraTpl>
      <button nz-button nzSize="small" (click)="requestDetect.emit()">重新识别</button>
    </ng-template>

    <div class="kv">
      <div><span class="k">Framework</span><span class="v">{{draft.detected?.framework || 'unknown'}}</span></div>
      <div><span class="k">package.json</span><span class="v">{{draft.detected?.hasPackageJson ? 'Yes' : 'No'}}</span></div>
      <div><span class="k">scripts</span><span class="v">{{draft.detected?.scriptsCount ?? 0}}</span></div>
      <div><span class="k">lockfile</span><span class="v">{{draft.detected?.lockFile || 'none'}}</span></div>
      <div><span class="k">git</span><span class="v">{{draft.detected?.hasGit ? 'Yes' : 'No'}}</span></div>
      @if(draft.detected?.recommendedScript){
        <div>
          <span class="k">推荐运行</span>
          <span class="v"><nz-tag nzColor="blue">{{draft.detected?.recommendedScript}}</nz-tag></span>
        </div>
      }
    </div>
  </nz-card> -->

  <!-- <nz-card nzTitle="导入内容" style="margin-top:12px;">
    <label nz-checkbox [(ngModel)]="draft.importScriptsAsTasks" (ngModelChange)="emit()">
      导入 package.json scripts 生成 Tasks（推荐）
    </label>
      @if(draft.detected?.hasMakefile){
        <div class="opt">
          <label nz-checkbox [(ngModel)]="draft.importMakefileTasks" (ngModelChange)="emit()">
            导入 Makefile 任务（可选）
          </label>
        </div>
      }
    @if(draft.detected?.hasDockerCompose){
      <div class="opt" >
      <label nz-checkbox [(ngModel)]="draft.importDockerComposeTasks" (ngModelChange)="emit()">
        导入 docker-compose 任务（可选）
      </label>
    </div>
    }
    

    <div class="opt">
      <label nz-checkbox [(ngModel)]="draft.generateCommonTasks" (ngModelChange)="emit()">
        生成通用任务模板（install / open / clean）
      </label>
    </div>
  </nz-card> -->
  `,
  styles: [`
    .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
    .k { opacity: .7; display:inline-block; width: 120px; }
    .opt { margin-top: 10px; }
    [nz-radio] {
        display: block;
    }
    .hint {
      margin-left: 24px;
      font-size: 12px;
      opacity: .75;
    }
  `]
})
export class StepPresetComponent {
  @Input({ required: true }) draft!: CreateProjectDraft;
  @Output() draftChange = new EventEmitter<CreateProjectDraft>();
  @Output() requestDetect = new EventEmitter<void>();
  private modal = inject(NzModalService);
  emit() {
    this.draftChange.emit({ ...this.draft });
  }

  presetChange(preset: ProjectPreset) {
    this.draft.preset = preset;
    if (preset === "git") {
      this.openImportGitModal();
      return;
    } else {
      // 非 Git：清掉 repoUrl，回到 create 模式
      this.draft.repoUrl = undefined;
      this.emit();
    }
  }

  private openImportGitModal() {
    const modal = this.modal.create({
      nzTitle: '从 Git 仓库导入项目',
      nzMaskClosable: false,
      nzContent: GitImportModalComponent,
      nzCentered: true,
      nzWidth: '580px',
      nzClosable: false,
      nzData: {
        cloneUrl: 'http://admin@192.168.1.10:7777/r/ais-broadcaster.git',// ssh://admin@192.168.1.10:29418/ais-broadcaster.git
        isSaving: false
      },
      nzFooter: [
        {
          label: '取消', type: 'default', onClick: () => {
            modal.close();
            this.draft.repoUrl = undefined;
            this.draft.preset = "angular";
            this.emit();
          }
        },
        {
          label: '导入', type: 'primary', onClick: (comp: GitImportModalComponent) => {
            const url = comp.nzModalData.cloneUrl;
            const isSaving = comp.nzModalData.isSaving;
            if (!url || !url.trim() || isSaving) {
              return;
            }
            comp.nzModalData.isSaving = true;
            console.log('Importing from git:', comp.nzModalData.cloneUrl);
            this.draft.repoUrl = url.trim();
            comp.nzModalData.isSaving = false;
            this.emit();
            modal.close();
          },
          disabled: (comp?: GitImportModalComponent) => {
            const url = comp?.nzModalData.cloneUrl;
            return !url || !url.trim();
          },
          loading: (comp?: GitImportModalComponent) => {
            const isSaving = comp?.nzModalData.isSaving;
            return isSaving === true;
          }
        }
      ]
    })
  }
}
