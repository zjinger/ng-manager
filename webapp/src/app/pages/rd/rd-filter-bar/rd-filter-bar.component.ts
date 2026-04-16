import { Component, inject, input, model, OnInit, output, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PRIORITY_OPTIONS } from '@app/shared/constants/priority-options';
import { RD_STATUS_FILTER_OPTIONS } from '@app/shared/constants/status-options';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { RdItemPriority, RdItemStatus, RdListQuery, RdStageEntity } from '../models/rd.model';
import { debounceTime } from 'rxjs';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzIconModule } from 'ng-zorro-antd/icon';
type viewType = 'list' | 'board';

@Component({
  selector: 'app-rd-filter-bar',
  imports: [
    NzFormModule,
    NzButtonModule,
    NzSelectModule,
    NzInputModule,
    FormsModule,
    ReactiveFormsModule,
    NzRadioModule,
    NzIconModule
  ],
  template: `
    <div class="toolbar">
      <form [formGroup]="form" nz-form class="search-form">
        <!-- 搜索框 -->
        <nz-form-item class="search-box">
          <nz-form-control>
            <nz-input-wrapper>
              <nz-icon nzInputPrefix nzType="search" nzTheme="outline"></nz-icon>
              <input
                nz-input
                type="text"
                formControlName="keyword"
                placeholder="搜索 RD 编号、标题或描述"
              />
            </nz-input-wrapper>
          </nz-form-control>
        </nz-form-item>

        <!-- 阶段选择 -->
        <nz-form-item class="form-item">
          <nz-form-control>
            <nz-select
              formControlName="stageIds"
              nzPlaceHolder="选择阶段"
              [nzPrefix]="stageIconTpl"
              nzMode="multiple"
              [nzMaxTagCount]="2"
              nzAllowClear
            >
              @for (stage of stages(); track stage.id) {
                <nz-option
                  [nzLabel]="stage.name"
                  [nzValue]="stage.id"
                  [nzDisabled]="!stage.enabled"
                ></nz-option>
              }
            </nz-select>
          </nz-form-control>
          <ng-template #stageIconTpl>
            <nz-icon nzType="stock" nzTheme="outline"></nz-icon>
          </ng-template>
        </nz-form-item>

        <!-- 状态选择 -->
        <nz-form-item class="form-item">
          <nz-form-control>
            <nz-select
              formControlName="status"
              nzPlaceHolder="选择状态"
              nzMode="multiple"
              [nzPrefix]="statusIconTpl"
              [nzMaxTagCount]="2"
              nzAllowClear
            >
              @for (item of statusOptions; track item.value) {
                @if (item.value !== '') {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                }
              }
            </nz-select>
          </nz-form-control>
          <ng-template #statusIconTpl>
            <nz-icon nzType="thunderbolt" nzTheme="outline" />
          </ng-template>
        </nz-form-item>

        <!-- 优先级选择 -->
        <nz-form-item class="form-item">
          <nz-form-control>
            <nz-select
              formControlName="priority"
              nzPlaceHolder="选择优先级"
              [nzPrefix]="priorityIconTpl"
              nzMode="multiple"
              [nzMaxTagCount]="2"
              nzAllowClear
            >
              @for (item of priorityOptions; track item.value) {
                @if (item.value !== '') {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                }
              }
            </nz-select>
          </nz-form-control>
          <ng-template #priorityIconTpl>
            <nz-icon nzType="tags" nzTheme="outline" />
          </ng-template>
        </nz-form-item>
      </form>
      <div class="right-col">
        <!-- 新建按钮 -->
        <!-- <button nz-button nzType="primary" type="button" (click)="openCreateDialog()">
                    <nz-icon nzType="plus" nzTheme="outline"></nz-icon>
                    新建研发项
                </button> -->
        <!-- 列表视图切换 -->
        <nz-radio-group [(ngModel)]="viewType" class="view-type">
          <label nz-radio-button nzValue="list">
            <nz-icon nzType="unordered-list" nzTheme="outline"></nz-icon>
          </label>
          <label nz-radio-button nzValue="board">
            <nz-icon nzType="book" nzTheme="outline"></nz-icon>
          </label>
        </nz-radio-group>
      </div>
    </div>
  `,
  styleUrl: './rd-filter-bar.component.less',
})
export class RdFilterBarComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly statusOptions = RD_STATUS_FILTER_OPTIONS;
  readonly priorityOptions = PRIORITY_OPTIONS;

  readonly query = input.required<RdListQuery>();
  readonly stages = input<RdStageEntity[]>([]);
  readonly viewType = model<viewType>();
  readonly valueChange = output<Partial<RdListQuery>>();

  constructor() {
    this.form.valueChanges.pipe(debounceTime(500)).subscribe((value) => {
      this.valueChange.emit(value);
    });
  }

  ngOnInit() {
    // 初始化
    this.form.patchValue(this.query(), { emitEvent: false });
  }

  form = this.fb.group({
    keyword: this.fb.control<string>(''),
    stageIds: this.fb.control<string[]>([]),
    status: this.fb.control<RdItemStatus[]>([]),
    priority: this.fb.control<RdItemPriority[]>([]),
  });
}
