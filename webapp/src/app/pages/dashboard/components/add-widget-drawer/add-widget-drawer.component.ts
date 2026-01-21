import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardLayoutService } from '@pages/dashboard/services/dashboard-layout.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { DashboardItem } from '../../dashboard.model';

@Component({
  selector: 'app-add-widget-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzInputModule,
    NzButtonModule,
    NzTooltipModule,
  ],
  template: `
    <div class="list">
      <div class="topbar">
        <nz-input-wrapper>
            <nz-icon class="search-icon" nzInputPrefix nzType="search" />
            <input
              nz-input
              placeholder=""
              [ngModel]="keyword()"
              (ngModelChange)="keyword.set($event)"
            />
          </nz-input-wrapper>
      </div>
      <div class="items">
        @for (it of filtered(); track it.key) {
          <div
            class="item"
          >
            <div class="row">
              <div class="icon">
                <nz-icon
                  [nzType]="it.icon || 'appstore'"
                  nzTheme="outline"
                />
              </div>
              <div class="info">
                <div class="name">{{ it.title }}</div>
                <div class="description">{{ it.desc }}</div>
              </div>
              <div class="actions">
                <button nz-button nzType="primary" nzSize="small" nzTooltip="添加部件" (click)="addWidget(it)">
                  <nz-icon nzType="plus" />
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./add-widget-drawer.component.less']
})
export class AddWidgetDrawerComponent {
  private layout: DashboardLayoutService = inject(DashboardLayoutService);
  @Output() add = new EventEmitter<DashboardItem>();
  keyword = signal("");

  widgets = this.layout.widgets

  filtered = computed(() => {
    const k = this.keyword().trim().toLowerCase();
    if (!k) return this.widgets();
    return this.widgets().filter(w => (w.title + (w.desc ?? "")).toLowerCase().includes(k));
  });

  constructor() { }

  addWidget(widget: DashboardItem) {
    this.add.emit(widget);
  }
}
