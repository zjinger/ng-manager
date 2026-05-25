import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { UPLOAD_TARGETS } from '@shared/constants';
import { DialogShellComponent, FileUploadDropzoneComponent, FormActionsComponent } from '@shared/ui';

@Component({
  selector: 'app-rd-task-sheet-import-dialog',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, DialogShellComponent, FileUploadDropzoneComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="620"
      [title]="'关联历史任务单'"
      [subtitle]="'上传已有 .docx 任务单，解析后进入预览确认表单。'"
      [icon]="'import'"
      (cancel)="handleCancel()"
    >
      <div dialog-body>
        <div class="import-panel">
          <app-file-upload-dropzone
            [policy]="wordImportPolicy"
            [files]="files()"
            [disabled]="busy()"
            [hint]="'仅支持 .docx 任务单文件，解析后会进入预览确认表单。'"
            (filesChange)="handleFilesChange($event)"
          />
          @if (busy()) {
            <p class="import-panel__status">正在解析 Word 内容...</p>
          }
        </div>
      </div>

      <app-form-actions dialog-footer>
        <button nz-button type="button" [disabled]="busy()" (click)="handleCancel()">取消</button>
      </app-form-actions>
    </app-dialog-shell>
  `,
  styles: [
    `
      .import-panel {
        display: grid;
        gap: 12px;
      }
      .import-panel__status {
        margin: 0;
        color: var(--text-muted);
        font-size: 13px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetImportDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly importFile = output<File>();
  readonly cancel = output<void>();

  readonly files = signal<File[]>([]);
  readonly wordImportPolicy = UPLOAD_TARGETS.taskSheetWordImport;

  handleFilesChange(files: File[]): void {
    const file = files[0];
    this.files.set(file ? [file] : []);
    if (file) {
      this.importFile.emit(file);
    }
  }

  handleCancel(): void {
    if (this.busy()) {
      return;
    }
    this.files.set([]);
    this.cancel.emit();
  }
}
