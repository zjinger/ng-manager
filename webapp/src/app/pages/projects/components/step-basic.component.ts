// src/app/projects/components/step-basic.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzDividerModule } from 'ng-zorro-antd/divider';

import { CreateProjectDraft } from '../models/project-draft';
import { ProjectApiService, } from '../services/project-api.service';

@Component({
  standalone: true,
  selector: 'app-step-basic',
  imports: [
    CommonModule,
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzSwitchModule,
    NzDividerModule,
  ],
  template: `
  <form nz-form nzLayout="vertical">
    <div class="grid">
      <div>
        <nz-form-item>
          <nz-form-label>项目文件夹</nz-form-label>
          <nz-form-control>
            <div class="row">
              <input nz-input [(ngModel)]="draft.parentDir" name="parentDir" placeholder="选择父目录（例如：D:\\workspace）" [disabled]="draft.mode==='import'"/>
              <button nz-button type="button" (click)="pickParent()" [disabled]="draft.mode==='import'">选择</button>
            </div>
            <div class="hint" *ngIf="draft.mode==='import'">导入模式：rootPath 在导入页确定</div>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>项目名</nz-form-label>
          <nz-form-control>
            <input nz-input [(ngModel)]="draft.name" name="name" placeholder="输入项目名" (ngModelChange)="recalcRoot()"/>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>Root Path（预览）</nz-form-label>
          <nz-form-control>
            <input nz-input [(ngModel)]="draft.rootPath" name="rootPath" placeholder="自动生成" [readonly]="draft.mode==='create'"/>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label>包管理器</nz-form-label>
          <nz-form-control>
            <nz-select [(ngModel)]="draft.packageManager" name="pm">
              <nz-option nzValue="auto" nzLabel="默认（自动识别）"></nz-option>
              <nz-option nzValue="npm" nzLabel="npm"></nz-option>
              <nz-option nzValue="pnpm" nzLabel="pnpm"></nz-option>
              <nz-option nzValue="yarn" nzLabel="yarn"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
      </div>

      <div>
        <nz-divider nzText="更多选项"></nz-divider>

        <div class="switch-row" *ngIf="draft.mode==='create'">
          <span>若目标文件夹已存在则覆盖</span>
          <nz-switch [(ngModel)]="draft.overwriteIfExists" name="overwrite"></nz-switch>
        </div>

        <div class="switch-row">
          <span>创建后不显示新手引导</span>
          <nz-switch [(ngModel)]="draft.skipOnboarding" name="skip"></nz-switch>
        </div>

        <nz-divider nzText="Git"></nz-divider>

        <div class="switch-row" *ngIf="draft.mode==='create'">
          <span>初始化 git 仓库（建议）</span>
          <nz-switch [(ngModel)]="draft.initGit" name="initGit"></nz-switch>
        </div>

        <nz-form-item *ngIf="draft.mode==='create' && draft.initGit">
          <nz-form-label>Initial commit message（可选）</nz-form-label>
          <nz-form-control>
            <input nz-input [(ngModel)]="draft.initialCommitMessage" name="msg" placeholder="例如：init project"/>
          </nz-form-control>
        </nz-form-item>
      </div>
    </div>

    <div class="emit">
      <button nz-button type="button" (click)="emitChange()">保存本步</button>
    </div>
  </form>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
    .row { display: flex; gap: 8px; }
    .hint { margin-top: 6px; font-size: 12px; opacity: .7; }
    .switch-row { display:flex; align-items:center; justify-content:space-between; padding: 10px 0; }
    .emit { margin-top: 8px; }
    @media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class StepBasicComponent {
  @Input({ required: true }) draft!: CreateProjectDraft;
  @Output() draftChange = new EventEmitter<CreateProjectDraft>();

  constructor(private api: ProjectApiService) { }

  async pickParent() {
    const p = await this.api.pickFolder();
    if (!p) return;
    this.draft.parentDir = p;
    if (!this.draft.name) this.draft.name = this.basename(p);
    this.recalcRoot();
    this.emitChange();
  }

  recalcRoot() {
    if (this.draft.mode !== 'create') return;
    const parent = (this.draft.parentDir ?? '').replace(/[\\/]+$/, '');
    const name = (this.draft.name ?? '').trim();
    this.draft.rootPath = parent && name ? `${parent}/${name}`.replaceAll('\\', '/') : '';
    this.emitChange();
  }

  emitChange() {
    this.draftChange.emit({ ...this.draft });
  }

  private basename(p: string) {
    return p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? p;
  }
}
