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
          <nz-form-label nzRequired nzTooltipTitle="项目的原尺寸图标SVN地址，用于制作项目所需雪碧图" [nzTooltipIcon]="{ type: 'question-circle', theme: 'outline' }">原尺寸图标 SVN 地址</nz-form-label>
          <nz-form-control nzHasFeedback  nzErrorTip="请输入原尺寸图标SVN地址">
              <input nz-input [(ngModel)]="draft.iconSvnPath" required  name="iconSvnPath" placeholder="输入原尺寸图标SVN地址" />
          </nz-form-control>
          <div class="hint">示例：svn://192.168.1.10/项目管理/xx项目/02.项目文档/05.系统设计/02-原型设计/02-UI设计效果图&切图/3-原尺寸图标</div>
          </nz-form-item>
        
        <nz-form-item>
          <nz-form-label nzTooltipTitle="项目的其他切图SVN地址，方便浏览和查看详情" [nzTooltipIcon]="{ type: 'question-circle', theme: 'outline' }">其他切图 SVN 地址</nz-form-label>
          <nz-form-control>
            <input nz-input [(ngModel)]="draft.otherImagesSvnPath" name="otherImagesSvnPath" placeholder="输入其他切图 SVN 地址"/>
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label nzRequired nzTooltipTitle="用于存放从SVN拉取的原尺寸图标和其他切图等资源文件，供后续雪碧图制作使用">SVN资源目录</nz-form-label>
          <nz-form-control nzHasFeedback nzErrorTip="请输入存放SVN资源目录">
              <input nz-input  required [(ngModel)]="draft.localDir" name="localDir" placeholder="输入SVN资源本地存放目录" />
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label nzRequired nzTooltipTitle="用于存放生成的雪碧图文件">雪碧图导出目录</nz-form-label>
          <nz-form-control nzHasFeedback nzErrorTip="请输入存放雪碧图的导出目录">
              <input nz-input  required [(ngModel)]="draft.spriteExportDir" name="spriteExportDir" placeholder="输入雪碧图导出目录" />
          </nz-form-control>
          <div class="hint">
            示例：前端项目中公共资源目录一般为 assets 或 public，建议设置为 'assets/icons' 或 'public/icons'
          </div>
        </nz-form-item>
         <nz-form-item>
          <nz-form-label nzRequired nzTooltipTitle="用于存放生成的Less文件">Less 导出目录</nz-form-label>
          <nz-form-control nzHasFeedback nzErrorTip="请输入存放Less文件的导出目录">
            <input nz-input  required [(ngModel)]="draft.lessExportDir" name="lessExportDir" placeholder="输入Less导出目录" />
          </nz-form-control>
          <div class="hint">
            示例：前端项目中样式文件目录一般为 '/src/styles'，建议设置为 '/src/styles/icons'
          </div>
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
