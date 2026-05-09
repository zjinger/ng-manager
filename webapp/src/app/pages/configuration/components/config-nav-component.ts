import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ConfigNavNodeVM } from '../models/config-ui.model';

@Component({
  selector: 'app-config-nav-component',
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzIconModule,
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
          @for (g of filtered(); track g.id) {
            <div
              class="item"
              [class.active]="g.id === activeDomainId()"
              (click)="selectDomain(g)"
            >
              <div class="row">
                <div class="icon">
                  <nz-icon
                    class="project-suffix-icon"
                    [nzType]="g.icon || 'setting'"
                    nzTheme="outline"
                  />
                </div>
                <div class="info">
                  <div class="name">{{ g.label }}</div>
                  <div class="description">{{ g.available ? '可用' : (g.description || '不可用') }}</div>
                </div>
              </div>
            </div>
          }
        </div>
    </div>
  `,
  styles: [
    `
       .list {
        height: auto;
        width:100%;
        display: flex;
        flex-direction: column;
        .topbar {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;

            nz-input-wrapper {
                width: 100%;
                border-radius: 18px;
            }
        }
        .items {
            flex: 0 0 auto;
            overflow: visible;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 8px;

            .item {
                border-radius: 3px;
                padding: 10px 10px;
                cursor: pointer;

                &:hover,
                &.active {
                    background: var(--app-primary-2);
                }

                .row {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    overflow: hidden;
                    justify-content: space-between;

                    .icon {
                        font-size: 42px;
                        flex: 0 0 auto;
                        position: relative;
                    }

                    .info {
                        flex: 1 1 auto;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        overflow: hidden;

                        .name {
                            font-weight: 600;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        }

                        .description {
                            font-size: 13px;
                            color: var(--app-text-secondary);
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        }
                    }
                }
            }
        }
    }
    `
  ],
})
export class ConfigNavComponent {
  keyword = signal("");
  nodes = input<ConfigNavNodeVM[]>([]);
  activeDomainId = input<string>("");
  @Output() domainSelect = new EventEmitter<string>();

  selectDomain(node: ConfigNavNodeVM) {
    this.domainSelect.emit(node.id); // domainId
  }

  filtered = computed(() => {
    const kw = this.keyword().trim().toLowerCase();
    if (!kw) return this.nodes();

    return this.nodes().filter((item) =>
      (item.label ?? "").toLowerCase().includes(kw) ||
      (item.description ?? "").toLowerCase().includes(kw) ||
      (item.files ?? []).some((file) => file.toLowerCase().includes(kw))
    );
  });

}
