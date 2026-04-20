import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';

import { NzIconModule } from 'ng-zorro-antd/icon';
import type { CreateReleaseInput, ReleaseEntity } from '../../models/content.model';

type Draft = Omit<CreateReleaseInput, 'projectId'>;

const DEFAULT_DRAFT: Draft = {
  channel: 'stable',
  version: '',
  title: '',
  notes: '',
  downloadUrl: '',
  syncToProjectVersion: true,
};

@Component({
  selector: 'app-release-create-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzFormModule, NzGridModule, NzInputModule, NzSwitchModule, NzIconModule, DialogShellComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="860"
      [title]="(isEdit() ? '编辑发布' : '新建发布') + (!isEdit() && projectName() ? ' · ' + projectName() : '')"
      [subtitle]="''"
      [icon]="'cloud-upload'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="release-create-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired>标题</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="120"
                    placeholder="例如：Hub v2 Beta 发布"
                    [ngModel]="draft().title"
                    name="title"
                    (ngModelChange)="updateField('title', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired>版本号</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="40"
                    placeholder="例如：v2.0.0-beta.1"
                    [ngModel]="draft().version"
                    name="version"
                    (ngModelChange)="updateField('version', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>渠道</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="40"
                    placeholder="例如：stable / beta / canary"
                    [ngModel]="draft().channel"
                    name="channel"
                    (ngModelChange)="updateField('channel', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>下载地址</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    maxlength="200"
                    placeholder="可选：安装包地址"
                    [ngModel]="draft().downloadUrl"
                    name="downloadUrl"
                    (ngModelChange)="updateField('downloadUrl', $event)"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label>同步项目版本</nz-form-label>
                <nz-form-control>
                  <label style="display: inline-flex; align-items: center; gap: 8px;">
                    <nz-switch
                      [ngModel]="draft().syncToProjectVersion"
                      name="syncToProjectVersion"
                      (ngModelChange)="updateField('syncToProjectVersion', !!$event)"
                    ></nz-switch>
                    <span>发布后同步到项目配置-版本</span>
                  </label>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="16">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label>更新说明</nz-form-label>
                <nz-form-control>
                  <textarea
                    nz-input
                    rows="10"
                    placeholder="补充本次版本更新内容。"
                    [ngModel]="draft().notes"
                    name="notes"
                    (ngModelChange)="updateField('notes', $event)"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button
            nz-button
            nzType="primary"
            type="submit"
            form="release-create-form"
            [nzLoading]="busy()"
            [disabled]="!canSubmit()"
          >
            <nz-icon nzType="check" nzTheme="outline"/>
            {{ isEdit() ? '保存发布' : '创建发布' }}
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReleaseCreateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly value = input<ReleaseEntity | null>(null);
  readonly projectName = input<string>('');
  readonly create = output<Draft>();
  readonly cancel = output<void>();

  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly isEdit = computed(() => !!this.value());

  constructor() {
    effect(() => {
      if (this.open()) {
        const value = this.value();
        if (value) {
          this.draft.set({
            channel: value.channel,
            version: value.version,
            title: value.title,
            notes: value.notes ?? '',
            downloadUrl: value.downloadUrl ?? '',
            syncToProjectVersion: value.syncToProjectVersion ?? true,
          });
        } else {
          this.draft.set({ ...DEFAULT_DRAFT });
        }
      }
    });
  }

  canSubmit(): boolean {
    const draft = this.draft();
    return draft.title.trim().length > 0 && draft.version.trim().length > 0;
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }

    const draft = this.draft();
    const notes = draft.notes?.trim();
    const downloadUrl = draft.downloadUrl?.trim();
    this.create.emit({
      title: draft.title.trim(),
      version: draft.version.trim(),
      channel: draft.channel.trim() || 'stable',
      notes: notes || undefined,
      downloadUrl: downloadUrl || undefined,
      syncToProjectVersion: draft.syncToProjectVersion !== false,
    });
  }
}
