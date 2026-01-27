import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NZ_MODAL_DATA, NzModalModule, NzModalRef } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

export type PickWorkspaceResult = { pickedRoot: string };

export interface PickWorkspaceModalData {
  candidates: string[];
  defaultPicked?: string;
}

@Component({
  selector: 'app-pick-workspace-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzInputModule,
    NzRadioModule,
    NzButtonModule,
    NzIconModule,
    NzEmptyModule,
  ],
  template: `
    <div class="wrap">
      <div class="hint">
        检测到该仓库可能包含多个前端工作区（Angular / Vue 等）。请选择一个目录继续导入：
      </div>

      <div class="toolbar">
        <nz-input-wrapper>
          <input nz-input placeholder="过滤路径（关键字）" [(ngModel)]="keyword" />
          <nz-icon nzType="search" nzTheme="outline" nzSuffix />
        </nz-input-wrapper>
      </div>

      <div class="list">
        @if (filtered().length === 0) {
          <nz-empty nzNotFoundContent="没有匹配的目录"></nz-empty>
        } @else {
          <nz-radio-group [(ngModel)]="selected" nzSize="large">
            @for (p of filtered(); track p) {
              <div nz-radio [nzValue]="p" class="item">
                <div class="path">
                  {{ p }}
                </div>
              </div>
            }
          </nz-radio-group>
        }
      </div>

      <div class="actions">
        <button nz-button (click)="cancel()">
          <nz-icon nzType="close" nzTheme="outline" />
          取消
        </button>

        <button
          nz-button
          nzType="primary"
          [disabled]="!selected()"
          (click)="ok()"
        >
          <nz-icon nzType="check" nzTheme="outline" />
          选中并继续
        </button>
      </div>
    </div>
  `,
  styles: [`
    .wrap { display: flex; flex-direction: column; gap: 12px; }
    .hint { opacity: .85; }
    .toolbar { margin-top: 4px; }
    nz-radio-group { width: 100%; }
    .list {
      height: 240px;
      overflow: auto;
      padding: 8px;
      border: var(--app-border-color);
      border-radius: 8px;
    }
    .item {
      display: flex;
      gap: 8px;
      padding: 12px 12px;
      border-radius: 8px;
      margin: 0px;
      width: 100%;
      &:hover{
        background-color: var(--app-primary-3);
      }
    }
    .path { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
  `]
})
export class PickWorkspaceModalComponent {

  readonly data = inject<PickWorkspaceModalData>(NZ_MODAL_DATA);

  keyword = signal<string>('');
  selected = signal<string>('');

  constructor(private modalRef: NzModalRef<PickWorkspaceResult | null>) { }

  ngOnInit() {
    const { candidates, defaultPicked } = this.data;
    const first = defaultPicked && candidates.includes(defaultPicked)
      ? defaultPicked
      : (candidates[0] ?? '');
    this.selected.set(first);
  }

  filtered = computed(() => {
    const kw = (this.keyword() || '').trim().toLowerCase();
    const list = this.data.candidates ?? [];
    if (!kw) return list;
    return list.filter(p => p.toLowerCase().includes(kw));
  });

  cancel() {
    this.modalRef.close(null);
  }

  ok() {
    const picked = this.selected();
    if (!picked) return;
    this.modalRef.close({ pickedRoot: picked });
  }
}

