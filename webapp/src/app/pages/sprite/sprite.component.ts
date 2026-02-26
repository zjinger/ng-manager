import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageLayoutComponent } from '@app/shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { SpriteConfModalComponent } from './sprite-conf-modal.component';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

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
        <button nz-button  nzType="text" (click)="openSettingModal()" nz-tooltip nzTooltipTitle="">
          <nz-icon nzType="setting" nzTheme="outline"></nz-icon>
        </button>
      </ng-container>
      <div class="page">
        <div class="content empty">
          <nz-empty  
            [nzNotFoundContent]="contentTpl"
            [nzNotFoundFooter]="footerTpl">
          </nz-empty>
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
export class SpriteComponent {
  loading = signal(false);
  constructor(private modal: NzModalService) { }
  openSettingModal() {
    const modal = this.modal.create({
      nzTitle: '雪碧图配置',
      nzFooter: null,
      nzKeyboard: false,
      nzMaskClosable: false,
      nzClosable: false,
      nzContent: SpriteConfModalComponent,
      nzWidth: '1020px',
      nzCentered: true,
    })

    const instance = modal.getContentComponent();
    modal.afterClose.subscribe((data) => {
      if (data?.ok) {
        // 创建成功
      }
    })
  }
}
