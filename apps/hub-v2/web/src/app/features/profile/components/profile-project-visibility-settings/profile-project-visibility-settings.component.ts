import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { PanelCardComponent } from '@shared/ui';
import type { ProjectScopeMode } from '@core/state';

@Component({
  selector: 'app-profile-project-visibility-settings',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzRadioModule, NzSwitchModule, PanelCardComponent],
  template: `
    <app-panel-card title="项目显示范围">
      <div panel-actions class="actions">
        @if (!editable()) {
          <button nz-button (click)="edit.emit()">编辑设置</button>
        } @else {
          <button nz-button (click)="cancel.emit()" [disabled]="saving()">取消</button>
          <button nz-button nzType="primary" (click)="save.emit()" [disabled]="!dirty() || saving()">
            {{ saving() ? '保存中…' : '保存设置' }}
          </button>
        }
      </div>
      <div class="scope-group-section">
        <nz-radio-group
        class="scope-group"
        [ngModel]="mode()"
        [nzDisabled]="!editable() || saving()"
        (ngModelChange)="modeChange.emit($event)"
      >
        <label nz-radio nzValue="member_only" class="scope-item">
          <span class="scope-item__content">
            <span class="scope-item__title">仅显示我参与的项目</span>
            <span class="scope-item__desc">项目选择器仅展示你是成员的项目。</span>
          </span>
        </label>
        <label nz-radio nzValue="all_accessible" class="scope-item">
          <span class="scope-item__content">
            <span class="scope-item__title">显示所有可访问项目</span>
            <span class="scope-item__desc">包含内部项目和你参与的项目。</span>
          </span>
        </label>
      </nz-radio-group>
      </div>

      <div class="archived-switch">
        <div class="archived-switch__meta">
          <div class="archived-switch__title">加载归档项目</div>
          <div class="archived-switch__desc">开启后，项目选择器将展示归档项目（带“已归档”标识）。</div>
        </div>
        <nz-switch
          [ngModel]="includeArchivedProjects()"
          [nzDisabled]="!editable() || saving()"
          [nzCheckedChildren]="'开启'"
          [nzUnCheckedChildren]="'关闭'"
          (ngModelChange)="includeArchivedProjectsChange.emit(!!$event)"
        ></nz-switch>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .scope-group-section{
         padding: 18px 20px;
      }
      .scope-group {
        display: grid;
        gap: 12px;
      }
      :host ::ng-deep .scope-item.ant-radio-wrapper {
        width: 100%;
        margin: 0;
        padding: 12px 14px;
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        display: flex;
        align-items: center;
        flex-direction: row-reverse;
        justify-content: space-between;
        gap: 10px;
        transition:
          border-color 0.2s ease,
          background-color 0.2s ease;
      }
      :host ::ng-deep .scope-item.ant-radio-wrapper:hover {
        border-color: var(--border-color);
      }
      :host ::ng-deep .scope-item.ant-radio-wrapper-checked {
        border-color: color-mix(in srgb, var(--color-primary) 38%, var(--border-color-soft));
        background: color-mix(in srgb, var(--color-primary) 6%, transparent);
      }
      :host ::ng-deep .scope-item.ant-radio-wrapper::after {
        display: none;
      }
      :host ::ng-deep .scope-item.ant-radio-wrapper .ant-radio {
        top: 2px;
      }
      :host ::ng-deep .scope-item.ant-radio-wrapper:focus,
      :host ::ng-deep .scope-item.ant-radio-wrapper:focus-within {
        outline: none;
        box-shadow: none;
      }
      .scope-item__content {
        display: grid;
        gap: 4px;
      }
      .scope-item__title {
        color: var(--text-primary);
        font-weight: 600;
      }
      .scope-item__desc {
        color: var(--text-muted);
        font-size: 12px;
      }
      .archived-switch {
        padding: 18px 20px;
        border-top: 1px solid var(--border-color-soft);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }
      .archived-switch__meta {
        min-width: 0;
        padding:0 14px;
      }
      .archived-switch__title {
        color: var(--text-primary);
        font-weight: 600;
      }
      .archived-switch__desc {
        margin-top: 4px;
        color: var(--text-muted);
        font-size: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileProjectVisibilitySettingsComponent {
  readonly mode = input.required<ProjectScopeMode>();
  readonly includeArchivedProjects = input(false);
  readonly editable = input(false);
  readonly dirty = input(false);
  readonly saving = input(false);

  readonly modeChange = output<ProjectScopeMode>();
  readonly includeArchivedProjectsChange = output<boolean>();
  readonly edit = output<void>();
  readonly save = output<void>();
  readonly cancel = output<void>();
}
