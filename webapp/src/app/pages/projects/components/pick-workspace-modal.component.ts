import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NZ_MODAL_DATA, NzModalModule, NzModalRef } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from "ng-zorro-antd/tooltip";

export type PickWorkspaceResult = { pickedRoot: string };

export type PickWorkspaceCandidate = { path: string; kind: "angular" | "vue" };

export interface PickWorkspaceModalData {
  candidates: PickWorkspaceCandidate[];
  defaultPicked?: PickWorkspaceCandidate;
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
    NzTagModule,
    NzTooltipModule
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
          <nz-radio-group [(ngModel)]="selectedPath" nzSize="large">
            @for (p of filtered(); track p) {
              <div nz-radio [nzValue]="p.path" class="item">
                <div class="path">
                  <div class="value" [nz-tooltip]="p.path" nzTooltipPlacement="top">{{ p.path }}</div>
                  @let kind = p.kind;
                  @if(kind) {
                  <nz-tag [nzColor]="kind==='angular' ? '#dd0031' : kind==='vue' ? '#42b883' : '#108ee9'"  nzMode="default">
                      {{ p.kind | titlecase }} 
                  </nz-tag>
                  }
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
          [disabled]="!selectedPath()"
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
      ::ng-deep .ant-radio+span{
        display: flex;
        gap: 12px;
        align-items: center;
        flex: 1 1 auto;
        width: 0;
        padding: 0;
      }
    }
    .path{display:flex;gap:12px; flex: 1 1 auto; text-overflow: ellipsis; white-space: nowrap; width: 0; overflow: hidden;}
    .path .value{ 
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; 
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1 1 auto;
      width: 0;
      overflow: hidden;
  }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
  `]
})
export class PickWorkspaceModalComponent {

  readonly data = inject<PickWorkspaceModalData>(NZ_MODAL_DATA);

  keyword = signal<string>('');

  selectedPath = signal<string | null>(null);

  constructor(private modalRef: NzModalRef<PickWorkspaceResult | null>) { }

  ngOnInit() {
    const { candidates, defaultPicked } = this.data;
    const first = defaultPicked && candidates.includes(defaultPicked)
      ? defaultPicked
      : (candidates[0] ?? '');
    this.selectedPath.set(first?.path ?? null);
  }

  filtered = computed(() => {
    const kw = (this.keyword() || '').trim().toLowerCase();
    const list = this.data.candidates ?? [];
    if (!kw) return list;
    return list.filter(p => p.path.toLowerCase().includes(kw));
  });

  cancel() {
    this.modalRef.close(null);
  }

  ok() {
    const picked = this.selectedPath();
    if (!picked) return;
    this.modalRef.close({ pickedRoot: picked });
  }
}

