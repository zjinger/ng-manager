import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
    EnvPickerComponent
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
          <app-env-picker
            [(drawerOpen)]="store.envDrawerOpen"
            [envs]="store.envs()"
            [envId]="store.activeEnvId()"
            (envChange)="store.setActiveEnv($event)"
            [saveEnv]="store.saveEnv.bind(store)"
            [deleteEnv]="store.deleteEnv.bind(store)"
          />
          <button nz-button nzType="text" (click)="store.openHistory()" nz-tooltip nzTooltipTitle="历史记录">
            <nz-icon nzType="history" nzTheme="outline" />
          </button>
        </ng-container>
        <nz-layout class="page">
          <app-request-collections
            [requests]="store.cachedRequests()"
            [activeId]="store.activeRequestId()"
            (select)="store.selectRequest($event)"
            (create)="store.newRequest()"
            (reload)="store.loadRequests()"
            [loading]="store.loading()"
          />
          <div class="content">
            @if(store.activeRequest()){
              <app-request-editor
                [request]="store.activeRequest()"
                [sending]="store.sending()"
                [envVars]="store.envVarRecord()"
                [openEnv]="openEnv"
                (patch)="store.patchActive($event)"
                (save)="store.saveActive()"
                (send)="store.sendActive()"
              />
              <!-- <app-response-viewer [result]="store.lastResult()" /> -->
              <app-response-viewer
                [sending]="store.sending()"
                [result]="store.lastResult()"
              />
            }
            
          </div>
        </nz-layout>
    </app-page-layout>
    @if (store.historyOpen()) {
      <app-api-history-drawer
        [open]="true"
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

  openEnv = () => {
    this.store.envDrawerOpen.set(true);
  }
}
