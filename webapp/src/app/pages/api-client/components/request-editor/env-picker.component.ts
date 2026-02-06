import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ApiClientStateService } from '@pages/api-client/services';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { EnvModalComponent } from './env-modal.component';

@Component({
  selector: 'app-env-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzDrawerModule,
    NzInputModule,
    NzTooltipModule,
    NzIconModule,
    NzPopconfirmModule,
  ],
  template: `
    <div class="picker">
      <nz-select
        class="sel"
        [nzPlaceHolder]="'Env'"
        [ngModel]="store.activeEnvId()"
        (ngModelChange)="store.setActiveEnv($event)"
        [nzAllowClear]="true"
      >
        @for (e of store.envs(); track e.id) {
          <nz-option [nzValue]="e.id" [nzLabel]="e.name"></nz-option>
        }
      </nz-select>
      <button nz-button  nzType="text" (click)="openEnvModal()" nz-tooltip nzTooltipTitle="管理环境变量">
        <nz-icon nzType="setting" nzTheme="outline"></nz-icon>
      </button>
    </div>
  `,
  styles: [`
    .picker{ display:flex; gap:8px; align-items:center; }
    .sel{ width:160px; }
  `],
})
export class EnvPickerComponent {
  store = inject(ApiClientStateService);
  private modalService = inject(NzModalService);

  openEnvModal() {
    const modal = this.modalService.create({
      nzTitle: '环境变量',
      nzFooter: null,
      nzMaskClosable: false,
      nzContent: EnvModalComponent,
      nzWidth: '1020px',
      nzCentered: true,
    })

    modal.afterOpen.subscribe(() => {
      const instance = modal.getContentComponent() as EnvModalComponent;
      if (instance && this.store.activeEnvId()) {
        instance.selectEditEnv(this.store.activeEnvId() ?? '');
      } else {
        instance.createEnv();
      }
    });
  }

}
