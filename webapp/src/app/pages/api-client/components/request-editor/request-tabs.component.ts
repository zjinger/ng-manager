import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiRequestEntity } from '@models/api-client/api-request.model';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { AdvancedEditorComponent } from './advanced-editor.component';
import { AuthEditorComponent } from './auth-editor.component';
import { BodyEditorComponent } from './body-editor.component';
import { KvTableComponent } from './kv-table.component';

@Component({
  selector: 'app-request-tabs',
  imports: [NzTabsModule, KvTableComponent, BodyEditorComponent, AuthEditorComponent, AdvancedEditorComponent],
  template: `
    <nz-tabs class="tabs">
        <nz-tab nzTitle="Params">
          <div class="tab">
            <div class="item">
              <div class="title">Query 参数</div>
              <app-kv-table
                [rows]="req?.query || []"
                (rowsChange)="patch.emit({ query: $event })"
                keyLabel="参数名"
                valueLabel="参数值"
                descriptionLabel="说明"
                keyPlaceholder="param"
                valuePlaceholder="value"
              />
            </div>
            @if(req?.pathParams?.length){
              <div class="item">
              <div class="title">Path 参数</div>
              <app-kv-table
                [keepTrailingBlank]="false"
                [rows]="req?.pathParams || []"
                (rowsChange)="patch.emit({ pathParams: $event })"
                keyLabel="参数名"
                valueLabel="参数值"
                descriptionLabel="说明"
                keyPlaceholder="param"
                valuePlaceholder="value"
              />
            </div>
            }
          </div>
        </nz-tab>
        <nz-tab nzTitle="Headers">
          <div class="tab">
            <app-kv-table
              [rows]="req?.headers || []"
              (rowsChange)="patch.emit({ headers: $event })"
              keyLabel="Header"
              valueLabel="Value"
              keyPlaceholder="x-header"
              valuePlaceholder="value"
            />
          </div>
        </nz-tab>
        <nz-tab nzTitle="Body">
          <div class="tab">
            <app-body-editor
              [body]="req?.body"
              (bodyChange)="patch.emit({ body: $event })"
            />
          </div>
        </nz-tab>
        <nz-tab nzTitle="Auth">
          <div class="tab">
            <app-auth-editor 
              [auth]="req?.auth"
              (authChange)="patch.emit({ auth: $event })"
            />
          </div>
        </nz-tab>
        <nz-tab nzTitle="Advanced">
          <div class="tab">
            <app-advanced-editor
              [options]="req?.options"
              (optionsChange)="patch.emit({ options: $event })"
          />
          </div>
        </nz-tab>
      </nz-tabs>
  `,
  styles: [
    `
      :host{ display:flex; flex-direction:column; height:100%; min-height:0; }
      app-kv-table{
        display: block;
        height: 100%;
      }
      .tabs  {
          flex: 1 1 auto;
          overflow: hidden;
          height: 100%;
      }
      .tab{
        height: 100%;
        overflow: hidden auto;
      }
      ::ng-deep nz-tabs.tabs{
        .ant-tabs-content{
          height: 100%;
          .ant-tabs-tabpane{
            height:100%;
          }
        }
      }
    `
  ],
})
export class RequestTabsComponent {

  @Input() req: ApiRequestEntity | null = null;
  @Output() patch = new EventEmitter<Partial<ApiRequestEntity>>();
}

