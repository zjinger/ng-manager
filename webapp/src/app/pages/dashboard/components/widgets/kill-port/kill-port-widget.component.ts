import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DashboardItem } from '../../../dashboard.model';
import { WidgetBaseComponent } from '../widget-base.component';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-kill-port-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    WidgetBaseComponent,
    NzIconModule,
    NzInputModule,
    NzSpaceModule,
    NzButtonModule
  ],
  template: `
    <app-widget-base [item]="item">
      <div class="logo">
        <div class="icon-wrapper">
          <nz-icon nzType="thunderbolt" nzTheme="outline" />
        </div>
        <h3>准备好终止</h3>
      </div>
      <nz-space style="padding: 12px 24px;">
        <input nz-input placeholder="输入一个网络端口" name="port" [(ngModel)]="port" />
        <button nz-button nzType="primary">
          <nz-icon nzType="thunderbolt" nzTheme="outline" />
          终止
        </button>
      </nz-space>
    </app-widget-base>
  `,
  styles: [
    `
      .logo {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        .icon-wrapper{
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--app-gray);
          border-radius: 50% 50%;
          nz-icon {
            font-size: 20px;
           color: var(--app-primary-5);
          }
        }
        h3{
          flex:1 1 auto;
          font-size: 18px;
          margin: 0;
          font-weight: 500;
        }
      }
    `
  ],
})
export class KillPortWidgetComponent {
  @Input() item!: DashboardItem;
  port: string = '';
}
