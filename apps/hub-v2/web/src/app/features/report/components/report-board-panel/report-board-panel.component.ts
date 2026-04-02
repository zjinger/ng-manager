import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { BlockRendererComponent } from '../block-renderer/block-renderer.component';
import type { ReportBlock, ReportBoardItem } from '../../models/report.model';

@Component({
  selector: 'app-report-board-panel',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzTooltipModule, BlockRendererComponent],
  template: `
    @if (items().length > 0) {
      <div class="card board-card">
        <div class="board-card__header">
          <div>
            <h3>模板看板</h3>
            <p>同时展示多个模板图表，便于横向对比</p>
          </div>
          <div class="board-card__actions">
            <button nz-button nzType="default" nzSize="small" (click)="clearBoard.emit()">
              清空看板
            </button>
          </div>
        </div>
        <div class="board-list">
          @for (item of items(); track item.id) {
            <div
              class="board-item"
              [class.board-item--compact]="isCompactBoardItem(item)"
              [class.board-item--dragging]="draggingItemId() === item.id"
              draggable="true"
              (dragstart)="onDragStart(item.id, $event)"
              (dragover)="onDragOver($event)"
              (drop)="onDrop(item.id, $event)"
              (dragend)="onDragEnd()"
            >
              <div class="board-item__toolbar">
                <button nz-button nzType="text" nzSize="small" class="board-item__tool" nz-tooltip nzTooltipTitle="拖拽排序">
                  <span nz-icon nzType="holder"></span>
                </button>
                <button
                  nz-button
                  nzType="text"
                  nzSize="small"
                  class="board-item__tool board-item__tool--size"
                  nz-tooltip
                  [nzTooltipTitle]="isCompactBoardItem(item) ? '切换为 2x1' : '切换为 1x1'"
                  (click)="onToggleLayout(item.id, $event)"
                >
                  {{ isCompactBoardItem(item) ? '2x1' : '1x1' }}
                </button>
                <button
                  nz-button
                  nzType="text"
                  nzSize="small"
                  class="board-item__tool"
                  nz-tooltip
                  nzTooltipTitle="关闭模板"
                  (click)="onRemoveItem(item.id, $event)"
                >
                  <span nz-icon nzType="close"></span>
                </button>
              </div>
              <div class="board-item__meta">
                <h4>{{ item.title }}</h4>
                <p>{{ item.naturalQuery }}</p>
              </div>
              <div class="board-item__blocks" [class.board-item__blocks--multi]="item.blocks.length > 1">
                @for (block of item.blocks; track $index) {
                  <div
                    class="board-item__block"
                    [class.board-item__block--compact]="isCompactBlock(block)"
                    [class.board-item__block--full]="block.type === 'table'"
                  >
                    <app-report-block-renderer [block]="block" [showDescription]="false" [dense]="true" />
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styleUrl: './report-board-panel.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportBoardPanelComponent {
  readonly items = input<ReportBoardItem[]>([]);

  readonly clearBoard = output<void>();
  readonly removeItem = output<string>();
  readonly toggleLayout = output<string>();
  readonly moveItem = output<{ sourceId: string; targetId: string }>();

  protected readonly draggingItemId = signal<string | null>(null);

  protected isCompactBoardItem(item: ReportBoardItem): boolean {
    return item.layoutSize === 'compact';
  }

  protected isCompactBlock(block: ReportBlock): boolean {
    return block.type === 'distribution_chart' && (block.chart?.type === 'pie' || block.chart?.type === 'donut');
  }

  protected onToggleLayout(id: string, event: Event): void {
    this.stopEvent(event);
    this.toggleLayout.emit(id);
  }

  protected onRemoveItem(id: string, event: Event): void {
    this.stopEvent(event);
    this.removeItem.emit(id);
  }

  protected onDragStart(id: string, event: DragEvent): void {
    this.draggingItemId.set(id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected onDrop(targetId: string, event: DragEvent): void {
    event.preventDefault();
    const sourceId = event.dataTransfer?.getData('text/plain') || this.draggingItemId();
    if (sourceId && sourceId !== targetId) {
      this.moveItem.emit({ sourceId, targetId });
    }
    this.draggingItemId.set(null);
  }

  protected onDragEnd(): void {
    this.draggingItemId.set(null);
  }

  private stopEvent(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
  }
}
