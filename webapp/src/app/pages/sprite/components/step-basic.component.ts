import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { SpriteDraft } from '../models/sprite-draft.model';

@Component({
  selector: 'app-step-basic',
  imports: [
    CommonModule,
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzSwitchModule,
    NzCardModule,
    NzTooltipModule,
    NzIconModule,
  ],
  template: `
    <nz-card nzTitle="基础设置">
      <form nz-form nzLayout="vertical">
        <nz-form-item>
          <nz-form-label>雪碧图 SVN 路径</nz-form-label>
          <nz-form-control>
              <input nz-input [(ngModel)]="draft.iconSvnPath" name="iconSvnPath" placeholder="输入 Icon SVN 路径" />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>其他图片 SVN 路径</nz-form-label>
          <nz-form-control>
            <input nz-input [(ngModel)]="draft.otherImagesSvnPath" name="otherImagesSvnPath" placeholder="输入其他图片 SVN 路径"/>
          </nz-form-control>
        </nz-form-item>
      </form>
    </nz-card>
  `,
  styles: [`
    .hint { margin-top: 6px; font-size: 12px; opacity: .7; }
    .emit { margin-top: 8px; }
  `]
})
export class StepBasicComponent {
  @Input({ required: true }) draft!: SpriteDraft;
}
