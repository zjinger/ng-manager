import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-delivery-overview-hero',
  standalone: true,
  imports: [NzIconModule],
  template: `
    <header class="hero">
      <div class="hero__main">
        <div class="hero__meta">
          <span class="tag tag--blue">{{ projectCode() }}</span>
          <span>汇报周期：{{ reportPeriod() }}</span>
          <span class="tag tag--green">只读汇报</span>
          <span class="tag tag--gray">研发进度</span>
        </div>
        <h1>{{ projectTitle() }} · 研发项进度总览</h1>
        <p>聚合研发项交付状态，突出完成比例、当前卡点、延期风险和下一步动作。</p>
      </div>

      <div class="hero__actions">
        <button type="button" class="action-btn" disabled title="导出图片">
          <span nz-icon nzType="picture"></span>
          导出图片
        </button>
        <button type="button" class="action-btn" disabled title="导出 PDF">
          <span nz-icon nzType="file-pdf"></span>
          导出 PDF
        </button>
        <button type="button" class="action-btn action-btn--primary" disabled title="生成汇报快照">
          <span nz-icon nzType="camera"></span>
          生成快照
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
      .action-btn:disabled {
        cursor: not-allowed;
        opacity: 0.62;
      }
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
}
