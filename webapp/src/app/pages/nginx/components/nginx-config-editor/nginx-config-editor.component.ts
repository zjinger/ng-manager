import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCodeEditorModule } from 'ng-zorro-antd/code-editor';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { editor } from 'monaco-editor';

import type { NginxConfig } from '../../models/nginx.types';
import { NginxService } from '../../services/nginx.service';
import { registerNginxLanguage } from '../../../../utils/monaco-languages';

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
    NzCodeEditorModule,
    NzIconModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzToolTipModule,
  ],
  template: `
    <div class="config-editor">
      <div class="editor-toolbar">
        <div class="toolbar-left">
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

          <nz-select
            class="file-selector"
            [ngModel]="selectedFilePath()"
            (ngModelChange)="onSelectConfigFile($event)"
            nzPlaceHolder="选择配置文件"
            [nzDisabled]="loading() || !configFiles().length"
          >
            @for (file of configFiles(); track file) {
              <nz-option [nzValue]="file" [nzLabel]="getFileLabel(file)"></nz-option>
            }
          </nz-select>
          <button nz-button nzType="default" (click)="loadConfigFiles()" [nzLoading]="filesLoading()">
            <nz-icon nzType="reload" nzTheme="outline"></nz-icon>
            刷新文件列表
          </button>
        </div>

        <div class="editor-actions">
          <button nz-button (click)="loadConfig()" [nzLoading]="loading()">
            <nz-icon nzType="reload" nzTheme="outline"></nz-icon>
            刷新
          </button>
          <button
            nz-button
            [disabled]="!hasUnsavedChanges()"
            nzType="default"
            nz-popconfirm
            nzPopconfirmTitle="确认还原为当前已加载版本？"
            nzPopconfirmPlacement="top"
            (nzOnConfirm)="restoreFromOriginal()"
          >
            <nz-icon nzType="rollback" nzTheme="outline"></nz-icon>
            还原
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

      <div class="editor-container" #editorShell>
        <nz-code-editor
          class="code-editor"
          [style.height.px]="editorHeight()"
          nzEditorMode="diff"
          [ngModel]="editorContent()"
          (ngModelChange)="onEditorContentChange($event)"
          [nzOriginalText]="originalContent()"
          [nzEditorOption]="editorOptions"
          [nzLoading]="loading()"
          (nzEditorInitialized)="onCodeEditorInitialized($event)"
        ></nz-code-editor>
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
      height: 100%;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      overflow: hidden;
    }

    .editor-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;

      .toolbar-left {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--nginx-font-size-base, 14px);
        min-width: 0;

        .file-path {
          font-family: var(
            --nginx-font-family-mono,
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            'Liberation Mono',
            monospace
          );
          color: rgba(0, 0, 0, 0.65);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .file-selector {
        width: min(560px, 100%);
      }

      .editor-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
    }

    .editor-container {
      flex: 1;
      min-height: 520px;
      position: relative;
    }

    .code-editor {
      display: block;
      min-height: 520px;
      width: 100%;
      border: 1px solid #d9d9d9;
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

      .error-list,
      .warning-list {
        margin-top: 8px;
        width: 100%;

        .error-item {
          color: #ff4d4f;
          font-size: var(--nginx-font-size-sm, 12px);
          padding: 4px 0;
          font-family: var(
            --nginx-font-family-mono,
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            'Liberation Mono',
            monospace
          );
        }

        .warning-item {
          color: #faad14;
          font-size: var(--nginx-font-size-sm, 12px);
          padding: 4px 0;
          font-family: var(
            --nginx-font-family-mono,
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            'Liberation Mono',
            monospace
          );
        }
      }
    }

    :host ::ng-deep nz-code-editor.code-editor.ant-code-editor {
      width: 100%;
      min-height: 520px !important;
      display: block;
    }

    :host ::ng-deep nz-code-editor.code-editor .monaco-diff-editor {
      min-height: 520px;
    }
  `],
})
export class NginxConfigEditorComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() refreshToken = 0;
  @ViewChild('editorShell', { static: true }) editorShellRef?: ElementRef<HTMLElement>;

  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);

  config = signal<NginxConfig | null>(null);
  configFiles = signal<string[]>([]);
  selectedFilePath = signal('');
  originalContent = signal('');
  editorContent = signal('');
  filesLoading = signal(false);
  loading = signal(true);
  saving = signal(false);
  validating = signal(false);
  validationResult = signal<{ valid: boolean; errors?: string[]; warnings?: string[] } | null>(null);
  editorHeight = signal(520);

  editorOptions: editor.IStandaloneEditorConstructionOptions & editor.IDiffEditorConstructionOptions = {
    language: 'nginx',
    // automaticLayout: true,
    // renderSideBySide: false,
    // ignoreTrimWhitespace: false,
    // originalEditable: false,
    // enableSplitViewResizing: true,
    // lineNumbers: 'on',
    // minimap: { enabled: false },
    // scrollBeyondLastLine: false,
  };

  private mainConfigPath = '';
  private diffEditor: editor.IStandaloneDiffEditor | null = null;
  private resizeObserver: ResizeObserver | null = null;

  async ngOnInit() {
    await this.loadConfig(true);
    await this.loadConfigFiles();
  }

  ngAfterViewInit(): void {
    this.setupEditorHeightObserver();
    this.updateEditorHeight();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const tokenChange = changes['refreshToken'];
    if (tokenChange && !tokenChange.firstChange) {
      void this.loadConfigFiles();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  onCodeEditorInitialized(
    editorInstance: editor.IStandaloneCodeEditor | editor.IStandaloneDiffEditor,
  ): void {
    registerNginxLanguage();
    // const monacoRef = (globalThis as any).monaco;
    // monacoRef?.editor?.setTheme?.('nginx-theme');
    if (this.isDiffEditor(editorInstance)) {
      this.diffEditor = editorInstance;
    }

    this.scheduleLayout();
  }

  onEditorContentChange(value: string): void {
    this.editorContent.set(String(value ?? ''));
  }

  async loadConfig(forceMain = false) {
    this.loading.set(true);
    try {
      const targetPath = this.selectedFilePath();
      const useMain = forceMain || !targetPath || this.isSamePath(targetPath, this.mainConfigPath || targetPath);
      const res = useMain ? await this.nginxService.getConfig() : await this.nginxService.getConfigFile(targetPath);
      if (res.success && res.config) {
        const content = res.config.content || '';
        this.config.set(res.config);
        this.originalContent.set(content);
        this.editorContent.set(content);
        this.validationResult.set(null);
        this.selectedFilePath.set(res.config.mainConfigPath || targetPath);
        if (useMain || !this.mainConfigPath) {
          this.mainConfigPath = res.config.mainConfigPath;
        }
        this.mergeConfigFiles([res.config.mainConfigPath]);
        this.updateEditorHeight();
        this.scheduleLayout();
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
    const targetPath = this.selectedFilePath() || this.config()?.mainConfigPath || '';
    if (!targetPath) {
      this.message.error('未选择配置文件');
      return;
    }

    this.saving.set(true);
    try {
      const latestContent = this.getCurrentEditorContent();
      const useMain = this.isSamePath(targetPath, this.mainConfigPath || targetPath);
      const res = useMain
        ? await this.nginxService.updateConfig(latestContent)
        : await this.nginxService.updateConfigFile(targetPath, latestContent);
      if (res.success) {
        this.message.success('保存成功');
        await this.loadConfig();
        await this.loadConfigFiles();
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
      const res = await this.nginxService.validateConfig(this.getCurrentEditorContent());
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

  async loadConfigFiles() {
    this.filesLoading.set(true);
    try {
      const res = await this.nginxService.getConfigFiles();
      if (res.success) {
        const incoming = res.files || [];
        const merged = this.buildFileList(incoming);
        this.configFiles.set(merged);
        const current = this.selectedFilePath();
        if (current && merged.length && !merged.some(item => this.isSamePath(item, current))) {
          this.selectedFilePath.set(merged[0]);
          await this.loadConfig();
        }
      } else {
        this.message.error(res.error || '加载文件列表失败');
      }
    } catch (err: any) {
      this.message.error('加载文件列表失败: ' + err.message);
    } finally {
      this.filesLoading.set(false);
    }
  }

  async onSelectConfigFile(filePath: string): Promise<void> {
    const target = String(filePath || '').trim();
    if (!target || this.isSamePath(target, this.selectedFilePath())) {
      return;
    }
    this.selectedFilePath.set(target);
    await this.loadConfig();
  }

  getFileLabel(filePath: string): string {
    const normalized = String(filePath || '').replace(/\\/g, '/');
    const parts = normalized.split('/');
    const fileName = parts[parts.length - 1] || filePath;
    return fileName;
  }

  hasUnsavedChanges(): boolean {
    return this.getCurrentEditorContent() !== this.originalContent();
  }

  restoreFromOriginal(): void {
    const original = this.originalContent();
    const modified = this.diffEditor?.getModel()?.modified;
    if (modified) {
      modified.setValue(original);
    }
    this.editorContent.set(original);
    this.validationResult.set(null);
    this.scheduleLayout();
    this.message.success('已还原到已加载版本');
  }

  private getCurrentEditorContent(): string {
    const modified = this.diffEditor?.getModel()?.modified;
    if (modified) {
      return modified.getValue();
    }
    return this.editorContent();
  }

  private mergeConfigFiles(paths: string[]): void {
    const next = this.buildFileList([...this.configFiles(), ...paths]);
    this.configFiles.set(next);
  }

  private buildFileList(paths: string[]): string[] {
    const map = new Map<string, string>();
    for (const path of paths) {
      const key = this.normalizePath(path);
      if (!key) {
        continue;
      }
      if (!map.has(key)) {
        map.set(key, path);
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => a.localeCompare(b));

    if (this.mainConfigPath) {
      const index = list.findIndex(item => this.isSamePath(item, this.mainConfigPath));
      if (index > 0) {
        const [main] = list.splice(index, 1);
        list.unshift(main);
      }
      if (index < 0) {
        list.unshift(this.mainConfigPath);
      }
    }

    return list;
  }

  private isSamePath(a: string, b: string): boolean {
    return this.normalizePath(a) === this.normalizePath(b);
  }

  private normalizePath(input: string): string {
    return String(input || '').trim().replace(/\\/g, '/').toLowerCase();
  }

  private scheduleLayout(): void {
    setTimeout(() => {
      try {
        this.updateEditorHeight();
        this.syncDiffEditorHeight();
        this.diffEditor?.layout();
      } catch {
        // ignore layout error
      }
    }, 0);
  }

  private setupEditorHeightObserver(): void {
    const host = this.editorShellRef?.nativeElement;
    if (!host || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.updateEditorHeight();
      setTimeout(() => {
        this.syncDiffEditorHeight();
        this.diffEditor?.layout();
      }, 0);
    });
    this.resizeObserver.observe(host);
  }

  private updateEditorHeight(): void {
    const host = this.editorShellRef?.nativeElement;
    if (!host) {
      this.editorHeight.set(520);
      return;
    }

    const measured = host.clientHeight > 0 ? host.clientHeight : 0;
    const next = Math.max(520, measured);
    if (this.editorHeight() !== next) {
      this.editorHeight.set(next);
    }
  }

  private syncDiffEditorHeight(): void {
    const container = this.diffEditor?.getContainerDomNode();
    if (!container) {
      return;
    }

    const heightPx = `${this.editorHeight()}px`;
    container.style.height = heightPx;
    const diffDom = container.querySelector('.monaco-diff-editor') as HTMLElement | null;
    if (!diffDom) {
      return;
    }
    diffDom.style.height = heightPx;
    diffDom.style.minHeight = '520px';
  }

  private isDiffEditor(
    editorInstance: editor.IStandaloneCodeEditor | editor.IStandaloneDiffEditor,
  ): editorInstance is editor.IStandaloneDiffEditor {
    return typeof (editorInstance as editor.IStandaloneDiffEditor).getOriginalEditor === 'function';
  }
}
