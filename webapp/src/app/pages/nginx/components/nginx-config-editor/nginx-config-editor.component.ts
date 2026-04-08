import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzCodeEditorModule } from 'ng-zorro-antd/code-editor';

import { NginxService } from '../../services/nginx.service';
import type { NginxConfig } from '../../models/nginx.types';

/**
 * Nginx 配置编辑器组件
 */
@Component({
  selector: 'app-nginx-config-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzSpinModule,
    NzCodeEditorModule,
  ],
  template: `
    <div class="config-editor">
      <div class="editor-toolbar">
        <div class="file-info">
          <nz-icon nzType="file-text" nzTheme="outline"></nz-icon>
          <span class="file-path">{{ config()?.mainConfigPath || '未加载' }}</span>
          @if (config()?.isWritable === false) {
            <nz-icon
              nzType="lock"
              nzTheme="outline"
              nz-tooltip
              nzTooltipTitle="配置文件只读，可能需要管理员权限"
            ></nz-icon>
          }
        </div>
        <div class="editor-actions">
          <button nz-button (click)="loadConfig()" [nzLoading]="loading()">
            <nz-icon nzType="reload" nzTheme="outline"></nz-icon>
            刷新
          </button>
          <button nz-button (click)="validateConfig()" [nzLoading]="validating()">
            <nz-icon nzType="check-circle" nzTheme="outline"></nz-icon>
            验证
          </button>
          <button
            nz-button
            nzType="primary"
            (click)="saveConfig()"
            [nzLoading]="saving()"
            [disabled]="!config()?.isWritable"
          >
            <nz-icon nzType="save" nzTheme="outline"></nz-icon>
            保存
          </button>
        </div>
      </div>

      <div class="editor-container">
        @if (loading()) {
          <div class="loading">
            <nz-spin nzTip="加载中..."></nz-spin>
          </div>
        } @else {
          <nz-code-editor
            class="code-editor"
            [(ngModel)]="editorContent"
            [nzEditorOption]="editorOptions"
          ></nz-code-editor>
        }
      </div>

      @if (validationResult()) {
        <div class="validation-result" [class.error]="!validationResult()?.valid">
          @if (validationResult()?.valid) {
            <nz-icon nzType="check-circle" nzTheme="outline" class="success-icon"></nz-icon>
            <span>配置验证通过</span>
          } @else {
            <nz-icon nzType="close-circle" nzTheme="outline" class="error-icon"></nz-icon>
            <span>配置验证失败</span>
          }

          @if (validationResult()?.errors?.length) {
            <div class="error-list">
              @for (error of validationResult()?.errors; track $index) {
                <div class="error-item">{{ error }}</div>
              }
            </div>
          }

          @if (validationResult()?.warnings?.length) {
            <div class="warning-list">
              @for (warning of validationResult()?.warnings; track $index) {
                <div class="warning-item">{{ warning }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .config-editor {
      display: flex;
      flex-direction: column;
      height: 500px;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      overflow: hidden;
    }

    .editor-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;

      .file-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;

        .file-path {
          font-family: monospace;
          color: rgba(0, 0, 0, 0.65);
        }
      }

      .editor-actions {
        display: flex;
        gap: 8px;
      }
    }

    .editor-container {
      flex: 1;
      position: relative;

      .loading {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .code-editor {
        height: 100%;
      }
    }

    .validation-result {
      padding: 12px 16px;
      background: #f6ffed;
      border-top: 1px solid #b7eb8f;
      display: flex;
      align-items: center;
      gap: 8px;

      &.error {
        background: #fff2f0;
        border-top-color: #ffccc7;
      }

      .success-icon {
        color: #52c41a;
      }

      .error-icon {
        color: #ff4d4f;
      }

      .error-list, .warning-list {
        margin-top: 8px;
        width: 100%;

        .error-item {
          color: #ff4d4f;
          font-size: 12px;
          padding: 4px 0;
          font-family: monospace;
        }

        .warning-item {
          color: #faad14;
          font-size: 12px;
          padding: 4px 0;
          font-family: monospace;
        }
      }
    }
  `],
})
export class NginxConfigEditorComponent implements OnInit {
  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);

  config = signal<NginxConfig | null>(null);
  editorContent = '';
  loading = signal(false);
  saving = signal(false);
  validating = signal(false);
  validationResult = signal<{ valid: boolean; errors?: string[]; warnings?: string[] } | null>(null);

  editorOptions = {
    language: 'nginx',
    theme: 'vs-light',
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    automaticLayout: true,
  };

  ngOnInit() {
    this.loadConfig();
  }

  async loadConfig() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.getConfig();
      if (res.success && res.config) {
        this.config.set(res.config);
        this.editorContent = res.config.content;
      } else {
        this.message.error(res.error || '加载配置失败');
      }
    } catch (err: any) {
      this.message.error('加载配置失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  async saveConfig() {
    this.saving.set(true);
    try {
      const res = await this.nginxService.updateConfig(this.editorContent);
      if (res.success) {
        this.message.success('保存成功');
        this.loadConfig();
      } else {
        this.message.error(res.error || '保存失败');
      }
    } catch (err: any) {
      this.message.error('保存失败: ' + err.message);
    } finally {
      this.saving.set(false);
    }
  }

  async validateConfig() {
    this.validating.set(true);
    try {
      const res = await this.nginxService.validateConfig(this.editorContent);
      this.validationResult.set(res);
      if (res.valid) {
        this.message.success('配置验证通过');
      } else {
        this.message.error('配置验证失败');
      }
    } catch (err: any) {
      this.message.error('验证失败: ' + err.message);
    } finally {
      this.validating.set(false);
    }
  }
}
