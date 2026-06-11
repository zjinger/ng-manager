import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import type { HubV2AgentConnectionSummary } from '../../../services';

@Component({
  selector: 'app-connection-card',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule],
  template: `
    <div class="connection-card" [class.expanded]="expanded()">
      <button
        class="delete-btn"
        nz-button
        nzType="text"
        nzSize="small"
        nzDanger
        [disabled]="submitting"
        (click)="delete.emit(item); $event.stopPropagation()"
      >
        <nz-icon nzType="close" nzTheme="outline" />
      </button>
      <div class="connection-card-header" (click)="toggleExpanded()">
        <div class="connection-card-header-left">
          <nz-icon
            nzType="caret-right"
            nzTheme="outline"
            class="expand-icon"
            [class.expanded]="expanded()"
          />
          <div class="connection-title-group">
            <div class="connection-title-row">
              <span class="connection-name">{{ item.name }}</span>

              @if (item.source) {
                <span class="connection-source">
                  <nz-icon nzType="setting" nzTheme="outline" />
                  {{ item.source }}
                </span>
              }
              @if (item.isDefault) {
                <nz-tag nzColor="blue">默认</nz-tag>
              }
            </div>
            <span class="connection-project-name">{{ item.projectName || '-' }}</span>
          </div>
        </div>
        <div class="connection-card-actions" (click)="$event.stopPropagation()">
          <button nz-button nzType="link" nzSize="small" (click)="edit.emit(item)">编辑</button>
          <button
            nz-button
            nzType="link"
            nzSize="small"
            (click)="test.emit(item)"
            [disabled]="testing"
          >
            @if (testing) {
              <nz-icon nzType="loading" nzTheme="outline" />
            }
            测试
          </button>
          <button
            nz-button
            nzType="link"
            nzSize="small"
            (click)="setDefault.emit(item)"
            [disabled]="item.isDefault || submitting"
          >
            设为默认
          </button>
        </div>
      </div>
      @if (expanded()) {
        <div class="connection-card-details">
          <div class="detail-item">
            <span class="detail-label">Project Key</span>
            <span class="detail-value">{{ item.projectKey }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Project Token</span>
            <span class="detail-value">{{
              item.hasProjectToken ? item.projectTokenPreview || 'configured' : 'missing'
            }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Personal Token</span>
            <span class="detail-value">{{
              item.hasPersonalToken ? item.personalTokenPreview || 'configured' : 'missing'
            }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Base Url</span>
            <span class="detail-value">{{ item.baseUrl }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .connection-card {
        position: relative;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        padding: 12px 16px;
        background: #fff;
        transition:
          box-shadow 0.2s,
          border-color 0.2s;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border-color: #d9d9d9;

          .delete-btn {
            opacity: 1;
          }
        }

        &.expanded {
          border-color: #91caff;
        }
      }

      .delete-btn {
        width: 18px;
        height: 18px;
        position: absolute;
        top: 6px;
        right: 6px;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 1;

        &:hover {
          background: #fff1f0;
        }
      }

      .connection-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;

        .connection-card-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .connection-title-group {
          min-width: 0;
        }

        .connection-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .expand-icon {
          font-size: 10px;
          color: #8c8c8c;
          transition: transform 0.2s;
          flex-shrink: 0;

          &.expanded {
            transform: rotate(90deg);
          }
        }

        .connection-name {
          font-weight: 600;
          font-size: 14px;
          color: #262626;
        }

        .connection-source {
          color: #8c8c8c;
          font-size: 12px;

          nz-icon {
            font-size: 12px;
          }
        }

        .connection-project-name {
          color: #595959;
          font-size: 13px;
        }
      }

      .connection-card-actions {
        margin-right: 12px;
        display: flex;
        gap: 2px;
        align-items: center;
        flex-shrink: 0;

        button {
          font-size: 14px;
          padding: 0 4px;
          height: 22px;
        }
      }

      .connection-card-details {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-top: 12px;
        padding: 12px;
        background: #fafafa;
        border-radius: 6px;
        animation: fadeIn 0.15s ease-in;

        .detail-item {
          display: flex;
          gap: 8px;
          align-items: baseline;

          .detail-label {
            color: #8c8c8c;
            font-size: 12px;
            white-space: nowrap;
            min-width: 80px;
          }

          .detail-value {
            color: #262626;
            font-size: 13px;
            word-break: break-all;
          }
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ConnectionCardComponent {
  @Input({ required: true }) item!: HubV2AgentConnectionSummary;
  @Input() submitting = false;
  @Input() testing = false;
  @Input() defaultExpanded = false;

  @Output() edit = new EventEmitter<HubV2AgentConnectionSummary>();
  @Output() setDefault = new EventEmitter<HubV2AgentConnectionSummary>();
  @Output() delete = new EventEmitter<HubV2AgentConnectionSummary>();
  @Output() test = new EventEmitter<HubV2AgentConnectionSummary>();

  expanded = signal(false);

  ngOnInit(): void {
    this.expanded.set(this.defaultExpanded);
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }
}
