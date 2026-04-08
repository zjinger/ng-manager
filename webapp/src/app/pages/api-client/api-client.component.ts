import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { ApiHistoryDrawerComponent } from './components/history';
import { RequestCollectionsComponent } from './components/request-collections';
import { EnvPickerComponent, RequestEditorComponent } from './components/request-editor';
import { ResponseViewerComponent } from './components/response-viewer';
import { RequestTabsBarComponent, TabContextMenuEvent } from './components/request-tabs-bar/request-tabs-bar.component';
import { ApiClientStateService } from './services';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

@Component({
  selector: 'app-api-client.component',
  imports: [
    CommonModule,
    PageLayoutComponent,
    NzButtonModule,
    NzIconModule,
    NzLayoutModule,
    NzTooltipModule,
    NzModalModule,
    RequestCollectionsComponent,
    RequestEditorComponent,
    ResponseViewerComponent,
    RequestTabsBarComponent,
    ApiHistoryDrawerComponent,
    EnvPickerComponent,
    NzEmptyModule
  ],
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
    .editor-area {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    app-request-editor {
      flex: 0 0 auto;
      height:50%;
    }
    app-response-viewer {
      flex: 0 0 auto;
      height:50%;
      overflow: auto;
    }
    `
  ],
  template: `
      <app-page-layout [title]="'API 请求'" [loading]="store.loading()" [isFullscreen]="true" [isOverflowYAuto]="false">
        <ng-container ngProjectAs="actions">
          <app-env-picker/>
          <!-- <button nz-button nzType="default" (click)="store.sendHubV2Issues()" nz-tooltip nzTooltipTitle="读取当前项目 Hub V2 Issues">
            Hub Issues
          </button> -->
          <button nz-button nzType="text" (click)="store.openHistory()" nz-tooltip nzTooltipTitle="历史记录">
            <nz-icon nzType="history" nzTheme="outline" />
          </button>
        </ng-container>
        <nz-layout class="page">
          <app-request-collections
            [nodes]="store.filteredNodes()"
            [(q)]="store.q"
            [activeId]="store.activeRequestId()"
            (select)="store.selectRequest($event)"
            (createRequest)="store.newRequest({collectionId: $event.collectionId})"
            (createCollection)="store.newCollection({kind:'collection'})"
            (createFolder)="store.newCollection({kind:'folder', parentId: $event.collectionId})"
            (reload)="store.loadAll()"
            (delete)="store.deleteCollection($event.id, $event.kind)"
            (rename)="store.renameCollection($event.id, $event.kind)"
            (move)="store.moveCollection($event.id, $event.kind)"
            [loading]="store.loading()"
          />
          <div class="content">
            <!-- Tabs 标签栏 -->
            <app-request-tabs-bar
              [tabs]="store.tabs"
              [activeTabId]="store.activeTabId"
              [canOpenMore]="store.canOpenMore()"
              (tabChange)="store.switchTab($event)"
              (tabClose)="handleTabClose($event)"
              (tabAdd)="store.newTab()"
              (tabRename)="store.renameTab($event.id, $event.title)"
              (tabReorder)="store.reorderTabs($event.from, $event.to)"
              (tabContextMenu)="handleTabContextMenu($event)"
            />
            
            @if(store.activeRequest()){
              <div class="editor-area">
                <app-request-editor
                  [collectionPath]="store.collectionPath()"
                  [baseUrl]="store.activeEnv()?.baseUrl ?? null"
                  [request]="store.activeRequest()"
                  [sending]="store.sending()"
                  [envVars]="store.envVarRecord()"
                  [openEnv]="openEnv"
                  (patch)="store.patchActive($event)"
                  (save)="store.saveActive()"
                  (send)="store.sendActive()"
                />
                <app-response-viewer
                  [sending]="store.sending()"
                  [result]="store.lastResult()"
                />
              </div>
            }@else{
              <nz-empty  
            [nzNotFoundContent]="contentTpl"
            [nzNotFoundFooter]="footerTpl">
          </nz-empty>
            }
            <ng-template #contentTpl>
              <span>暂无请求，点击左侧面板右上角"+" 创建请求</span>
            </ng-template>
            <ng-template #footerTpl>
              <button nz-button nzType="primary" (click)="store.newTab()">立即新增</button>
            </ng-template>
          </div>
        </nz-layout>
    </app-page-layout>
    @if (store.historyOpen()) {
      <app-api-history-drawer
        [loading]="store.historyLoading()"
        [histories]="store.histories()"
        (close)="store.closeHistory()"
        (replay)="store.replayHistory($event)"
      />
    }
  `,
})
export class ApiClientComponent {
  store = inject(ApiClientStateService);
  private modal = inject(NzModalService);

  @ViewChild('envPicker') envPicker!: EnvPickerComponent;

  openEnv = () => {
    this.envPicker.openEnvModal();
  }

  /**
   * 处理 Tab 关闭
   */
  handleTabClose(tabId: string): void {
    const tab = this.store.tabs().find(t => t.id === tabId);
    
    if (tab?.isDirty) {
      this.modal.confirm({
        nzTitle: '关闭确认',
        nzContent: '当前请求有未保存的修改，确定要关闭吗？',
        nzOkText: '关闭',
        nzCancelText: '取消',
        nzOnOk: () => {
          this.store.closeTab(tabId);
        }
      });
    } else {
      this.store.closeTab(tabId);
    }
  }

  /**
   * 处理右键菜单操作
   */
  handleTabContextMenu(event: TabContextMenuEvent): void {
    const { tabId, action } = event;

    switch (action) {
      case 'close':
        this.handleTabClose(tabId);
        break;

      case 'closeOthers': {
        const dirtyTabs = this.store.tabs().filter(t => t.id !== tabId && t.isDirty);
        if (dirtyTabs.length > 0) {
          this.modal.confirm({
            nzTitle: '关闭其他标签页',
            nzContent: `有 ${dirtyTabs.length} 个标签页有未保存的修改，确定要全部关闭吗？`,
            nzOkText: '全部关闭',
            nzCancelText: '取消',
            nzOnOk: () => {
              this.store.tabStore.closeOtherTabs(tabId);
            }
          });
        } else {
          this.store.tabStore.closeOtherTabs(tabId);
        }
        break;
      }

      case 'closeRight': {
        const idx = this.store.tabs().findIndex(t => t.id === tabId);
        const rightTabs = this.store.tabs().slice(idx + 1);
        const dirtyTabs = rightTabs.filter(t => t.isDirty);
        if (dirtyTabs.length > 0) {
          this.modal.confirm({
            nzTitle: '关闭右侧标签页',
            nzContent: `右侧有 ${dirtyTabs.length} 个标签页有未保存的修改，确定要全部关闭吗？`,
            nzOkText: '全部关闭',
            nzCancelText: '取消',
            nzOnOk: () => {
              this.store.tabStore.closeRightTabs(tabId);
            }
          });
        } else {
          this.store.tabStore.closeRightTabs(tabId);
        }
        break;
      }

      case 'closeSaved': {
        const savedTabs = this.store.tabs().filter(t => !t.isDirty && t.requestId);
        if (savedTabs.length > 0) {
          this.modal.confirm({
            nzTitle: '关闭已保存的标签页',
            nzContent: `确定要关闭 ${savedTabs.length} 个已保存的标签页吗？`,
            nzOkText: '关闭',
            nzCancelText: '取消',
            nzOnOk: () => {
              this.store.tabStore.closeSavedTabs();
            }
          });
        }
        break;
      }

      case 'duplicate':
        try {
          this.store.tabStore.duplicateTab(tabId);
        } catch (e: any) {
          console.error(e);
        }
        break;

      case 'copyUrl': {
        const url = this.store.tabStore.getTabUrl(tabId);
        if (url) {
          navigator.clipboard.writeText(url);
        }
        break;
      }

      case 'moveTo': {
        const tab = this.store.tabStore.getTab(tabId);
        if (tab?.requestId) {
          this.store.moveCollection(tab.requestId, 'request');
        }
        break;
      }
    }
  }
}
