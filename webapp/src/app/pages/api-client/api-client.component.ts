import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiHistoryDrawerComponent } from './components/history';
import { RequestCollectionsComponent } from './components/request-collections';
import { EnvPickerComponent, RequestEditorComponent } from './components/request-editor';
import { ResponseViewerComponent } from './components/response-viewer';
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
    RequestCollectionsComponent,
    RequestEditorComponent,
    ResponseViewerComponent,
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
    .content.empty {
      justify-content: center;
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
          <button nz-button nzType="default" (click)="store.sendHubV2Issues()" nz-tooltip nzTooltipTitle="读取当前项目 Hub V2 Issues">
            Hub Issues
          </button>
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
          <div class="content" [ngClass]="{'empty': !store.activeRequest()}">
            @if(store.activeRequest()){
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
            }@else{
              <nz-empty  
            [nzNotFoundContent]="contentTpl"
            [nzNotFoundFooter]="footerTpl">
          </nz-empty>
            }
            <ng-template #contentTpl>
              <span>暂无请求，点击左侧面板右上角“<nz-icon nzType="plus" nzTheme="outline"></nz-icon>” 创建请求</span>
            </ng-template>
            <ng-template #footerTpl>
              <button nz-button nzType="primary" (click)="store.newRequest({collectionId: null})">立即新增</button>
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

  @ViewChild('envPicker') envPicker!: EnvPickerComponent;

  openEnv = () => {
    this.envPicker.openEnvModal();
  }
}
