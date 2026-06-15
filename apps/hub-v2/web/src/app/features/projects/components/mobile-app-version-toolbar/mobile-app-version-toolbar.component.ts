import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import type { MobileAppVersionStatus, MobileAppPlatformType } from '../../models/mobile-app-version.model';

@Component({
  selector: 'app-mobile-app-version-toolbar',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzIconModule, NzInputModule],
  template: `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-wrap">
          <nz-icon nzType="search" nzTheme="outline" />
          <input
            nz-input
            placeholder="搜索版本号、构建号…"
            [ngModel]="keyword()"
            (ngModelChange)="keywordChange.emit($event)"
          />
        </div>
        <div class="toolbar-sep"></div>
        <div class="filter-group">
          <button
            nz-button
            [nzType]="statusFilter() === '' ? 'primary' : 'default'"
            (click)="statusFilterChange.emit('')"
          >
            全部
          </button>
          <button
            nz-button
            [nzType]="statusFilter() === 'published' ? 'primary' : 'default'"
            (click)="statusFilterChange.emit('published')"
          >
            已发布
          </button>
          <button
            nz-button
            [nzType]="statusFilter() === 'testing' ? 'primary' : 'default'"
            (click)="statusFilterChange.emit('testing')"
          >
            测试中
          </button>
          <button
            nz-button
            [nzType]="statusFilter() === 'draft' ? 'primary' : 'default'"
            (click)="statusFilterChange.emit('draft')"
          >
            草稿
          </button>
          <button
            nz-button
            [nzType]="statusFilter() === 'archived' ? 'primary' : 'default'"
            (click)="statusFilterChange.emit('archived')"
          >
            已归档
          </button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="filter-group">
          <button
            nz-button
            [nzType]="platformFilter() === '' ? 'primary' : 'default'"
            (click)="platformFilterChange.emit('')"
          >
            全平台
          </button>
          <button
            nz-button
            [nzType]="platformFilter() === 'ios' ? 'primary' : 'default'"
            (click)="platformFilterChange.emit('ios')"
          >
            iOS
          </button>
          <button
            nz-button
            [nzType]="platformFilter() === 'android' ? 'primary' : 'default'"
            (click)="platformFilterChange.emit('android')"
          >
            Android
          </button>
        </div>
      </div>
      <div class="toolbar-right">
        <button nz-button nzType="primary" (click)="create.emit()">
          <nz-icon nzType="plus" nzTheme="outline" />
          新建版本
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .search-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-wrap nz-icon {
        position: absolute;
        left: 10px;
        color: var(--text-muted);
        z-index: 1;
      }

      .search-wrap input {
        padding-left: 32px;
        width: 240px;
      }

      .toolbar-sep {
        width: 1px;
        height: 24px;
        background: var(--border-color);
        margin: 0 4px;
      }

      .filter-group {
        display: flex;
        gap: 4px;
      }

      @media (max-width: 960px) {
        .toolbar {
          flex-direction: column;
          align-items: stretch;
        }

        .toolbar-left {
          flex-wrap: wrap;
        }

        .search-wrap input {
          width: 100%;
        }

        .toolbar-right {
          justify-content: flex-end;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionToolbarComponent {
  readonly keyword = input<string>('');
  readonly statusFilter = input<MobileAppVersionStatus | ''>('');
  readonly platformFilter = input<MobileAppPlatformType | ''>('');

  readonly keywordChange = output<string>();
  readonly statusFilterChange = output<MobileAppVersionStatus | ''>();
  readonly platformFilterChange = output<MobileAppPlatformType | ''>();
  readonly create = output<void>();
}
