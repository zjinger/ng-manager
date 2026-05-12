import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import type { TaskAnalyzeResultDto } from '@yinuo-ngm/protocol';

@Component({
  selector: 'app-task-analysis-stats',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzTagModule],
  template: `
    @if (report.stats) {
      <div class="section stats-section">
        <div class="section-title">
          <nz-icon nzType="deployment-unit" />
          <span>Stats 分析</span>
        </div>
        <div class="stats-meta">
          <nz-tag>{{ report.stats.format }}</nz-tag>
          <span class="stats-path">{{ report.stats.statsPath }}</span>
        </div>

        <div class="stats-grid">
          <div class="stats-card">
            <div class="stats-card-title">
              <nz-icon nzType="block" />
              Chunk Top
            </div>
            @for (chunk of statsChunks; track chunk.name) {
            <div class="stats-row">
              <div class="stats-row-name">
                <span [title]="chunk.name">{{ chunk.name }}</span>
                @if (chunk.initial) {
                  <nz-tag nzColor="blue" class="mini-tag">initial</nz-tag>
                }
                @if (chunk.entry) {
                  <nz-tag nzColor="purple" class="mini-tag">entry</nz-tag>
                }
              </div>
              <strong>{{ formatSizeFn(chunk.rawSize) }}</strong>
            </div>
            }
          </div>
          <div class="stats-card">
            <div class="stats-card-title">
              <nz-icon nzType="apartment" />
              依赖 Top
            </div>
            @for (dep of statsDependencies; track dep.name) {
            <div class="stats-row">
              <span [title]="dep.name">{{ dep.name }}</span>
              <strong>{{ formatSizeFn(dep.rawSize) }}</strong>
            </div>
            }
          </div>
          <div class="stats-card">
            <div class="stats-card-title">
              <nz-icon nzType="node-index" />
              模块 Top
            </div>
            @for (mod of statsModules; track trackByModPathFn($index, mod)) {
            <div class="stats-row">
              <span [title]="mod.packageName || mod.name">{{ mod.packageName || mod.name }}</span>
              <strong>{{ formatSizeFn(mod.rawSize) }}</strong>
            </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./task-analysis-stats.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAnalysisStatsComponent {
  @Input({ required: true }) report!: TaskAnalyzeResultDto;
  @Input() statsChunks: Array<{ name: string; rawSize: number; initial?: boolean; entry?: boolean }> = [];
  @Input() statsDependencies: Array<{ name: string; rawSize: number }> = [];
  @Input() statsModules: Array<{ name: string; packageName?: string; path?: string; rawSize: number }> = [];
  @Input({ required: true }) formatSizeFn!: (size?: number) => string;
  @Input({ required: true }) trackByModPathFn!: (index: number, item: { path?: string; name: string }) => string;
}
