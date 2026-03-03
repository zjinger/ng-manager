import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
@Component({
  selector: 'app-less-viewport',
  imports: [
    CommonModule,
    NzCheckboxModule,
    FormsModule,
    NzSpaceModule,
    NzButtonModule,
    NzIconModule,
    ClipboardModule,
    NzTooltipModule
  ],
  template: `
    <div class="view-card bg-fx">
      <div class="view-header">
        <div class="text">样式代码</div>
        <div class="actions">
           <button nz-button nzType="text" (click)="copyCss()" [disabled]="!cssText" nz-tooltip="复制样式">
              <nz-icon nzType="copy"></nz-icon>
          </button>
        </div>
      </div>
      <div class="viewport">
          <pre><code>{{cssText}}</code></pre>
      </div>
    </div>
  `,
  styles: [`
      :host{
        display: block;
        height: 100%;
      }
      /* 微弱噪点 + 渐变背景 */
      .bg-fx {
          background:
              radial-gradient(1200px 650px at 20% 10%, rgba(34, 211, 238, .14), transparent 55%),
              radial-gradient(900px 520px at 80% 35%, rgba(124, 58, 237, .16), transparent 55%),
              radial-gradient(900px 520px at 40% 90%, rgba(52, 211, 153, .10), transparent 55%),
              linear-gradient(180deg, #050816 0%, #070B18 40%, #050816 100%);
          position: relative;
      }
      .view-card{
        border: 1px solid rgba(15, 23, 42, 0.12);
        position:relative;
        border-radius: 12px;
        display:flex;
        flex-direction:column;
        height: 100%;
        overflow: hidden;

      }
      .view-header{
        padding:8px 12px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        flex: 0 0 auto;
        .text{
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,.85);
        }
        .actions{
          display:flex;
          align-items:center;
          gap:8px;
          button[nz-button]{
           color: rgba(255,255,255,.85);
          }
        }

      }
      .viewport{
        flex:1 1 auto;
        min-height:0;
        cursor: default;
        background-color: rgb(5, 8, 21);
        position:relative;
        color: #fff;
        padding-left: 12px;
        overflow-x: hidden;
        overflow-y: auto;
      }
    `],
})
export class LessViewportComponent {
  @Input() cssText: string = '';
  private clipboard = inject(Clipboard);
  private msg = inject(NzMessageService);
  async copyCss() {
    const t = this.cssText;
    if (!t) return;
    this.clipboard.copy(t);
    this.msg.success("已复制样式");
  }
}
