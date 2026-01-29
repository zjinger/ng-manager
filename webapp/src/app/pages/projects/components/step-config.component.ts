// src/app/projects/components/step-config.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzInputModule } from 'ng-zorro-antd/input';

import { CreateProjectDraft } from '../models/project-draft';

@Component({
  standalone: true,
  selector: 'app-step-config',
  imports: [CommonModule, FormsModule, NzCardModule, NzRadioModule, NzSwitchModule, NzInputModule],
  template: `
  <nz-card nzTitle="创建后默认行为">
    <div class="row">
      <div class="label">置顶收藏</div>
      <nz-switch [(ngModel)]="draft.pinFavorite" (ngModelChange)="emit()"></nz-switch>
    </div>

    <div class="row col">
      <!-- <div class="label">创建后默认打开</div>
      <nz-radio-group [(ngModel)]="draft.openAfterCreate" (ngModelChange)="emit()">
        <label nz-radio nzValue="tasks">Tasks</label>
        <label nz-radio nzValue="home">Home</label>
      </nz-radio-group> -->
    </div>

    <div class="row col">
      <div class="label">默认任务（可选）</div>
      <input nz-input [(ngModel)]="draft.defaultTaskName" (ngModelChange)="emit()" placeholder="例如：dev / start"/>
      <div class="hint">建议填识别到的 dev 或 start</div>
    </div>
  </nz-card>
  `,
  styles: [`
    .row { display:flex; align-items:center; justify-content:space-between; padding: 10px 0; }
    .row.col { flex-direction: column; align-items: flex-start; gap: 8px; }
    .label { font-weight: 500; }
    .hint { font-size: 12px; opacity: .7; }
  `]
})
export class StepConfigComponent {
  @Input({ required: true }) draft!: CreateProjectDraft;
  @Output() draftChange = new EventEmitter<CreateProjectDraft>();
  emit() { this.draftChange.emit({ ...this.draft }); }
}
