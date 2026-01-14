import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { MenuItem } from './menu.model';
import { MenuService } from './menu.service';
import { TaskBootstrapServcie } from '@pages/tasks/services/task-bootstrap.servcie';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TaskRuntimeStore } from '@pages/tasks/services/task-runtime-store';
import { NzBadgeModule } from 'ng-zorro-antd/badge';

@Component({
  selector: 'ngm-menu',
  imports: [NgTemplateOutlet, NzMenuModule, NzIconModule, RouterModule, NzTooltipModule, NzBadgeModule],
  templateUrl: './layout-menu.component.html',
  styleUrl: './layout-menu.component.less',
})
export class LayoutMenuComponent implements OnInit {
  @Input() isCollapsed = false;
  menus: MenuItem[] = [];
  public menuService: MenuService = inject(MenuService);
  private taskBootstrap = inject(TaskBootstrapServcie);
  private runtimeStore = inject(TaskRuntimeStore);

  readonly runningTaskCount = computed(() => this.runtimeStore.totalRunningCountSignal()());

  ngOnInit(): void {
    this.menus = this.menuService.getMenus();
    this.taskBootstrap.initActiveSnapshot();
  }


}
