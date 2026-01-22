import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ConfigTreeNode } from '../models';
import { FormsModule } from '@angular/forms';

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
          @for (node of nodes; track node.id) {
            <div
              class="item"
              [class.active]="node.id === active"
              (click)="select(node)"
            >
              <div class="row">
                <div class="icon">
                  <nz-icon
                    class="project-suffix-icon"
                    [nzType]="node.icon || 'setting'"
                    nzTheme="outline"
                  />
                </div>
                <div class="info">
                  <div class="name">{{ node.label }}</div>
                  <div class="description">{{ node.description }}</div>
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
        height:100%;
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
            flex: 1 1 auto;
            overflow: auto;
            height: 0;
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
                    background: var(--app-primary-3);
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

  @Input() nodes!: ConfigTreeNode[];
  @Input() active!: string;

  @Output() nodeSelect = new EventEmitter<ConfigTreeNode>();
  select(node: ConfigTreeNode) {
    if (node.file) {
      this.nodeSelect.emit(node);
    }
  }
}
