import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CommonModule, CurrencyPipe } from '@angular/common';
import { ProcessHeaderInfo } from '../../models';

@Component({
  selector: 'app-process-header-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,

  styles: [
    `
      .process-card {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 20px 24px;
        margin-bottom: 16px;
        margin-top: 16px;
      }

      .process-card__content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .process-card__left {
        flex: 1;
        min-width: 0;
      }

      .process-card__top {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }

      .process-card__code {
        font-size: 18px;
        font-weight: 700;
        line-height: 1;
        color: #4338ca;
      }

      .process-card__status {
        padding: 2px 8px;
        border-radius: 999px;
        background: #ede9fe;
        color: #6d28d9;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
      }

      .process-card__desc {
        font-size: 14px;
        color: #64748b;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .process-card__right {
        display: flex;
        align-items: center;
        gap: 48px;
        flex-shrink: 0;
      }

      .process-stat {
        text-align: center;
      }

      .process-stat__label {
        margin-bottom: 4px;
        font-size: 14px;
        color: #94a3b8;
      }

      .process-stat__value {
        min-width: 72px;

        font-size: 20px;
        font-weight: 700;
        /* color: #0f172a; */

        white-space: nowrap;
      }

      .process-stat__value.money {
        font-size: 20px;
      }

      .process-stat__value.warning {
        color: #f97316;
      }

      @media (max-width: 1200px) {
        .process-card__content {
          flex-direction: column;
          align-items: flex-start;
        }

        .process-card__right {
          width: 100%;
          justify-content: space-between;
        }
      }

      @media (max-width: 768px) {
        .process-card {
          padding: 16px;
        }

        .process-card__right {
          width: 100%;
          gap: 20px;
          overflow-x: auto;
        }

        .process-card__code {
          font-size: 16px;
        }

        .process-card__desc {
          font-size: 13px;
        }

        .process-stat__label {
          font-size: 12px;
        }

        .process-stat__value {
          font-size: 16px;
        }
      }
    `,
  ],

  template: `
    <div class="process-card">
      <div class="process-card__content">
        <!-- 左侧 -->
        <div class="process-card__left">
          <div class="process-card__top">
            <div class="process-card__code">
              {{ data().code || '--' }}
            </div>

            <div class="process-card__status">
              {{ data().status || '--' }}
            </div>
          </div>

          <div class="process-card__desc">
            {{ description() }}
          </div>
        </div>

        <!-- 右侧 -->
        <div class="process-card__right">
          <!-- 报销金额 -->
          <div class="process-stat">
            <div class="process-stat__label">报销金额</div>

            <div class="process-stat__value money">
              @if (data().amount !== undefined && data().amount !== null) {

              {{ data().amount | currency : '¥' : 'symbol' : '1.2-2' }}

              } @else { -- }
            </div>
          </div>

          <!-- 当前节点 -->
          <div class="process-stat">
            <div class="process-stat__label">当前节点</div>

            <div class="process-stat__value">
              {{ data().currentNode || '--' }}
            </div>
          </div>

          <!-- 等待时长 -->
          <div class="process-stat">
            <div class="process-stat__label">等待时长</div>

            <div class="process-stat__value warning">
              {{ data().waitTime || '--' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProcessHeaderCardComponent {
  // 统一对象输入
  readonly data = input<ProcessHeaderInfo>({});

  // 描述信息
  readonly description = computed(() => {
    const d = this.data();

    const arr = [
      d.title || '--',
      d.scene || '--',
      d.submitTime ? `提交时间 ${d.submitTime}` : '--',
    ];

    return arr.join(' · ');
  });
}
