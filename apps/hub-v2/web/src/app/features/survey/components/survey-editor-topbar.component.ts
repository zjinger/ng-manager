import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';

import type { SurveyStatus } from '../models/survey.model';

@Component({
  selector: 'app-survey-editor-topbar',
  standalone: true,
  imports: [NzButtonModule, NzTagModule],
  template: `
    <header class="topbar">
      <div class="topbar__left">
        <div class="logo">Q</div>
        <div class="breadcrumb">问卷编辑 · <b>{{ title || '未命名问卷' }}</b></div>
        <nz-tag>{{ statusLabel }}</nz-tag>
      </div>
      <div class="topbar__center">
        <button nz-button nzType="text" nzSize="small" [disabled]="!canUndo" (click)="undo.emit()">↶ 撤销</button>
        <button nz-button nzType="text" nzSize="small" [disabled]="!canRedo" (click)="redo.emit()">↷ 重做</button>
      </div>
      <div class="topbar__right">
        <button nz-button nzSize="small" (click)="save.emit()" [nzLoading]="saving">保存</button>
        <button nz-button nzSize="small" (click)="preview.emit()">预览</button>
        <button nz-button nzSize="small" (click)="copyLink.emit()">复制链接</button>
        <button nz-button nzSize="small" nzType="primary" (click)="viewSubmissions.emit()">查看报表</button>
        @if (status !== 'published') {
          <button nz-button nzSize="small" nzType="primary" (click)="statusChange.emit('published')" [nzLoading]="saving">发布</button>
        }
        @if (status !== 'draft') {
          <button nz-button nzSize="small" (click)="statusChange.emit('draft')" [nzLoading]="saving">转草稿</button>
        }
        @if (status !== 'archived') {
          <button nz-button nzSize="small" nzDanger (click)="statusChange.emit('archived')" [nzLoading]="saving">归档</button>
        }
        <button nz-button nzSize="small" nzType="default" (click)="back.emit()">返回列表</button>
      </div>
    </header>
  `,
  styles: [
    `
      .topbar {
        height: 50px;
        border-bottom: 1px solid #dde3ef;
        background: #f8f9fd;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 12px;
        padding: 0 16px;
      }
      .topbar__left,
      .topbar__center,
      .topbar__right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .topbar__right {
        justify-content: flex-end;
      }
      .logo {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #6366f1, #818cf8);
        color: #fff;
        font-weight: 700;
        font-size: 13px;
      }
      .breadcrumb {
        font-size: 12px;
        color: var(--text-muted);
      }
      .breadcrumb b {
        color: var(--text-primary);
      }
      @media (max-width: 1180px) {
        .topbar {
          height: auto;
          grid-template-columns: 1fr;
          padding: 12px;
        }
        .topbar__right {
          justify-content: flex-start;
          flex-wrap: wrap;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyEditorTopbarComponent {
  @Input() title = '';
  @Input() statusLabel = '草稿';
  @Input() status: SurveyStatus = 'draft';
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Input() saving = false;

  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() preview = new EventEmitter<void>();
  @Output() copyLink = new EventEmitter<void>();
  @Output() viewSubmissions = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<SurveyStatus>();
  @Output() back = new EventEmitter<void>();
}
