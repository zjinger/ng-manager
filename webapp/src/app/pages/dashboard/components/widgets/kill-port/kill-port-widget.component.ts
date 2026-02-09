import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { DashboardItem } from '../../../dashboard.model';
import { WidgetBaseComponent } from '../widget-base.component';
import { DashboardApiService } from '@pages/dashboard/services/dashboard-api.service';
import { NzMessageService } from 'ng-zorro-antd/message';
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
        <input nz-input placeholder="输入一个网络端口" name="port" [(ngModel)]="port"  (keydown.enter)="killPort()" />
        <button nz-button nzType="primary"  (click)="killPort()">
          <nz-icon [nzType]="spin()?'loading' : 'thunderbolt'" nzTheme="outline" />
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
  private api = inject(DashboardApiService);
  private msg = inject(NzMessageService);
  spin = signal(false);

  isPortValid(): boolean {
    const portNumber = Number(this.port);
    return Number.isInteger(portNumber) && portNumber > 0 && portNumber <= 65535;
  }

  killPort() {
    if (!this.isPortValid()) {
      this.msg.error('请输入有效的端口号（1-65535）');
      return;
    }
    this.spin.set(true);
    this.api.killPort(Number(this.port)).subscribe({
      next: (res) => {
        if (res.killed.length === 0) {
          this.msg.info(`端口 ${this.port} 没有被任何进程占用`);
          return;
        }
        this.port = '';
        this.msg.success(`端口 ${this.port} 已被终止`);
      }, error: (err) => {
        console.error('Kill port error', err);
        this.msg.error(`无法终止端口 ${this.port}：${err.message || err}`);
      }, complete: () => {
        this.spin.set(false);
      }
    });
  }
}
