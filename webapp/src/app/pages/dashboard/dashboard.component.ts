import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component, computed, effect,
  EnvironmentInjector,
  inject,
  runInInjectionContext,
  signal,
  untracked
} from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PageLayoutComponent } from '@app/shared';
import { AddWidgetDrawerComponent, DashboardCanvasComponent } from './components';
import { DashboardItem } from './dashboard.model';
import { DashboardLayoutService } from './services/dashboard-layout.service';
import { ProjectContextStore } from '@app/core/stores';

@Component({
  selector: 'app-dashboard.component',
  imports: [
    CommonModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzDrawerModule,
    PageLayoutComponent,
    DashboardCanvasComponent,
    AddWidgetDrawerComponent,
  ],
  host: {
    '[class.collapsed]': 'editMode()',
  },
  template: `
    <app-page-layout [title]="'项目仪表盘'" [isFullscreen]="true">
      <ng-container ngProjectAs="actions">
        <button nz-button nzType="primary" (click)="toggleEdit()">
          <nz-icon [nzType]="editMode() ? 'check' : 'edit'" nzTheme="outline"></nz-icon>
          {{ editMode() ? '完成' : '自定义' }}
        </button>
      </ng-container>

      <app-dashboard-canvas
        [editMode]="editMode()"
        [items]="items()"
        (itemsChange)="onItemsChange($event)"
        (remove)="layout.remove($event)"
        (kill)="layout.killProcess($event)"
      ></app-dashboard-canvas>
    </app-page-layout>
    <div class="side-panel" [class.open]="editMode()">
      <div class="side-header">
        <div class="title">添加部件</div>
        <button nz-button nzType="text" (click)="editMode.set(false)">
          <nz-icon nzType="close"></nz-icon>
        </button>
      </div>
      <div class="side-body">
        <app-add-widget-drawer (add)="layout.add($event)"></app-add-widget-drawer>
      </div>
    </div>
  `,
  styles: [`
    :host{
      height: 100%;
      display: block;
      position: relative;
      transition: width 0.2s;
    }
    :host.collapsed {
      width: calc(100% - 360px);
    }
    .side-panel {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: 360px;
      background: #fff;
      box-shadow: -8px 0 24px rgba(0,0,0,.12);
      transform: translateX(100%);
      transition: transform 0.2s ease;
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }
    .side-panel.open {
      transform: translateX(0);
    }

    .side-header{
      height: 56px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0,0,0,.06);
    }
    .side-body{
      flex: 1;
      overflow: hidden;
    }
  `],
})
export class DashboardComponent {
  private projectContext = inject(ProjectContextStore)
  public layout = inject(DashboardLayoutService);

  private envInjector = inject(EnvironmentInjector);

  projectId = computed(() => this.projectContext.currentProjectId() || '');
  editMode = signal(false);

  items = computed(() => this.layout.items());

  constructor() {
    effect(() => {
      const pid = this.projectId();
      if (!pid) return;
      // 只做数据加载，不要在这里同步关 drawer
      untracked(() => this.layout.load(pid));
      runInInjectionContext(this.envInjector, () => {
        afterNextRender(() => {
          queueMicrotask(() => this.editMode.set(false));
        });
      });
    });
  }

  toggleEdit() {
    const next = !this.editMode();
    this.editMode.set(next);

    if (!next) {
      this.layout.flushSave(this.projectId());
    } else {
      this.layout.getWidgets();
    }
  }

  onItemsChange(next: DashboardItem[]) {
    this.layout.setItems(this.projectId(), next);
  }
}
