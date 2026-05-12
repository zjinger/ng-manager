import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import type { TaskAssetInfoDto } from '@yinuo-ngm/protocol';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { FormatSizePipe, FormatRatioPipe, getAssetTypeColor, getAssetTypeIcon, getSizeLevel } from '@app/shared';
import type { TreemapCell } from '../task-analysis.types';

@Component({
  selector: 'app-task-analysis-assets',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzTagModule, NzProgressModule, NzTooltipModule, ScrollingModule, FormatSizePipe, FormatRatioPipe],
  template: `
    @if (treemapCells.length > 0) {
      <div class="section">
        <div class="section-title">
          <nz-icon nzType="appstore" />
          <span>体积分布 (Top {{ treemapCells.length }})</span>
        </div>
        <div class="treemap">
          @for (cell of treemapCells; track cell.relativePath) {
          <div
            class="treemap-cell"
            [style.flex]="cell.colSpan"
            [style.background]="cell.color"
            [nz-tooltip]="cell.relativePath + ' (' + (cell.size | formatSize) + ')'"
          >
            @if (cell.colSpan > 3) {
              <div class="treemap-name">{{ cell.name }}</div>
              <div class="treemap-size">{{ cell.size | formatSize }}</div>
            }
          </div>
          }
        </div>
        <div class="treemap-legend">
          <span class="legend-item"><span class="dot" style="background: #1677ff"></span>JS</span>
          <span class="legend-item"><span class="dot" style="background: #52c41a"></span>CSS</span>
          <span class="legend-item"><span class="dot" style="background: #722ed1"></span>HTML</span>
          <span class="legend-item"><span class="dot" style="background: #fa8c16"></span>图片</span>
          <span class="legend-item"><span class="dot" style="background: #13c2c2"></span>字体</span>
          <span class="legend-item"><span class="dot" style="background: #8c8c8c"></span>其他</span>
        </div>
      </div>
    }

    <div class="section">
      <div class="section-title">
        <nz-icon nzType="ordered-list" />
        <span>最大文件</span>
      </div>
      <div class="top-list">
        @for (asset of topAssets; track asset.relativePath) {
        <div class="top-row">
          <div class="top-name">
            <nz-tag [nzColor]="typeColor(asset.type)">
              <nz-icon [nzType]="typeIcon(asset.type)" />
              {{ asset.type }}
            </nz-tag>
            <span [title]="asset.relativePath">{{ asset.relativePath }}</span>
          </div>
          <div class="top-size" [class]="'size-' + sizeLevel(asset.rawSize)">{{ asset.rawSize | formatSize }}</div>
          <nz-progress [nzPercent]="(asset.ratio || 0) * 100" [nzShowInfo]="false" [nzStrokeColor]="typeColor(asset.type)"></nz-progress>
        </div>
        }
      </div>
    </div>

    <div class="section table-section">
      <div class="section-title">
        <nz-icon nzType="table" />
        <span>文件明细</span>
        <span class="section-count">{{ assets.length }} 个文件</span>
      </div>
      <div
        class="asset-table"
        role="table"
        aria-label="文件明细"
        [class.has-scrollbar]="useVirtualAssetTable || assets.length > 9"
      >
        <div class="asset-row asset-head" role="row">
          <div role="columnheader">文件名</div>
          <div role="columnheader">类型</div>
          <div role="columnheader">Raw Size</div>
          <div role="columnheader">Gzip Size</div>
          <div role="columnheader">占比</div>
          <div role="columnheader">路径</div>
        </div>
        @if (useVirtualAssetTable) {
          <cdk-virtual-scroll-viewport
            class="asset-body"
            [itemSize]="40"
            [minBufferPx]="400"
            [maxBufferPx]="800"
            [style.height.px]="assetViewportHeight"
          >
            <div
              class="asset-row"
              role="row"
              *cdkVirtualFor="let asset of assets; trackBy: trackByAsset"
            >
              <div class="asset-name" role="cell" [title]="asset.name">{{ asset.name }}</div>
              <div role="cell">
                <nz-tag [nzColor]="typeColor(asset.type)">
                  <nz-icon [nzType]="typeIcon(asset.type)" />
                  {{ asset.type }}
                </nz-tag>
              </div>
              <div role="cell" class="asset-size" [class]="'size-' + sizeLevel(asset.rawSize)">{{ asset.rawSize | formatSize }}</div>
              <div role="cell" class="asset-size">{{ asset.gzipSize == null ? '-' : (asset.gzipSize | formatSize) }}</div>
              <div role="cell" class="asset-size">{{ asset.ratio | formatRatio }}</div>
              <div role="cell" class="asset-path" [title]="asset.relativePath">{{ asset.relativePath }}</div>
            </div>
          </cdk-virtual-scroll-viewport>
        } @else {
          <div class="asset-body asset-body-plain">
            @for (asset of assets; track trackByAsset($index, asset)) {
            <div class="asset-row" role="row">
              <div class="asset-name" role="cell" [title]="asset.name">{{ asset.name }}</div>
              <div role="cell">
                <nz-tag [nzColor]="typeColor(asset.type)">
                  <nz-icon [nzType]="typeIcon(asset.type)" />
                  {{ asset.type }}
                </nz-tag>
              </div>
              <div role="cell" class="asset-size" [class]="'size-' + sizeLevel(asset.rawSize)">{{ asset.rawSize | formatSize }}</div>
              <div role="cell" class="asset-size">{{ asset.gzipSize == null ? '-' : (asset.gzipSize | formatSize) }}</div>
              <div role="cell" class="asset-size">{{ asset.ratio | formatRatio }}</div>
              <div role="cell" class="asset-path" [title]="asset.relativePath">{{ asset.relativePath }}</div>
            </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./task-analysis-assets.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAnalysisAssetsComponent implements AfterViewInit, OnChanges {
  @ViewChild(CdkVirtualScrollViewport) private viewport?: CdkVirtualScrollViewport;
  @Input() treemapCells: TreemapCell[] = [];
  @Input() topAssets: TaskAssetInfoDto[] = [];
  @Input() assets: TaskAssetInfoDto[] = [];
  @Input() useVirtualAssetTable = false;
  @Input() assetViewportHeight = 80;

  protected readonly typeColor = getAssetTypeColor;
  protected readonly typeIcon = getAssetTypeIcon;
  protected readonly sizeLevel = getSizeLevel;

  ngAfterViewInit(): void {
    this.scheduleViewportCheck();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['assets'] || changes['useVirtualAssetTable'] || changes['assetViewportHeight']) {
      this.scheduleViewportCheck();
    }
  }

  trackByAsset(index: number, item: TaskAssetInfoDto): string {
    return `${item.relativePath || item.name}:${index}`;
  }

  private scheduleViewportCheck(): void {
    queueMicrotask(() => this.viewport?.checkViewportSize());
  }
}
