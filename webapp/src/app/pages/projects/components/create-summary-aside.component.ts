import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, model, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { CreateProjectDraft } from '../models/project-draft';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { Clipboard } from '@angular/cdk/clipboard';
import { TerminalViewComponent } from '@app/shared';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';

@Component({
  standalone: true,
  selector: 'app-create-summary-aside',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzCardModule, NzTagModule, NzTooltipModule, NzIconModule, NzButtonModule, TerminalViewComponent, NzDrawerModule],
  template: `
  <!--[nzExtra]="isCreating() ? logActions : undefined"-->
  <nz-card nzTitle="摘要" nzSize="small" [nzExtra]="logActions">
    <div class="item"><span class="k">名称</span><span class="v">{{draft.name || '-'}}</span></div>
    <div class="item"><span class="k">路径</span><span class="v mono">{{draft.rootPath || '-'}}</span></div>
    <div class="item"><span class="k">包管理器</span><span class="v">{{draft.packageManager}}</span></div>
    <div class="item">
      <span class="k">Git 远程仓库</span>
      <span class="v" [nz-tooltip]="draft.repoUrl||''">{{draft.repoUrl || '-'}}</span>
      @if(draft.repoUrl){
        <button nz-button nzType="text" nzSize="small" (click)="copy()" [nz-tooltip]="copyied ? '已复制' : '复制'">
          <nz-icon nzType="copy" nzTheme="outline" />
        </button>
      }
    </div>

    <div class="sep"></div>

    <div class="item"><span class="k">框架</span><span class="v">{{draft.detected?.framework || '-'}}</span></div>
    <div class="item"><span class="k">脚本命令</span><span class="v">{{draft.detected?.scriptsCount ?? '-'}}</span></div>
    <div class="item"><span class="k">Git</span><span class="v">{{draft.detected?.hasGit ? 'Yes' : 'No'}}</span></div>

    @if(draft.detected?.recommendedScript){
      <div  class="tag">
        <nz-tag nzColor="blue">推荐：{{draft.detected?.recommendedScript}}</nz-tag>
      </div>
    }

    @if( draft.overwriteIfExists){
      <div class="warn" >
        ⚠️ 覆盖已存在目录
      </div>
    }
  </nz-card>
  <ng-template #logActions>
    <button nz-button nzType="text" nzSize="small" (click)="isDrawerOpen = !isDrawerOpen">
      <nz-icon nzType="desktop" nzTheme="outline"></nz-icon>
      日志输出
    </button>
  </ng-template>
  
  <nz-drawer
  [nzVisible]="isDrawerOpen"
  (nzOnClose)="isDrawerOpen = false"
  nzTitle="日志"
  [nzWidth]="720"
  nzPlacement="right"
  [nzBodyStyle]="{'padding': '8px'}"
>
  <ng-container *nzDrawerContent>
    <app-terminal-view  [style.height.%]="100"></app-terminal-view>
  </ng-container>
  </nz-drawer>
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
export class CreateSummaryAsideComponent implements OnChanges {

  @Input({ required: true }) draft!: CreateProjectDraft;
  @Input() chunk: string = '';
  private clipboard = inject(Clipboard);
  @ViewChild(TerminalViewComponent) term?: TerminalViewComponent;
  isDrawerOpen = false
  isCreating = model(false);
  copyied = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chunk'] && changes['chunk'].currentValue && this.term) {
      this.term.write(this.chunk);
    }
    if (changes['isCreating'] && changes['isCreating'].currentValue === true) {
      this.isDrawerOpen = true;
    }
  }
  copy() {
    const text = this.draft.repoUrl || '';
    this.clipboard.copy(text);
    this.copyied = true;
    setTimeout(() => {
      this.copyied = false;
    }, 2000);
  }
}
