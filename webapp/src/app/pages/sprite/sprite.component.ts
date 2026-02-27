import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageLayoutComponent } from '@app/shared';
import { SpriteConfig } from '@models/sprite.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
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
import { SpriteStateService } from './services/sprite-state.service';
import { SpriteConfModalComponent } from './sprite-conf-modal.component';

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
    NzEmptyModule
  ],
  template: `
    <app-page-layout [title]="'雪碧图'" [loading]="loading()">
      <ng-container ngProjectAs="actions">
        @if(!isEmpty()){
          <button nz-button  nzType="primary" (click)="generate()" nz-tooltip nzTooltipTitle="生成雪碧图">
            <nz-icon nzType="play-circle" nzTheme="outline"></nz-icon>
            <span>生成雪碧图</span>
          </button>
          <button nz-button  nzType="primary" (click)="checkout()" nz-tooltip nzTooltipTitle="从svn更新资源">
            <nz-icon nzType="sync" nzTheme="outline"></nz-icon>
            <span>更新资源</span>
          </button>
        }
        <button nz-button  nzType="text" (click)="openSettingModal()" nz-tooltip nzTooltipTitle="">
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
        }
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
    `
  ],
})
export class SpriteComponent implements OnInit {
  loading = signal(false);
  cfg = signal<SpriteConfig | null>(null);
  private state = inject(SpriteStateService);
  private modal = inject(NzModalService);

  ngOnInit(): void {
    this.loadConfig();
  }

  isEmpty = computed(() => {
    const cfg = this.cfg();
    const p = this.state.project();
    return (cfg && p?.assets?.iconsSvn) ? false : true;
  });

  private async loadConfig() {
    this.loading.set(true);
    const cfg = await this.state.loadConfig();
    this.cfg.set(cfg);
    this.loading.set(false);
  }

  generate() { }

  async checkout() {
    this.loading.set(true);
    const results = await this.state.checkout()
    console.log('SVN Sync Results:', results);
    this.loading.set(false);
  }

  openSettingModal() {
    const modal = this.modal.create({
      nzTitle: '雪碧图配置',
      nzFooter: null,
      nzKeyboard: false,
      nzMaskClosable: false,
      nzClosable: false,
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
