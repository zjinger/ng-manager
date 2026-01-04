// src/app/projects/components/create-summary-aside.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { CreateProjectDraft } from '../models/project-draft';

@Component({
  standalone: true,
  selector: 'app-create-summary-aside',
  imports: [CommonModule, NzCardModule, NzTagModule],
  template: `
  <nz-card nzTitle="摘要" nzSize="small">
    <div class="item"><span class="k">Name</span><span class="v">{{draft.name || '-'}}</span></div>
    <div class="item"><span class="k">Root</span><span class="v mono">{{draft.rootPath || '-'}}</span></div>
    <div class="item"><span class="k">PM</span><span class="v">{{draft.packageManager}}</span></div>

    <div class="sep"></div>

    <div class="item"><span class="k">Framework</span><span class="v">{{draft.detected?.framework || '-'}}</span></div>
    <div class="item"><span class="k">Scripts</span><span class="v">{{draft.detected?.scriptsCount ?? '-'}}</span></div>
    <div class="item"><span class="k">Git</span><span class="v">{{draft.detected?.hasGit ? 'Yes' : 'No'}}</span></div>

    @if(draft.detected?.recommendedScript){
      <div  class="tag">
        <nz-tag nzColor="blue">推荐：{{draft.detected?.recommendedScript}}</nz-tag>
      </div>
    }

    @if(draft.mode==='create' && draft.overwriteIfExists){
      <div class="warn" >
        ⚠️ 覆盖已存在目录
      </div>
    }
  </nz-card>
  `,
  styles: [`
    .item { display:flex; justify-content:space-between; gap: 10px; padding: 6px 0; }
    .k { opacity: .7; width: 84px; }
    .v { text-align: right; flex: 1; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; word-break: break-all; }
    .sep { height: 1px; background: rgba(0,0,0,.06); margin: 10px 0; }
    .tag { margin-top: 8px; text-align: right; }
    .warn { margin-top: 10px; font-size: 12px; color: #d46b08; }
  `]
})
export class CreateSummaryAsideComponent {
  @Input({ required: true }) draft!: CreateProjectDraft;
}
