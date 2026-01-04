// src/app/projects/components/step-preset.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { CreateProjectDraft } from '../models/project-draft';

@Component({
  standalone: true,
  selector: 'app-step-preset',
  imports: [CommonModule, FormsModule, NzCardModule, NzCheckboxModule, NzButtonModule, NzTagModule],
  template: `
  <nz-card nzTitle="识别结果" [nzExtra]="extraTpl">
    <ng-template #extraTpl>
      <button nz-button nzSize="small" (click)="requestDetect.emit()">重新识别</button>
    </ng-template>

    <div class="kv">
      <div><span class="k">Framework</span><span class="v">{{draft.detected?.framework || 'Unknown'}}</span></div>
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
  </nz-card>

  <nz-card nzTitle="导入内容" style="margin-top:12px;">
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
  </nz-card>
  `,
  styles: [`
    .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
    .k { opacity: .7; display:inline-block; width: 120px; }
    .opt { margin-top: 10px; }
    @media (max-width: 980px) { .kv { grid-template-columns: 1fr; } }
  `]
})
export class StepPresetComponent {
  @Input({ required: true }) draft!: CreateProjectDraft;
  @Output() draftChange = new EventEmitter<CreateProjectDraft>();
  @Output() requestDetect = new EventEmitter<void>();

  emit() {
    this.draftChange.emit({ ...this.draft });
  }
}
