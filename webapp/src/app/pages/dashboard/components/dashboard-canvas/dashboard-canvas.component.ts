import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  CompactType,
  DisplayGrid,
  GridsterComponent,
  GridsterConfig,
  GridsterItem,
  GridsterItemComponent,
  GridsterItemComponentInterface,
  GridType
} from 'angular-gridster2';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DashboardItem } from '../../dashboard.model';
import { WidgetHostComponent } from '../widget-host/widget-host.component';
import { NzTooltipDirective } from "ng-zorro-antd/tooltip";

@Component({
  selector: 'app-dashboard-canvas',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzIconModule,
    GridsterComponent,
    GridsterItemComponent,
    WidgetHostComponent,
    NzTooltipDirective
  ],
  template: `
    <gridster [options]="options">
      @for (it of items; track it.id) {
        <gridster-item [item]="it">
          <div class="card" [class.edit-mode]="editMode">
            <!-- 编辑态遮罩 -->
            @if (editMode) {
              <div class="card-overlay" aria-hidden="true">
                <button nz-button nzType="primary" nzSize="large">
                  <i nz-icon [nzType]="it.icon || 'appstore'" nzTheme="outline"></i>
                  {{ it.title }}
                </button>
              </div>
              <button nz-button nzType="text" nzSize="small" nz-tooltip="移除部件" class="remove-button" (click)="remove.emit(it.id)">
                <nz-icon nzType="close" nzTheme="outline" />
              </button>
            }
            <div class="card-body">
              <app-widget-host [item]="it" [editMode]="editMode" (remove)="remove.emit($event.id)"></app-widget-host>
            </div>
          </div>
        </gridster-item>
      }
    </gridster>
  `,
  styles: `
    :host { display: block; height: 100%; }
    gridster { display:block; height:100%;background: var(--app-primary-1); }
    gridster-item{
      border-radius: 10px;
    }
    .card {
      height: 100%;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,.06);
      overflow: hidden;
      position: relative;
    }

    .card.edit-mode { user-select: none; }

    /* overlay 只做视觉层，不拦截事件 */
    .card-overlay{
      position:absolute; inset:0;
      background: rgba(255,255,255,0.55);
      display:flex; justify-content:center; align-items:center;
      pointer-events:none;
      z-index: 2;
    }
    .remove-button{
      position: absolute;
      right: 16px;
      top: 16px;
      z-index: 3;
      background: var(--app-primary-1);
      color: var(--app-primary);
      transition: all 0.3s;
      &:hover{
        background: var(--app-primary);
        color: #fff;
      }
    }
    .card-overlay button { pointer-events:none; border-radius: 20px; }
    .title{ font-size: 12px; color: rgba(0,0,0,.75); }

    .card-body{
      position: relative;
      height: 100%;
    }
    .card.edit-mode .card-body {cursor: move;pointer-events: none;opacity: 0.8;}
  `,
})
export class DashboardCanvasComponent implements OnChanges {
  @Input() editMode = false;
  @Input() items: DashboardItem[] = [];
  @Output() itemsChange = new EventEmitter<DashboardItem[]>();
  @Output() remove = new EventEmitter<string>();
  @Output() kill = new EventEmitter<string>();

  private patch = new Map<string, Partial<DashboardItem>>();
  itemChange = (item: GridsterItem, itemComp: GridsterItemComponentInterface) => {
    const id = (itemComp.item as DashboardItem).id as string;
    if (!id) return;
    this.patch.set(id, {
      x: item.x ?? itemComp.item.x,
      y: item.y ?? itemComp.item.y,
      cols: item.cols ?? itemComp.item.cols,
      rows: item.rows ?? itemComp.item.rows,
    });
  };
  itemResize = (item: GridsterItem, itemComp: GridsterItemComponentInterface) => {

  }
  options: GridsterConfig = {
    gridType: GridType.Fixed,
    fixedColWidth: 90,
    fixedRowHeight: 90,
    margin: 10,
    outerMargin: true,
    compactType: CompactType.None,
    pushItems: true,

    // 调试时可开网格线，正式关掉
    displayGrid: DisplayGrid.None,
    resizable: {
      enabled: true,
      stop: () => this.emitSync(),
    },
    draggable: {
      enabled: false,
      // ignoreContent: true,
      // dragHandleClass: 'drag-handle', //  只允许手柄拖动
      stop: () => this.emitSync(),
    },
    itemChangeCallback: this.itemChange,
    itemResizeCallback: this.itemResize,
  };

  ngOnChanges(changes: SimpleChanges): void {
    const editMode = changes['editMode'];
    if (editMode && editMode.currentValue != editMode.previousValue) {
      this.options = {
        ...this.options,
        draggable: { ...this.options.draggable, enabled: this.editMode },
        resizable: { ...this.options.resizable, enabled: this.editMode },
        fixedColWidth: this.editMode ? 70 : 90,
        fixedRowHeight: this.editMode ? 70 : 90,
      }
    }
  }

  private emitSync() {
    const next = this.items.map(it => {
      const p = this.patch.get(it.id);
      return p ? { ...it, ...p } : it;
    });
    this.patch.clear();
    this.itemsChange.emit(next);
  }
}
