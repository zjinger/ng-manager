import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-delivery-overview-hero',
  imports: [NzIconModule, NzPopconfirmModule],
  template: `
    <header class="hero">
      <div class="hero__main">
        <div class="hero__meta">
          <span class="tag tag--blue">{{ projectCode() }}</span>
          <span>周报周期：{{ reportPeriod() }}</span>
          <span class="tag tag--green">周报</span>
          <span class="tag tag--gray">研发进度</span>
        </div>
        <h1>{{ projectTitle() }} · 周报</h1>
        <p>聚合研发项交付状态，突出完成比例、当前重点、延期风险和下一步动作。</p>
      </div>

      <div class="hero__actions" data-export-hidden>
        <button
          type="button"
          class="action-btn"
          [disabled]="disabled()"
          title="历史周报"
          (click)="openHistory.emit()"
        >
          <span nz-icon nzType="history"></span>
          历史周报
        </button>
        <button
          type="button"
          class="action-btn"
          nz-popconfirm
          nzPopconfirmTitle="确认导出当前周报图片？"
          nzPopconfirmOkText="导出"
          nzPopconfirmCancelText="取消"
          nzPopconfirmPlacement="bottomRight"
          [disabled]="disabled() || exportingImage()"
          title="导出图片"
          (nzOnConfirm)="exportImage.emit()"
        >
          <span nz-icon nzType="picture"></span>
          {{ exportingImage() ? '导出中…' : '导出图片' }}
        </button>
        <button
          type="button"
          class="action-btn"
          nz-popconfirm
          nzPopconfirmTitle="确认导出当前周报 PDF？"
          nzPopconfirmOkText="导出"
          nzPopconfirmCancelText="取消"
          nzPopconfirmPlacement="bottomRight"
          [disabled]="disabled() || exportingPdf()"
          title="导出 PDF"
          (nzOnConfirm)="exportPdf.emit()"
        >
          <span nz-icon nzType="file-pdf"></span>
          {{ exportingPdf() ? '导出中…' : '导出 PDF' }}
        </button>
        <button
          type="button"
          class="action-btn action-btn--primary"
          nz-popconfirm
          nzPopconfirmTitle="确认生成一份新的历史周报？"
          nzPopconfirmOkText="生成"
          nzPopconfirmCancelText="取消"
          nzPopconfirmPlacement="bottomRight"
          [disabled]="disabled() || !canGenerateReport() || generatingReport()"
          [title]="canGenerateReport() ? '生成周报快照' : '仅项目管理员可生成周报'"
          (nzOnConfirm)="generateReport.emit()"
        >
          <span nz-icon nzType="camera"></span>
          {{ generatingReport() ? '生成中…' : '生成周报' }}
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 20px;
        align-items: flex-start;
        padding: 22px;
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-sm);
      }
      .hero__main {
        min-width: 0;
      }
      .hero__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        color: var(--text-muted);
        font-size: 13px;
        margin-bottom: 8px;
      }
      h1 {
        margin: 0;
        color: var(--text-heading);
        font-size: 24px;
        line-height: 1.25;
        letter-spacing: 0;
      }
      p {
        margin: 8px 0 0;
        color: var(--text-muted);
        line-height: 1.6;
      }
      .hero__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
      }
      .action-btn {
        height: 36px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        background: var(--bg-container);
        color: var(--text-secondary);
        padding: 0 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .action-btn:disabled { cursor: not-allowed; opacity: 0.62; }
      .action-btn--primary {
        background: var(--primary-600);
        border-color: var(--primary-600);
        color: #fff;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      .tag--blue {
        background: var(--color-info-light);
        color: var(--color-info);
      }
      .tag--green {
        background: var(--color-success-light);
        color: var(--color-success);
      }
      .tag--gray {
        background: var(--bg-subtle);
        color: var(--text-muted);
      }
      @media (max-width: 900px) {
        .hero {
          grid-template-columns: 1fr;
        }
        .hero__actions {
          justify-content: flex-start;
        }
      }
      @media (max-width: 560px) {
        h1 {
          font-size: 21px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewHeroComponent {
  readonly projectCode = input.required<string>();
  readonly projectTitle = input.required<string>();
  readonly reportPeriod = input.required<string>();
  readonly disabled = input(false);
  readonly exportingImage = input(false);
  readonly exportingPdf = input(false);
  readonly generatingReport = input(false);
  readonly canGenerateReport = input(false);
  readonly openHistory = output<void>();
  readonly exportImage = output<void>();
  readonly exportPdf = output<void>();
  readonly generateReport = output<void>();
}
