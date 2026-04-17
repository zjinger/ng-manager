import { Component, input } from '@angular/core';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-detail-item-card',
  imports: [NzCardModule, NzBadgeModule],
  template: `
    <nz-card class="detail-item" [style]="{ maxHeight: maxHeight() }">
      @if (title()) {
        <div class="actions">
          <h2 class="wrap-title">
            {{ title() }}
            @if (count() !== null) {
              <nz-badge nzStandalone nzShowZero [nzCount]="count()!" nzColor="#eaeaea" />
            }
          </h2>
          <ng-content select="[actions]"></ng-content>
        </div>
      }
      <div class="content">
        @if (emptyStatus()) {
          <div class="empty">{{ emptyText() }}</div>
        } @else {
          <ng-content></ng-content>
        }
      </div>
    </nz-card>
  `,
  styles: `
    .detail-item {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      // margin-bottom: 1rem;
      .actions {
        margin-bottom: 12px;
        padding: 0 4px 4px;
        display: flex;
        border-bottom: 1px solid #f0f0f0;

        .wrap-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 0;
          width: 100%;
          font-size: 18px;
          font-weight: bold;
        }
      }
    }

    :host ::ng-deep .ant-card-body {
      min-height: 0;
      height: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .content {
      overflow-y: auto;
      // height: 100%;
      flex: 1;
      // min-height: 0;
    }

    .empty {
      font-size: 0.875rem;
      text-align: center;
      color: gray;
    }

    :host ::ng-deep .ant-card-bordered {
      border-radius: 10px;
    }
  `,
})
export class DetailItemCardComponent {
  readonly title = input<string>();
  readonly maxHeight = input<string>();
  readonly count = input<number | null>(null);
  readonly emptyStatus = input<boolean>(false);
  readonly emptyText = input<string>('暂无数据');
}
