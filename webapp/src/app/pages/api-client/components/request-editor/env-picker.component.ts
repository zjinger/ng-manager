import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ApiRequestKvRow, ApiEnvEntity } from '@models/api-client';
import { envVarsToRows, rowsToEnvVars, } from '@pages/api-client/utils/env-mapper';
import { KvTableComponent, } from './kv-table.component';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';

function now() { return Date.now(); }
function newId(prefix: string) {
  const rand = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${rand}_${Date.now().toString(16)}`;
}
@Component({
  selector: 'app-env-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzDrawerModule,
    NzInputModule,
    NzTooltipModule,
    NzIconModule,
    NzPopconfirmModule,
    KvTableComponent
  ],
  template: `
    <div class="picker">
      <nz-select
        class="sel"
        [nzPlaceHolder]="'Env'"
        [ngModel]="envId"
        (ngModelChange)="envChange.emit($event)"
        [nzAllowClear]="true"
      >
        @for (e of envs; track e.id) {
          <nz-option [nzValue]="e.id" [nzLabel]="e.name"></nz-option>
        }
      </nz-select>
      <button nz-button  nzType="text" (click)="openDrawer()" nz-tooltip nzTooltipTitle="管理环境变量">
        <nz-icon nzType="setting" nzTheme="outline"></nz-icon>
      </button>
    </div>
    @if(drawerOpen()){
      <nz-drawer
      nzTitle="环境变量"
      [nzVisible]="true"
      nzPlacement="right"
      [nzWidth]="520"
      (nzOnClose)="drawerOpen.set(false)"
    >
      <ng-container *nzDrawerContent>
      <div class="drawer">
        <div class="left">
          <div class="toolbar">
            <button nz-button nzType="primary" (click)="createEnv()">新建</button>
          </div>

          <div class="env-list">
            @for (e of envs; track e.id) {
              <div class="env-item" [class.active]="e.id===editEnvId()" (click)="selectEditEnv(e.id)">
                <div class="name">{{e.name}}</div>
                <div class="meta">{{e.variables.length}} vars</div>
              </div>
            }
            @if(!envs.length){
              <div class="empty">暂无环境</div>
            }
          </div>
        </div>

        <div class="right">
          @if(!editing()){
            <div class="empty">选择一个环境进行编辑</div>
          } @else {
            <div class="form">
              <div class="row">
                <div class="label">名称</div>
                <input nz-input [ngModel]="editing()!.name" (ngModelChange)="setName($event)" />
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
      </ng-container>
    </nz-drawer>
    }
    
  `,
  styles: [`
    .picker{ display:flex; gap:8px; align-items:center; }
    .sel{ width:160px; }

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
    .label{ font-size:12px; opacity:.8; }
    .vars{ height: 420px; }
    .actions{ display:flex; gap:8px; margin-top:12px; }
  `],
})
export class EnvPickerComponent {
  drawerOpen = model(false);
  @Input() envs: ApiEnvEntity[] = [];
  @Input() envId: string | null = null;

  @Output() envChange = new EventEmitter<string | null>();

  // 外部注入：保存 / 删除（由 store 实现）
  @Input() saveEnv!: (env: ApiEnvEntity) => Promise<void>;
  @Input() deleteEnv!: (id: string) => Promise<void>;

  editEnvId = signal<string | null>(null);
  editing = computed(() => {
    const id = this.editEnvId();
    if (!id) return null;
    return this.envs.find(e => e.id === id) ?? null;
  });

  // 编辑缓存
  draft = signal<ApiEnvEntity | null>(null);
  varsRows = signal<ApiRequestKvRow[]>([]);

  openDrawer() {
    this.drawerOpen.set(true);
    // 默认选中当前 env
    if (this.envId) this.selectEditEnv(this.envId);
  }

  selectEditEnv(id: string) {
    this.editEnvId.set(id);
    const cur = this.envs.find(e => e.id === id);
    if (!cur) return;
    this.draft.set({ ...cur, variables: cur.variables });
    this.varsRows.set(envVarsToRows(cur.variables));
  }

  createEnv() {
    const t = now();
    const env: ApiEnvEntity = {
      id: newId('env'),
      scope: 'project',
      name: 'New Env',
      variables: [],
      createdAt: t,
      updatedAt: t,
    };
    // 直接进入编辑态
    this.draft.set(env);
    this.editEnvId.set(env.id);
    this.varsRows.set([]);
  }

  setName(name: string) {
    const d = this.draft();
    if (!d) return;
    this.draft.set({ ...d, name });
  }

  async save() {
    const d = this.draft();
    if (!d) return;
    const env: ApiEnvEntity = {
      ...d,
      variables: rowsToEnvVars(this.varsRows(), d.variables),
      updatedAt: now(),
    };
    await this.saveEnv(env);
    // 保存后保持编辑 id（store reload 后列表会更新）
    this.editEnvId.set(env.id);
  }

  async remove() {
    const id = this.editEnvId();
    if (!id) return;
    await this.deleteEnv(id);
    this.editEnvId.set(null);
    this.draft.set(null);
    this.varsRows.set([]);
  }

  useThisEnv() {
    const id = this.editEnvId();
    if (!id) return;
    this.envChange.emit(id);
    this.drawerOpen.set(false);
  }
}
