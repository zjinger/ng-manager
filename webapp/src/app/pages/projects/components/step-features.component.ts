// src/app/projects/components/step-features.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { CreateProjectDraft } from '../models/project-draft';

@Component({
  standalone: true,
  selector: 'app-step-features',
  imports: [CommonModule, FormsModule, NzCardModule, NzSwitchModule],
  template: `
  <nz-card nzTitle="功能开关（Project Scope）">
    <div class="row">
      <div class="label">Tasks（必选）</div>
      <nz-switch [(ngModel)]="draft.featureTasks" [ngModelOptions]="{standalone:true}" [nzDisabled]="true"></nz-switch>
    </div>

    <div class="row">
      <div class="label">Processes</div>
      <nz-switch [(ngModel)]="draft.featureProcesses" (ngModelChange)="emit()"></nz-switch>
    </div>

    <div class="row">
      <div class="label">Logs</div>
      <nz-switch [(ngModel)]="draft.featureLogs" (ngModelChange)="emit()"></nz-switch>
    </div>

    <div class="row">
      <div class="label">Terminal（后续）</div>
      <nz-switch [(ngModel)]="draft.featureTerminal" (ngModelChange)="emit()" [nzDisabled]="true"></nz-switch>
    </div>
  </nz-card>
  `,
  styles: [`
    .row { display:flex; align-items:center; justify-content:space-between; padding: 10px 0; }
    .label { font-weight: 500; }
  `]
})
export class StepFeaturesComponent {
  @Input({ required: true }) draft!: CreateProjectDraft;
  @Output() draftChange = new EventEmitter<CreateProjectDraft>();

  emit() {
    this.draftChange.emit({ ...this.draft });
  }
}
