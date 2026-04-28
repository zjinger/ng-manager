import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageLayoutComponent, TerminalViewComponent } from '@app/shared';
import { SpriteConfig, SpriteSnapshot, } from '@models/sprite.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { Subscription } from 'rxjs';
import { SpriteStateService } from './services/sprite-state.service';
import { SpriteStreamService } from './services/sprite-stream.service';
import { SpriteConfModalComponent } from './sprite-conf-modal.component';
import { SpriteResultTabsComponent } from './sprite-result-tabs.component';
import dayjs from 'dayjs';

@Component({
  selector: 'app-sprite',
  imports: [
    CommonModule,
    FormsModule,
    NzGridModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzTooltipModule,
    NzTagModule,
    NzSpinModule,
    NzDividerModule,
    NzPopconfirmModule,
    NzPopoverModule,
    PageLayoutComponent,
    NzEmptyModule,
    NzDrawerModule,
    TerminalViewComponent,
    SpriteResultTabsComponent,
  ],
  template: `
    <app-page-layout [title]="'雪碧图'" [loading]="loading()" [isFullscreen]="true" [isOverflowYAuto]="false">
      <ng-container ngProjectAs="actions">
        @if(!isEmpty()){
          <button nz-button  nzType="primary" (click)="generate()" nz-tooltip nzTooltipTitle="生成雪碧图">
            <nz-icon nzType="play-circle" nzTheme="outline"></nz-icon>
            <span>生成雪碧图</span>
          </button>
          @if(hasSvnSource()){
            <button nz-button  nzType="primary" (click)="streamCheckout()" nz-tooltip nzTooltipTitle="从svn更新资源">
              <nz-icon nzType="sync" nzTheme="outline"></nz-icon>
              <span>同步 {{lastSyncAt()}}</span>
            </button>
          }
        }
        <button nz-button nzType="text" (click)="isDrawerOpen = !isDrawerOpen" nz-tooltip nzTooltipTitle="查看日志">
          <nz-icon nzType="desktop" nzTheme="outline"></nz-icon>
        </button>
        <button nz-button  nzType="text" (click)="openSettingModal()" nz-tooltip nzTooltipTitle="配置雪碧图">
          <nz-icon nzType="setting" nzTheme="outline"></nz-icon>
        </button>
      </ng-container>
      <div class="page">
        <div class="content" [class.empty]="isEmpty()">
            @if(isEmpty()){
              <nz-empty  
              [nzNotFoundContent]="contentTpl"
              [nzNotFoundFooter]="footerTpl">
              </nz-empty>
            }@else{
              <app-sprite-result-tabs [sprite]="sprite()" [localSprite]="localSprite()"></app-sprite-result-tabs>
            }

          </div>
          <div class="aside" [class.open]="isDrawerOpen">
            <app-terminal-view  [style.height.%]="100"></app-terminal-view>
          </div>
      </div>
    </app-page-layout>
    <ng-template #contentTpl>
        <span>暂无雪碧图配置，点击右上角“<nz-icon nzType="setting" nzTheme="outline"></nz-icon>” 新增配置</span>
    </ng-template>
    <ng-template #footerTpl>
      <button nz-button nzType="primary" (click)="openSettingModal()">立即新增</button>
    </ng-template>
  `,
  styles: [
    `
    .page{
      height: 100%;
      display: flex;
      flex-direction: row;
      overflow: hidden;
      gap: 16px;
      padding:0 16px;
    }
    .content {
      flex: 1 1 auto;
      width: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    .content.empty {
      justify-content: center;
    }
    .aside {
      width: 0;
      flex: 0 0 auto;
      height: 100%;
      padding: 16px;
      background: #000;
      transition: transform 0.2s ease;
      transform: translateX(150%);
    }
    .aside.open {
      width: 400px;
      transform: translateX(0);
    }
    `
  ],
})
export class SpriteComponent implements OnInit, OnDestroy {
  isDrawerOpen = false
  loading = signal(false);
  cfg = signal<SpriteConfig | null>(null);
  lastSyncAt = signal<string>('N/A');
  private sub = new Subscription();
  private state = inject(SpriteStateService);
  private modal = inject(NzModalService);
  private svnStream = inject(SpriteStreamService);
  @ViewChild(TerminalViewComponent) term?: TerminalViewComponent;
  sprite = signal<SpriteSnapshot | null>(null);
  localSprite = signal<SpriteSnapshot | null>(null);
  async ngOnInit() {
    await this.loadConfig();
    if (this.isEmpty()) return;
    const projectId = this.state.project()?.id;
    if (!projectId) return;
    const runtimes = await this.state.getSvnRuntimes();
    if (runtimes?.length) {
      runtimes.forEach(runtime => {
        const lastSyncAt = runtime.lastSyncAt ? dayjs(runtime.lastSyncAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
        const lastStatus = runtime.lastStderr ? '失败' : '成功';
        const desiredUrl = runtime.desiredUrl ? `${runtime.desiredUrl}` : 'No desired URL';
        this.term?.writeln(`[更新时间]: ${lastSyncAt}`);
        this.term?.writeln(`[更新状态]: ${lastStatus}`);
        this.term?.writeln(`[SVN 路径]: ${desiredUrl}`);
        this.term?.writeln(`-----------------------------`);
      })
      this.updateLastSyncAt(runtimes);
    }
    const sprite = await this.state.getSprites();
    this.sprite.set(sprite);

    // 如果配置了本地图片文件夹，加载本地图标
    if (this.cfg()?.localImageRoot) {
      const localSprite = await this.state.getLocalSprites();
      this.localSprite.set(localSprite);
    }

    this.sub.add(this.svnStream.watchProject(projectId, 1000));
    this.sub.add(
      this.svnStream.runtimes$(projectId).subscribe((list) => {
        this.updateLastSyncAt(list);
      })
    );
    this.sub.add(this.svnStream.output$(projectId).subscribe(chunk => {
      if (this.term) {
        this.term.write(chunk.text);
      }
    }));
  }
  ngOnDestroy(): void {
    if (this.term) {
      this.term.clear();
    }
    this.sub.unsubscribe();
  }
  isEmpty = computed(() => {
    const cfg = this.cfg();
    const p = this.state.project();
    const hasSvnSource = cfg && (p?.assets?.iconsSvn || cfg?.sourceId);
    const hasLocalSource = !!cfg?.localImageRoot;
    return !hasSvnSource && !hasLocalSource;
  });
  hasSvnSource = computed(() => {
    const cfg = this.cfg();
    const p = this.state.project();
    return !!(cfg && (p?.assets?.iconsSvn || cfg?.sourceId));
  });

  private async loadConfig() {
    try {
      this.loading.set(true);
      const cfg = await this.state.loadConfig();
      this.cfg.set(cfg);
      this.loading.set(false);
    } catch (e) {
      this.loading.set(false);
    }
  }

  async generate() {
    this.loading.set(true);
    await this.state.generate();
    const sprite = await this.state.getSprites();
    this.sprite.set(sprite);
    if (this.cfg()?.localImageRoot) {
      const localSprite = await this.state.getLocalSprites();
      this.localSprite.set(localSprite);
    } else {
      this.localSprite.set(null);
    }
    this.loading.set(false);
  }

  async checkout() {
    this.loading.set(true);
    const results = await this.state.checkout()
    // console.log('SVN Sync Results:', results);
    this.loading.set(false);
  }

  async streamCheckout() {
    if (!this.hasSvnSource()) return;
    try {
      this.loading.set(true);
      this.isDrawerOpen = true
      await this.state.streamCheckout();
      const runtimes = await this.state.getSvnRuntimes();
      this.updateLastSyncAt(runtimes);
    } finally {
      this.loading.set(false);
    }
  }

  private updateLastSyncAt(runtimes: Array<{ sourceId: string; lastSyncAt?: string }>) {
    const sourceId = this.cfg()?.sourceId;
    if (!sourceId) return;
    const runtime = runtimes.find((item) => item.sourceId === sourceId && item.lastSyncAt);
    if (runtime?.lastSyncAt) {
      this.lastSyncAt.set(dayjs(runtime.lastSyncAt).format('YYYY-MM-DD HH:mm:ss'));
    }
  }

  openSettingModal() {
    const modal = this.modal.create({
      nzTitle: '雪碧图配置',
      nzFooter: null,
      nzKeyboard: false,
      nzMaskClosable: false,
      nzClosable: true,
      nzContent: SpriteConfModalComponent,
      nzData: {
        cfg: this.cfg(),
      },
      nzWidth: '1020px',
      nzCentered: true,
    })

    const instance = modal.getContentComponent();
    modal.afterClose.subscribe((data) => {
      if (data?.ok) {
        // 创建成功
        this.loadConfig();
      }
    })
  }
}
