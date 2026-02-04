import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SendResponse } from '../../services';

@Component({
  selector: 'app-response-viewer',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzTagModule],
  template: `
    <div class="wrap">
      <div class="top">
        <div class="title">响应</div>

        @if(result?.metrics){
          <div class="meta">
            <nz-tag>{{result?.metrics?.durationMs}}ms</nz-tag>
            @if(result?.response?.status){
              <nz-tag>HTTP {{result?.response?.status}}</nz-tag>
            }
            @if(result?.error){
              <nz-tag>ERR {{result?.error?.code}}</nz-tag>
            }
          </div>
        }
      </div>

      @if(!result){
        <div class="empty">尚无响应</div>
      } @else {
        @if(result.curl){
          <div class="curl">
            <button nz-button nzType="default" nzSize="small" (click)="copy(result.curl!.bash)">复制 curl(bash)</button>
            <button nz-button nzType="default" nzSize="small" (click)="copy(result.curl!.powershell)">复制 curl(ps)</button>
          </div>
        }

        @if(result.error){
          <pre class="body err">{{result.error.code}}: {{result.error.message}}</pre>
        } @else {
          <pre class="body">{{result.response?.bodyText ?? ''}}</pre>
        }
      }
    </div>
  `,
  styles: [`
    .wrap{ display:flex; flex-direction:column; height:100%; }
    .top{
      padding:10px;
      border-bottom:1px solid #f0f0f0;
      display:flex; align-items:center; justify-content:space-between;
    }
    .title{ font-weight:600; }
    .meta{ display:flex; gap:8px; }
    .curl{ padding:10px; display:flex; gap:8px; border-bottom:1px solid #f0f0f0; }
    .empty{ padding:16px; opacity:.6; }
    .body{
      flex:1 1 auto;
      overflow:auto;
      margin:0;
      padding:12px;
      white-space:pre-wrap;
      word-break:break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size:12px;
    }
    .err{ color:#a8071a; }
  `],
})
export class ResponseViewerComponent {
  private msg = inject(NzMessageService);

  @Input() result: SendResponse | null = null;

  copy(text: string) {
    navigator.clipboard.writeText(text);
    this.msg.success('已复制');
  }
}
