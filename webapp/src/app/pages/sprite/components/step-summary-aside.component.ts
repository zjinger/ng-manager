import { Component, Input } from '@angular/core';
import { SpriteDraft } from '../models/sprite-draft.model';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-step-summary-aside',
  imports: [CommonModule, NzCardModule, NzTagModule, NzTooltipModule, NzIconModule, NzButtonModule, NzDrawerModule],
  template: `
    <nz-card nzTitle="摘要" nzSize="small">
    <div class="item"><span class="k">项目名称</span><span class="v">{{draft.name || '-'}}</span></div>
    <div class="item"><span class="k">雪碧图</span><span class="v mono">{{draft.iconSvnPath || '-'}}</span></div>
    <div class="item"><span class="k">其他图片</span><span class="v">{{draft.otherImagesSvnPath || '-'}}</span></div>
    <div class="sep"></div>

    <div class="item"><span class="k">CSS前缀</span><span class="v">{{draft.cssPrefix ?? '-'}}</span></div>
    <div class="item"><span class="k">雪碧图 URL</span><span class="v">{{draft.spriteUrl ?? '-'}}</span></div>
    <div class="item"><span class="k">复制模板</span><span class="v">{{draft.template ?? '-'}}</span></div> 
   
  </nz-card>
  `,
  styles: [`
    .item { display:flex; justify-content:space-between; gap: 10px; padding: 6px 0;align-items: center; }
    .k { opacity: .7; width: 90px;font-size: 14px; }
    .v { text-align: right; flex: 1;overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; word-break: break-all; }
    .sep { height: 1px; background: rgba(0,0,0,.06); margin: 10px 0; }
    .tag { margin-top: 8px; text-align: right; }
    .warn { margin-top: 10px; font-size: 12px; color: #d46b08; }
  `]
})
export class StepSummaryAsideComponent {
  @Input({ required: true }) draft!: SpriteDraft;
}
