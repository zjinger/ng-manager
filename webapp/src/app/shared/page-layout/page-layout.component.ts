import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'page-layout',
  imports: [
    CommonModule,
    NzGridModule,
    NzIconModule,
    NzInputModule
  ],
  host: {
    '[class.page-layout]': 'true',
  },
  template: `
    <div nz-row nzAlign="middle" nzJustify="space-between" class="page-header">
      <div nz-col>
        <div class="title">
            {{ title }}
            @if (loading) {
              <nz-icon nzType="loading" nzTheme="outline" />
            }
        </div>
      </div>
      <div nz-col>
          <div class="actions">
            <ng-content select="actions"></ng-content>
          </div>
      </div>
    </div>
    <div nz-row nzJustify="center" class="page-content">
      <div nz-col nzXs="24" nzSm="24"  [nzMd]="isFullscreen?24:18" [nzLg]="isFullscreen?24:12" [nzXl]="isFullscreen?24:12" >
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: `
  :host.page-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    .page-header {
      height:64px;
      padding:0 16px;
      flex: 0 0 auto;
      .title {
          font-size: 24px;
          font-weight: 600;
      }

      .actions {
          display: flex;
          align-items: center;
          gap: 10px;

          button[nz-button] {
              border-radius: 18px;
          }
          nz-input-wrapper {
              width: 220px;
              border-radius: 18px;
          }
      }
    }
    .page-content {
      flex: 1 1 auto;
      overflow: hidden auto;
      height: 0;
    }
  }
  `,
})
export class PageLayoutComponent {
  @Input() loading: boolean = false;
  @Input() title: string = '';
  @Input() isFullscreen: boolean = false;
}
