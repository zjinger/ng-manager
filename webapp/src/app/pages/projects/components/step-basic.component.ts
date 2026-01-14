import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { CreateProjectDraft } from '../models/project-draft';
import { FsExplorerApiService } from './fs-explorer';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

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
    NzCardModule,
    NzTooltipModule,
    NzIconModule,
    NzModalModule
  ],
  template: `
  <nz-card nzTitle="基础设置">
    <form nz-form nzLayout="vertical">
      <nz-form-item>
        <nz-form-label>项目文件夹</nz-form-label>
        <nz-form-control>
            <input nz-input [(ngModel)]="draft.name" name="name" placeholder="输入项目名" (ngModelChange)="recalcRoot()"/>
          <div class="hint">
            {{draft.rootPath}}
            @if(pathExists){ <span style="margin-left:8px;color:#ff4d4f;">该路径已存在</span> }
          </div>
        </nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-label>包管理器</nz-form-label>
        <nz-form-control>
          <nz-select [(ngModel)]="draft.packageManager" name="pm">
            <nz-option nzValue="auto" nzLabel="默认"></nz-option>
            <nz-option nzValue="npm" nzLabel="npm"></nz-option>
            <nz-option nzValue="pnpm" nzLabel="pnpm"></nz-option>
            <nz-option nzValue="yarn" nzLabel="yarn"></nz-option>
          </nz-select>
        </nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-label>更多选项</nz-form-label>
        <nz-form-control>
          <div class="switch-row">
            <span>若目标文件夹已存在则覆盖</span>
            <nz-switch [(ngModel)]="draft.overwriteIfExists" (ngModelChange)="emit()" name="overwrite"></nz-switch>
          </div>
          <div class="switch-row">
            <span>无新手指引的脚手架项目</span>
            <nz-switch [(ngModel)]="draft.skipOnboarding" name="skip"></nz-switch>
          </div>
        </nz-form-control>
      </nz-form-item>
      <nz-form-item>
        <nz-form-label>Git</nz-form-label>
        <nz-form-control>
          <div class="switch-row">
            <span>初始化 git 仓库（建议）</span>
            <nz-switch [(ngModel)]="draft.initGit" name="initGit"></nz-switch>
          </div>
          @if(draft.initGit){
            <input nz-input [(ngModel)]="draft.initialCommitMessage" name="msg" placeholder="覆盖提交信息(选填)"/>
          }
        </nz-form-control>
      </nz-form-item>
    </form>
  </nz-card>
  `,
  styles: [`
    .hint { margin-top: 6px; font-size: 12px; opacity: .7; }
    .switch-row { display:flex; align-items:center; justify-content:space-between; padding-bottom:  4px; span{font-size:14px;} }
    .emit { margin-top: 8px; }
  `]
})
export class StepBasicComponent implements OnInit {
  @Input({ required: true }) draft!: CreateProjectDraft;
  @Output() draftChange = new EventEmitter<CreateProjectDraft>();
  private pathCheck$ = new Subject<string>();
  pathExists = false;
  private fsApi = inject(FsExplorerApiService);
  ngOnInit(): void {
    this.computeRootPath();
    this.pathCheck$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((p) => p ? this.fsApi.pathExists(p) : of(false))
      )
      .subscribe((exists) => {
        this.emit();
        this.pathExists = exists;
      });
  }

  recalcRoot() {
    this.computeRootPath();
    this.pathCheck$.next(this.draft.rootPath);
  }

  private computeRootPath() {
    const parent = (this.draft.parentDir ?? "").replace(/[\\/]+$/, "");
    const name = (this.draft.name ?? "").trim();
    this.draft.rootPath = parent && name ? `${parent}/${name}`.replaceAll("\\", "/") : parent;
  }

  emit() {
    this.draftChange.emit({ ...this.draft });
  }
}
