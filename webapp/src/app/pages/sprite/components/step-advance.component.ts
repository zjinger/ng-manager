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
  selector: 'app-step-advance',
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
    <nz-card nzTitle="高级设置">
      <form nz-form nzLayout="vertical">
        <nz-form-item>
          <nz-form-label>CSS 前缀</nz-form-label>
          <nz-form-control>
              <input nz-input [(ngModel)]="draft.cssPrefix" name="cssPrefix" placeholder="输入 CSS 前缀，默认：sl" />
              <div class="hint">
                可选，默认为 sl。生成的 CSS 类名将以该前缀开头，如：sl-16-1。
              </div>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>雪碧图 URL</nz-form-label>
          <nz-form-control>
            <input nz-input [(ngModel)]="draft.spriteUrl" name="spriteUrl" placeholder="输入雪碧图 URL，默认：/assets/icons/{group}.png"/>
            <div class="hint">
              {{spriteUrlHint}}
            </div>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>复制模板</nz-form-label>
          <nz-form-control>
            <textarea nz-input [(ngModel)]="draft.template" name="template" placeholder="{{templatePlaceholder}}" rows="3" style="resize:none;"></textarea>
            <div class="hint">
              {{templateHint}}
            </div>
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
export class StepAdvanceComponent {
  @Input({ required: true }) draft!: SpriteDraft;
  spriteUrlHint = `项目中实际雪碧图路径，默认：/assets/icons/{group}.png，如：/assets/icons/16-16.png。支持占位符： {group} 分组名（如 16-16）， {size} 尺寸前缀（如 16）。`
  templatePlaceholder = `输入复制模板,默认：<i class="{base} {class}" ></i>`;
  templateHint = `实际复制的文本，默认：<i class="{base} {class}" ></i>，如：<i class="sl-16 sl-16-1"></i>。支持占位符：{base} 基类名，{class} CSS 类名；{name} 图标名称；支持使用自定义组件，如小程序中用法：<SlIcon name="16-16-1" size="16" />，则模板为：<SlIcon name="{name}" size="{size}"/>。`
}
