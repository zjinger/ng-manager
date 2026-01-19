import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from "ng-zorro-antd/card";
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AddWidgetDrawerComponent, DashboardCanvasComponent } from './components';
import { DashboardItem } from './dashboard.model';
import { DashboardLayoutService } from './services/dashboard-layout.service';

@Component({
  selector: 'app-dashboard.component',
  imports: [
    CommonModule,
    NzButtonModule,
    DashboardCanvasComponent,
    AddWidgetDrawerComponent,
    PageLayoutComponent,
    NzCardModule,
    NzIconModule,
    NzDrawerModule
  ],
  host: {
    '[class.collapsed]': 'editMode()'
  },
  template: `
    <page-layout [title]="'项目仪表盘'" [isFullscreen]="true">
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
      ></app-dashboard-canvas>
      @if (editMode()) {
        
      }
  </page-layout>
  <nz-drawer
    [nzVisible]="editMode()"
    (nzOnClose)="editMode.set(false)"
    [nzMaskClosable]="false"
    [nzMask]="false"
    nzTitle="添加部件"
    nzPlacement="right"
    [nzWidth]="360"
    [nzBodyStyle]="{ padding: '0px', overflow: 'hidden' }"
  >
    <ng-container *nzDrawerContent>
      @if(editMode()){
        <app-add-widget-drawer [projectId]="projectId()" (add)="layout.add($event)"></app-add-widget-drawer>
      }
    </ng-container>
  </nz-drawer>
  `,
  styles: [`
    :host{
      height: 100%;
      display: block;
      transition: width 0.5s;
      &.collapsed {
        width: calc(100% - 360px);
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private projectState = inject(ProjectStateService);
  public layout = inject(DashboardLayoutService);
  projectId = computed(() => this.projectState.currentProjectId() || "");
  editMode = signal(false);

  items = this.layout.items;

  ngOnInit(): void {
    this.layout.load(this.projectId());
  }

  toggleEdit() {
    const next = !this.editMode();
    this.editMode.set(next);
    if (!next) {
      this.layout.flushSave(this.projectId())
    };
  }

  onItemsChange(next: DashboardItem[]) {
    this.layout.setItems(this.projectId(), next);
  }
}
