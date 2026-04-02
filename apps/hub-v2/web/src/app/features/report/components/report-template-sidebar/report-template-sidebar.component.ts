import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import type { ReportTemplate } from '../../models/report.model';
import { ReportTemplateItemComponent } from '../report-template-item/report-template-item.component';

@Component({
  selector: 'app-report-template-sidebar',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, NzSpinModule, ReportTemplateItemComponent],
  template: `
    <div class="card template-card">
      <div class="template-card__header">
        <h4>我的模板</h4>
        <div class="template-card__header-actions">
          <button
            nz-button
            nzType="default"
            nzSize="small"
            [disabled]="templates().length === 0 || bulkRendering()"
            [nzLoading]="bulkRendering()"
            (click)="renderAll.emit()"
          >
            渲染全部
          </button>
          @if (retryFailedCount() > 0) {
            <button
              nz-button
              nzType="default"
              nzSize="small"
              [disabled]="bulkRendering()"
              (click)="retryFailed.emit()"
            >
              重试失败
              （{{ retryFailedCount() }}）
            </button>
          }
          <button nz-button nzType="text" nzSize="small" [disabled]="templatesLoading()" (click)="refresh.emit()">
            刷新
          </button>
        </div>
      </div>

      <div class="template-card__filters">
        <input nz-input nzSize="small" [ngModel]="keyword()" (ngModelChange)="keyword.set($event)" placeholder="搜索模板名" />
        <nz-select nzSize="small" [ngModel]="sort()" (ngModelChange)="sort.set($event)" class="template-sort-select">
          <nz-option nzLabel="最近更新" nzValue="updated_desc"></nz-option>
          <nz-option nzLabel="最早更新" nzValue="updated_asc"></nz-option>
        </nz-select>
      </div>

      @if (templatesLoading()) {
        <div class="template-card__loading"><nz-spin nzSimple /></div>
      } @else if (templates().length === 0) {
        <div class="template-card__empty">还没有模板，先生成一个报表后保存。</div>
      } @else if (filteredTemplates().length === 0) {
        <div class="template-card__empty">没有匹配的模板</div>
      } @else {
        <div class="template-list">
          @for (item of filteredTemplates(); track item.id) {
            <app-report-template-item
              [item]="item"
              [timeLabel]="formatTime(item.updatedAt)"
              [active]="activeTemplateId() === item.id"
              [disabled]="executingTemplateId() === item.id"
              [editing]="editingTemplateId() === item.id"
              [editingTitle]="editingTitle()"
              [renaming]="renamingTemplateId() === item.id"
              [boardExecuting]="boardExecutingTemplateId() === item.id"
              (select)="selectTemplate.emit($event)"
              (startRename)="startRename.emit($event)"
              (editingTitleChange)="editingTitleChange.emit($event)"
              (confirmRename)="confirmRename.emit($event)"
              (cancelRename)="cancelRename.emit()"
              (renderToBoard)="renderToBoard.emit($event)"
              (deleteTemplate)="deleteTemplate.emit($event)"
            />
          }
        </div>
      }
    </div>
  `,
  styleUrl: './report-template-sidebar.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportTemplateSidebarComponent {
  readonly templates = input<ReportTemplate[]>([]);
  readonly templatesLoading = input(false);
  readonly activeTemplateId = input<string | null>(null);
  readonly executingTemplateId = input<string | null>(null);
  readonly editingTemplateId = input<string | null>(null);
  readonly editingTitle = input('');
  readonly renamingTemplateId = input<string | null>(null);
  readonly boardExecutingTemplateId = input<string | null>(null);
  readonly bulkRendering = input(false);
  readonly retryFailedCount = input(0);

  readonly renderAll = output<void>();
  readonly retryFailed = output<void>();
  readonly refresh = output<void>();
  readonly selectTemplate = output<ReportTemplate>();
  readonly startRename = output<ReportTemplate>();
  readonly editingTitleChange = output<string>();
  readonly confirmRename = output<string>();
  readonly cancelRename = output<void>();
  readonly renderToBoard = output<ReportTemplate>();
  readonly deleteTemplate = output<ReportTemplate>();

  readonly keyword = signal('');
  readonly sort = signal<'updated_desc' | 'updated_asc'>('updated_desc');
  readonly filteredTemplates = computed(() => {
    const keyword = this.keyword().trim().toLowerCase();
    const sorted = [...this.templates()].sort((a, b) => {
      const left = Date.parse(a.updatedAt);
      const right = Date.parse(b.updatedAt);
      const leftValue = Number.isNaN(left) ? 0 : left;
      const rightValue = Number.isNaN(right) ? 0 : right;
      return this.sort() === 'updated_asc' ? leftValue - rightValue : rightValue - leftValue;
    });

    if (!keyword) {
      return sorted;
    }
    return sorted.filter((item) => item.title.toLowerCase().includes(keyword));
  });

  protected formatTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');
    const hour = `${parsed.getHours()}`.padStart(2, '0');
    const minute = `${parsed.getMinutes()}`.padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  }
}
