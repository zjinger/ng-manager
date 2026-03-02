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
    <div class="view-card">
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
      .view-card{
        border: 1px solid rgba(15, 23, 42, 0.12);
        position:relative;
        border-radius: 12px;
      }
      .view-header{
        padding:8px 12px;
        display:flex;
        align-items:center;
        justify-content:space-between;
      }
      .viewport{
        cursor: default;
        background-color: rgb(5, 8, 21);
        position:relative;
        color: #fff;
        padding-left: 12px;
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
