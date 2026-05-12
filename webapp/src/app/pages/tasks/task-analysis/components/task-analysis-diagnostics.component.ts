import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { TaskAnalyzeDiagnosticDto } from '@yinuo-ngm/protocol';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-task-analysis-diagnostics',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzTagModule],
  template: `
    <div class="section diagnostic-section">
      <details class="diagnostic-details" [open]="open">
        <summary>
          <span>
            <nz-icon nzType="bug" />
            分析诊断
          </span>
          <em>{{ items.length }} 条</em>
        </summary>
        @if (items.length > 0) {
          <div class="diagnostic-list">
            @for (item of items; track item.analyzer + item.phase + item.status + item.createdAt) {
              <div class="diagnostic-item" [class]="diagnosticStatusClass(item.status)">
                <div class="diagnostic-main">
                  <strong>{{ item.analyzer }}</strong>
                  <span>{{ item.phase }}</span>
                  <nz-tag>{{ diagnosticStatusLabel(item.status) }}</nz-tag>
                </div>
                @if (item.message) {
                  <div class="diagnostic-message">{{ item.message }}</div>
                }
                @if (item.error) {
                  <div class="diagnostic-error">{{ item.error }}</div>
                }
                @if (item.data !== undefined) {
                  <pre class="diagnostic-data">{{ formatDiagnosticData(item.data) }}</pre>
                }
              </div>
            }
          </div>
        } @else {
          <div class="hint">
            <nz-icon nzType="info-circle" />
            暂无 analyzer 诊断信息。
          </div>
        }
      </details>
    </div>
  `,
  styleUrls: ['./task-analysis-diagnostics.component.less'],
})
export class TaskAnalysisDiagnosticsComponent {
  @Input() items: TaskAnalyzeDiagnosticDto[] = [];
  @Input() open = false;

  diagnosticStatusLabel(status: string): string {
    const map: Record<string, string> = {
      success: '成功',
      succeeded: '成功',
      supported: '支持',
      skipped: '跳过',
      failed: '失败',
      'no-report': '无报告',
    };
    return map[status] ?? status;
  }

  diagnosticStatusClass(status: string): string {
    if (status === 'failed') return 'failed';
    if (status === 'skipped' || status === 'no-report') return 'skipped';
    return 'success';
  }

  formatDiagnosticData(data: unknown): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
}
