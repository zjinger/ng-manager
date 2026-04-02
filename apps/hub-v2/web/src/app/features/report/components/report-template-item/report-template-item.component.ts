import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import type { ReportTemplate } from '../../models/report.model';

@Component({
  selector: 'app-report-template-item',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzPopconfirmModule],
  template: `
    <div
      class="template-item"
      [class.template-item--active]="active()"
      [class.template-item--disabled]="disabled()"
      (click)="onSelect()"
    >
      <div class="template-item__title-row">
        @if (editing()) {
          <input
            nz-input
            nzSize="small"
            class="template-item__rename-input"
            [ngModel]="editingTitle()"
            (ngModelChange)="editingTitleChange.emit($event)"
            (click)="stopEvent($event)"
            (keydown.enter)="onConfirmRename($event)"
            (keydown.escape)="onCancelRename($event)"
          />
        } @else {
          <span class="template-item__title">{{ item().title }}</span>
        }
        <span class="template-item__time">{{ timeLabel() }}</span>
      </div>

      <div class="template-item__query">{{ item().naturalQuery }}</div>

      <div class="template-item__actions" (click)="stopEvent($event)">
        @if (editing()) {
          <button nz-button nzType="primary" nzSize="small" [nzLoading]="renaming()" (click)="onConfirmRename()">
            保存
          </button>
          <button nz-button nzType="default" nzSize="small" (click)="onCancelRename()">取消</button>
        } @else {
          <button nz-button nzType="default" nzSize="small" (click)="onStartRename($event)">重命名</button>
          <button nz-button nzType="default" nzSize="small" [nzLoading]="boardExecuting()" [disabled]="boardExecuting()" (click)="onRenderToBoard($event)">
            加入看板
          </button>
          <button
            nz-button
            nzType="default"
            nzDanger
            nzSize="small"
            nz-popconfirm
            nzPopconfirmTitle="确认删除该模板？"
            nzPopconfirmOkText="删除"
            nzPopconfirmCancelText="取消"
            (nzOnConfirm)="onDeleteTemplate()"
            (click)="stopEvent($event)"
          >
            删除
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './report-template-item.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportTemplateItemComponent {
  readonly item = input.required<ReportTemplate>();
  readonly timeLabel = input('');
  readonly active = input(false);
  readonly disabled = input(false);
  readonly editing = input(false);
  readonly editingTitle = input('');
  readonly renaming = input(false);
  readonly boardExecuting = input(false);

  readonly select = output<ReportTemplate>();
  readonly startRename = output<ReportTemplate>();
  readonly editingTitleChange = output<string>();
  readonly confirmRename = output<string>();
  readonly cancelRename = output<void>();
  readonly renderToBoard = output<ReportTemplate>();
  readonly deleteTemplate = output<ReportTemplate>();

  protected onSelect(): void {
    this.select.emit(this.item());
  }

  protected onStartRename(event: Event): void {
    this.stopEvent(event);
    this.startRename.emit(this.item());
  }

  protected onConfirmRename(event?: Event): void {
    this.stopEvent(event);
    this.confirmRename.emit(this.item().id);
  }

  protected onCancelRename(event?: Event): void {
    this.stopEvent(event);
    this.cancelRename.emit();
  }

  protected onRenderToBoard(event: Event): void {
    this.stopEvent(event);
    this.renderToBoard.emit(this.item());
  }

  protected onDeleteTemplate(): void {
    this.deleteTemplate.emit(this.item());
  }

  protected stopEvent(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
  }
}
