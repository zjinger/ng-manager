import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiEnvEntity, ApiRequestKvRow } from '@models/api-client';
import { ApiClientStateService } from '@pages/api-client/services';
import { envVarsToRows, rowsToEnvVars } from '@pages/api-client/utils';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { KvTableComponent } from './kv-table.component';
function now() { return Date.now(); }
function newId(prefix: string) {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${rand}_${Date.now().toString(16)}`;
}
@Component({
  selector: 'app-env-modal.component',
  imports: [CommonModule, FormsModule, KvTableComponent, NzButtonModule, NzInputModule, NzPopconfirmModule],
  template: `
    <div class="drawer">
        <div class="left">
          <div class="toolbar">
            <button nz-button nzType="primary" (click)="createEnv()">新建</button>
          </div>

          <div class="env-list">
            @for (e of store.envs(); track e.id) {
              <div class="env-item" [class.active]="e.id===draft()?.id" (click)="selectEditEnv(e.id)">
                <div class="name">{{e.name}}</div>
                <div class="meta">{{e.variables.length}} vars</div>
              </div>
            }
            @if(!store.envs().length){
              <div class="empty">暂无环境</div>
            }
          </div>
        </div>

        <div class="right">
          @if(!draft()?.id){
            <div class="empty">选择一个环境进行编辑</div>
          } @else {
            <div class="form">
              <div class="row">
                <div class="label">名称</div>
                <input nz-input [ngModel]="draft()!.name" (ngModelChange)="setName($event)" />
              </div>
              <div class="row">
                <div class="label">前置URL</div>
                <input nz-input [ngModel]="draft()!.baseUrl" (ngModelChange)="setBaseUrl($event)" />
              </div>
              <div class="vars">
                <app-kv-table
                  [rows]="varsRows()"
                  (rowsChange)="varsRows.set($event)"
                  keyLabel="Key"
                  valueLabel="Value"
                  keyPlaceholder="TOKEN"
                  valuePlaceholder="xxx"
                />
              </div>

              <div class="actions">
                <button nz-button nzType="primary" (click)="save()">保存</button>
                <button
                  nz-button
                  nzType="default"
                  nzDanger
                  nz-popconfirm
                  nzPopconfirmTitle="确认删除该环境？"
                  (nzOnConfirm)="remove()"
                >
                  删除
                </button>
                <button nz-button nzType="default" (click)="useThisEnv()">设为当前</button>
              </div>
            </div>
          }
        </div>
      </div>
  `,
  styles: `
    .drawer{ display:grid; grid-template-columns: 180px 1fr; gap:12px; height:100%; }
    .left{ border-right:1px solid #f0f0f0; padding-right:12px; }
    .toolbar{ padding-bottom:10px; }
    .env-list{ display:flex; flex-direction:column; gap:8px; }
    .env-item{ padding:8px; border:1px solid #f0f0f0; border-radius:8px; cursor:pointer; }
    .env-item.active{ background:#f5f5f5; }
    .name{ font-weight:600; }
    .meta{ font-size:12px; opacity:.7; }
    .right{ min-width:0; }
    .empty{ padding:12px; opacity:.7; }
    .row{ display:grid; grid-template-columns: 70px 1fr; gap:10px; align-items:center; margin-bottom:10px; }
    .label{ font-size:14px; opacity:.8; }
    .vars{ height: 420px; }
    .actions{ display:flex; gap:8px; margin-top:12px; }
  `,
})
export class EnvModalComponent {
  @Output() envChange = new EventEmitter<string | null>();

  store = inject(ApiClientStateService);

  readonly modalRef = inject(NzModalRef);
  private msg = inject(NzMessageService);

  // 编辑缓存
  draft = signal<ApiEnvEntity | null>(null);
  varsRows = signal<ApiRequestKvRow[]>([]);

  selectEditEnv(id: string) {
    this.store.activeEnvId.set(id);
    const cur = this.store.envs().find(e => e.id === id);
    if (!cur) return;
    this.draft.set({ ...cur, variables: cur.variables });
    this.varsRows.set(envVarsToRows(cur.variables));
  }

  createEnv() {
    const t = now();
    const env: ApiEnvEntity = {
      id: newId('env'),
      scope: 'project',
      name: '未命名环境',
      variables: [],
      createdAt: t,
      updatedAt: t,
    };
    // 直接进入编辑态
    this.draft.set(env);
    this.varsRows.set(envVarsToRows(env.variables));
  }

  setName(name: string) {
    const d = this.draft();
    if (!d) return;
    this.draft.set({ ...d, name });
  }

  setBaseUrl(baseUrl: string) {
    const d = this.draft();
    if (!d) return;
    this.draft.set({ ...d, baseUrl });
  }

  async save() {
    const d = this.draft();
    if (!d) return;
    const env: ApiEnvEntity = {
      ...d,
      variables: rowsToEnvVars(this.varsRows(), d.variables),
      updatedAt: now(),
    };
    await this.store.saveEnv(env);
    // 保存后保持编辑 id（store reload 后列表会更新）
    this.store.activeEnvId.set(env.id);
    this.msg.success('环境变量保存成功');
    this.draft.set(env);
  }

  async remove() {
    const id = this.store.activeEnvId();
    if (!id) return;
    await this.store.deleteEnv(id);
    this.store.activeEnvId.set(null);
    this.draft.set(null);
    this.varsRows.set([]);
    this.msg.success('环境变量删除成功');
  }

  useThisEnv() {
    const id = this.store.activeEnvId();
    if (!id) return;
    this.store.setActiveEnv(id);
  }

  close() {
    this.modalRef.close();
  }
}

export type EnvModalData = {
  envId: string | null;
  envs: ApiEnvEntity[];
  saveEnv: (env: ApiEnvEntity) => Promise<void>;
  deleteEnv: (id: string) => Promise<void>;
}