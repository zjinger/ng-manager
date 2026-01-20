import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { DashboardItem } from '../../../dashboard.model';
import { WidgetBaseComponent } from '../widget-base.component';
@Component({
  selector: 'app-quick-task-widget',
  imports: [
    CommonModule,
    WidgetBaseComponent,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzSelectModule
  ],
  template: `
    <app-widget-base [item]="item">
      <div class="content">
        @if(item.configurable && !item.config){
          <div class="icon-wrapper">
            <nz-icon nzType="setting" nzTheme="fill" />
          </div>
          <div class="actions">
            <button nz-button (click)="isModalVisible = true" nzType="primary">配置部件</button>
          </div>
        }
      </div>
    </app-widget-base>
    <nz-modal
      nzCentered
      [(nzVisible)]="isModalVisible"
      nzTitle="配置部件"
      (nzOnCancel)="isModalVisible = false"
      [nzMaskClosable]="false"
    >
      <ng-container *nzModalContent>
        <div class="modal-body">
          <label>选择一项任务</label>
          <nz-select nzPlaceHolder="请选择任务">
            <nz-option nzLabel="任务一" nzValue="task1"></nz-option>
            <nz-option nzLabel="任务二" nzValue="task2"></nz-option>
            <nz-option nzLabel="任务三" nzValue="task3"></nz-option>
          </nz-select>
        </div>
      </ng-container>

      <ng-container *nzModalFooter>
        <button
          nz-button
          nzType="primary"
          (click)="save()"
        >
          <nz-icon nzType="folder-add" nzTheme="fill" />
          创建
        </button>
      </ng-container>
    </nz-modal>    
  `,
  styles: [`
    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      .icon-wrapper {
        margin-top: 8px;
        margin-bottom: 16px;
        nz-icon {
          font-size: 48px;
          color: var(--app-gray);
        }
      }
    }
    .modal-body{
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      label{
        flex:0 0 auto;
        margin-right: 16px;
        display: inline-block;
        width: 120px;
      }
      nz-select{
        flex: 1;
        margin-left: 16px;
      }
    }
  `],
})
export class QuickTaskWidgetComponent {
  @Input() item!: DashboardItem;

  isModalVisible = false;

  save() { }
}
