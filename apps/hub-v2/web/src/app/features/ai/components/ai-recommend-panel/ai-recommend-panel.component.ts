import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { ISSUE_PRIORITY_OPTIONS, ISSUE_TYPE_OPTIONS } from '@shared/constants';
import type { IssuePriority, IssueType } from '../../../issues/models/issue.model';
import type { AiIssueRecommendResult, AiAssigneeRecommendResult, ProjectModule } from '../../models/ai.model';

@Component({
  selector: 'app-ai-recommend-panel',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    NzTagModule,
    NzSelectModule,
    NzToolTipModule
  ],
  template: `
    @if (loading()) {
      <div class="ai-panel ai-panel--loading">
        <nz-spin nzSimple />
        <span>AI 分析中...</span>
      </div>
    } @else if (result()) {
      <div class="ai-panel">
        <div class="ai-panel__header">
          <nz-icon nzType="robot" />
          <span>AI 推荐</span>
          @if (showConfidence()) {
            <nz-tag [nzColor]="confidenceColor()">{{ confidenceLabel() }}</nz-tag>
          }
        </div>
        <div class="ai-panel__body">
          <div class="ai-field">
            <label>类型</label>
            <nz-select
              [ngModel]="selectedType()"
              (ngModelChange)="updateType($event)"
              nzSize="small"
            >
              @for (item of issueTypeOptions; track item.value) {
                <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
              }
            </nz-select>
            @if (result()?.type && selectedType() !== result()?.type) {
              <span class="ai-field__modified">已修改</span>
            }
          </div>
          <div class="ai-field">
            <label>优先级</label>
            <nz-select
              [ngModel]="selectedPriority()"
              (ngModelChange)="updatePriority($event)"
              nzSize="small"
            >
              @for (item of priorityOptions; track item.value) {
                <nz-option [nzLabel]="item.label" [nzValue]="item.value" />
              }
            </nz-select>
            @if (result()?.priority && selectedPriority() !== result()?.priority) {
              <span class="ai-field__modified">已修改</span>
            }
          </div>
          @if (assigneeLoading()) {
            <div class="ai-field">
              <label>指派给</label>
              <span class="ai-assignee-loading">
                <nz-spin nzSimple />
                <span>分析中...</span>
              </span>
            </div>
          } @else if (assigneeResult()?.assigneeName) {
            <div class="ai-field">
              <label>指派给</label>
              <span class="ai-assignee">{{ assigneeResult()?.assigneeName }}</span>
              @if (assigneeResult()?.confidence) {
                <nz-tag [nzColor]="assigneeConfidenceColor()" nzSize="small">
                  {{ (assigneeResult()?.confidence ?? 0) >= 0.7 ? '推荐' : '参考' }}
                </nz-tag>
              }
            </div>
          }
          @if (modules().length > 0) {
            <div class="ai-field">
              <label>模块</label>
              <nz-select
                [ngModel]="selectedModule()"
                (ngModelChange)="updateModule($event)"
                nzSize="small"
                nzAllowClear
                nzPlaceHolder="未选择"
              >
                @for (item of modules(); track moduleValue(item)) {
                  <nz-option [nzLabel]="item.name" [nzValue]="moduleValue(item)" />
                }
              </nz-select>
              @if (recommendedModuleValue()) {
                <nz-tag nzColor="success" nzSize="small">推荐</nz-tag>
              }
              @if (recommendedModuleValue() && selectedModule() !== recommendedModuleValue()) {
                <span class="ai-field__modified">已修改</span>
              }
            </div>
          }
          @if (result()?.reason) {
            <div class="ai-reason">
              <nz-icon nzType="info-circle" />
              <span>{{ result()?.reason }}</span>
            </div>
          }
        </div>
        <div class="ai-panel__footer">
          <button nz-button nzType="default" nzSize="small" (click)="skip.emit()">
            跳过
          </button>
          <button nz-button nzType="primary" nzSize="small" (click)="accept.emit({
            type: selectedType(),
            priority: selectedPriority(),
            assigneeId: assigneeResult()?.assigneeId,
            moduleCode: selectedModule() ?? ''
          })">
            采用推荐
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .ai-panel {
      margin: 16px 0;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      background: var(--bg-subtle);
    }
    .ai-panel--loading {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text-muted);
    }
    .ai-panel__header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .ai-panel__header nz-icon {
      color: var(--primary-500);
    }
    .ai-panel__body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ai-field {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ai-field label {
      width: 56px;
      color: var(--text-muted);
      font-size: 13px;
    }
    .ai-field nz-select {
      min-width: 140px;
    }
    .ai-field__modified {
      font-size: 12px;
      color: var(--primary-500);
    }
    .ai-assignee {
      font-weight: 500;
      color: var(--text-primary);
    }
    .ai-assignee-loading {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 13px;
    }
    .ai-reason {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--primary-500) 8%, transparent);
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary);
    }
    .ai-reason nz-icon {
      flex-shrink: 0;
      margin-top: 2px;
      color: var(--primary-500);
    }
    .ai-panel__footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiRecommendPanelComponent {
  readonly loading = input(false);
  readonly assigneeLoading = input(false);
  readonly result = input<AiIssueRecommendResult | null>(null);
  readonly assigneeResult = input<AiAssigneeRecommendResult | null>(null);
  readonly modules = input<ProjectModule[]>([]);
  readonly accept = output<{ type: IssueType | null; priority: IssuePriority | null; assigneeId?: string | null; moduleCode?: string }>();
  readonly skip = output<void>();

  protected readonly issueTypeOptions = ISSUE_TYPE_OPTIONS;
  protected readonly priorityOptions = ISSUE_PRIORITY_OPTIONS.filter(o => o.value !== '');

  protected readonly selectedType = signal<IssueType | null>(null);
  protected readonly selectedPriority = signal<IssuePriority | null>(null);
  protected readonly selectedModule = signal<string | null>(null);
  protected readonly recommendedModuleValue = computed(() => this.moduleValue(this.result()?.module));

  protected readonly showConfidence = computed(() => {
    const r = this.result();
    return r && r.confidence > 0;
  });

  protected readonly confidenceLabel = computed(() => {
    const c = this.result()?.confidence ?? 0;
    if (c >= 0.8) return '高置信度';
    if (c >= 0.5) return '中置信度';
    return '低置信度';
  });

  protected readonly confidenceColor = computed(() => {
    const c = this.result()?.confidence ?? 0;
    if (c >= 0.8) return 'success';
    if (c >= 0.5) return 'warning';
    return 'default';
  });

  protected readonly assigneeConfidenceColor = computed(() => {
    const c = this.assigneeResult()?.confidence ?? 0;
    return c >= 0.7 ? 'success' : 'default';
  });

  constructor() {
    effect(() => {
      const r = this.result();
      if (r) {
        this.selectedType.set(r.type);
        this.selectedPriority.set(r.priority);
        this.selectedModule.set(this.moduleValue(r.module) || null);
      }
    });
  }

  protected updateType(value: IssueType): void {
    this.selectedType.set(value);
  }

  protected updatePriority(value: IssuePriority): void {
    this.selectedPriority.set(value);
  }

  protected updateModule(value: string | null): void {
    this.selectedModule.set(value);
  }

  protected moduleValue(module: ProjectModule | null | undefined): string {
    return module?.code?.trim() || module?.name?.trim() || '';
  }
}
