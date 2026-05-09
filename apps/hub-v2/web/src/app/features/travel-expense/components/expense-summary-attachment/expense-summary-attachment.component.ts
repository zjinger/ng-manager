import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  inject,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzUploadModule, NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subscription } from 'rxjs';

import {
  AttachmentPreviewWallComponent,
  type AttachmentPreviewItem,
  type AttachmentPreviewKind,
} from '@app/shared/ui';

// 附件类型
export interface ExpenseAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadTime: Date;
}

// 汇总数据类型
export type ExpenseSummary = {
  totalAmount: number; // 总计金额（自动计算，不可编辑）
  advanceAmount: number; // 预支金额（用户输入）
  differenceAmount: number; // 应退/应补（自动计算）
  attachments: ExpenseAttachment[]; // 附件列表
};

const DEFAULT_SUMMARY: ExpenseSummary = {
  totalAmount: 0,
  advanceAmount: 0,
  differenceAmount: 0,
  attachments: [],
};

// 生成唯一ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 上传配置
const UPLOAD_CONFIG = {
  accept: 'image/jpeg,image/jpg,image/png,application/pdf',
  maxSize: 10 * 1024 * 1024, // 10MB
  maxSizeText: '10MB',
};

// 支持的文件类型
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

@Component({
  selector: 'app-expense-summary-attachment',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    NzFormModule,
    NzInputModule,
    NzIconModule,
    NzGridModule,
    NzUploadModule,
    AttachmentPreviewWallComponent,
  ],
  template: `
    <div>
      <form nz-form [nzLayout]="'vertical'">
        <div class="row" nz-row [nzGutter]="16">
          <!-- 总计金额（只读） -->
          <div class="col" nz-col [nzSpan]="8">
            <nz-form-item>
              <nz-form-label>总计金额</nz-form-label>
              <nz-form-control>
                <div class="amount-display total-amount">
                  <span class="currency">¥</span>
                  <span class="number">{{ summary().totalAmount | number : '1.2-2' }}</span>
                </div>
              </nz-form-control>
            </nz-form-item>
          </div>

          <!-- 预支金额（可编辑） -->
          <div class="col" nz-col [nzSpan]="8">
            <nz-form-item>
              <nz-form-label>
                预支金额
                <span class="editable-tip">可编辑</span>
              </nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  type="text"
                  placeholder="0.00"
                  inputmode="decimal"
                  [ngModel]="advanceAmountValue()"
                  (ngModelChange)="onAdvanceAmountChange($event)"
                  name="advanceAmount"
                />
              </nz-form-control>
            </nz-form-item>
          </div>

          <!-- 应退/应补（自动计算） -->
          <div class="col" nz-col [nzSpan]="8">
            <nz-form-item>
              <nz-form-label>
                {{ summary().differenceAmount >= 0 ? '应退金额' : '应补金额' }}
              </nz-form-label>
              <nz-form-control>
                <div
                  class="amount-display"
                  [class.refund-amount]="summary().differenceAmount >= 0"
                  [class.repay-amount]="summary().differenceAmount < 0"
                >
                  <span class="currency">¥</span>
                  <span class="number">{{
                    Math.abs(summary().differenceAmount) | number : '1.2-2'
                  }}</span>
                </div>
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <!-- 附件上传区域 -->
        <div class="row" nz-row nzGutter="16">
          <div class="col" nz-col nzSpan="24">
            <nz-form-item>
              <nz-form-label>
                附件材料
                <span class="attachment-tip">支持 JPG、PNG、PDF 格式</span>
              </nz-form-label>
              <nz-form-control>
                <nz-upload
                  class="upload-zone"
                  nzType="drag"
                  [nzMultiple]="true"
                  [nzShowUploadList]="false"
                  [nzAccept]="uploadAccept"
                  [nzBeforeUpload]="beforeUpload"
                  [nzCustomRequest]="customRequest"
                  [nzDisabled]="busy()"
                >
                  <p class="upload-zone__icon">
                    <nz-icon nzType="plus" />
                  </p>
                  <div class="upload-zone__title">点击或拖拽文件到此区域上传</div>
                  <div class="upload-zone__hint">
                    支持 JPG、PNG、PDF 格式，单个文件最大 {{ uploadMaxSizeText }}
                  </div>
                </nz-upload>

                @if (summary().attachments.length > 0) {
                <div class="upload-picked">
                  <div class="attachment-list-header">
                    <span>已上传文件 ({{ summary().attachments.length }})</span>
                    <!-- <button
                      nz-button
                      nzType="link"
                      (click)="clearAllAttachments()"
                      [disabled]="busy()"
                    >
                      <nz-icon nzType="delete" />
                      清空所有
                    </button> -->
                  </div>
                  <app-attachment-preview-wall
                    [items]="attachmentPreviewItems()"
                    [removeDisabled]="busy()"
                    [showMeta]="true"
                    (remove)="removeAttachmentById($event)"
                  />
                </div>
                }
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .row {
        margin-bottom: 0;
      }

      .amount-display {
        display: flex;
        align-items: baseline;
        font-weight: 600;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 4px 11px;
        background-color: #f1f5f9;
        cursor: not-allowed;

        .currency {
          font-size: 14px;
          margin-right: 4px;
          color: #8c8c8c;
        }

        .number {
          color: #262626;
        }

        &.total-amount {
          .number {
            color: #1890ff;
          }
        }

        &.refund-amount {
          .number {
            color: #52c41a;
          }
        }

        &.repay-amount {
          .number {
            color: #ff4d4f;
          }
        }
      }

      .editable-tip {
        font-size: 12px;
        font-weight: normal;
        color: #1890ff;
        background: #e6f7ff;
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 8px;
      }

      .attachment-tip {
        font-size: 12px;
        font-weight: normal;
        color: #8c8c8c;
        margin-left: 8px;
      }

      .upload-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 176px;
        padding: 24px;
        border: 1px dashed #d9d9d9;
        border-radius: 18px;
        background: #fafafa;
        color: #8c8c8c;
        text-align: center;
        transition: all 0.3s;
        cursor: pointer;

        &:hover {
          border-color: #1890ff;
          background: #f5f5f5;
        }
      }

      .upload-zone__icon {
        width: 52px;
        height: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(24, 144, 255, 0.1);
        color: #1890ff;
      }

      .upload-zone__icon > span[nz-icon] {
        font-size: 28px;
      }

      .upload-zone__title {
        font-weight: 600;
        color: #262626;
        font-size: 16px;
      }

      .upload-zone__hint {
        margin: 0 auto;
        max-width: 360px;
        font-size: 14px;
        line-height: 1.7;
        color: #8c8c8c;
      }

      .upload-picked {
        margin-top: 12px;
      }

      .attachment-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 14px;
        color: #262626;
      }
      /* ========== 暗色主题适配 ========== */
      :host-context(html[data-theme='dark']) {
        .amount-display {
          border-color: var(--border-color-dark, #334155);
          background-color: var(--bg-secondary-dark, #1e293b);

          .currency {
            color: var(--text-placeholder-dark, #64748b);
          }

          .number {
            color: var(--text-primary-dark, #e2e8f0);
          }

          &.total-amount {
            .number {
              color: var(--primary-color-dark, #60a5fa);
            }
          }

          &.refund-amount {
            .number {
              color: var(--success-color-dark, #4ade80);
            }
          }

          &.repay-amount {
            .number {
              color: var(--error-color-dark, #f87171);
            }
          }
        }

        .editable-tip {
          color: var(--primary-color-dark, #60a5fa);
          background: rgba(96, 165, 250, 0.15);
        }

        .attachment-tip {
          color: var(--text-placeholder-dark, #64748b);
        }

        .upload-zone {
          border-color: var(--border-color-dark, #475569);
          background: var(--bg-secondary-dark, #1e293b);
          color: var(--text-placeholder-dark, #64748b);

          &:hover {
            border-color: var(--primary-color-dark, #60a5fa);
            background: var(--bg-hover-dark, #334155);
          }
        }

        .upload-zone__icon {
          background: rgba(96, 165, 250, 0.15);
          color: var(--primary-color-dark, #60a5fa);
        }

        .upload-zone__title {
          color: var(--text-primary-dark, #e2e8f0);
        }

        .upload-zone__hint {
          color: var(--text-placeholder-dark, #64748b);
        }

        .attachment-list-header {
          color: var(--text-primary-dark, #e2e8f0);
        }

        input {
          background-color: var(--bg-container-dark, #1e293b);
          border-color: var(--border-color-dark, #475569);
          color: var(--text-primary-dark, #e2e8f0);

          &::placeholder {
            color: var(--text-placeholder-dark, #64748b);
          }

          &:focus {
            border-color: var(--primary-color-dark, #60a5fa);
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseSummaryAttachmentComponent implements OnDestroy {
  private readonly message = inject(NzMessageService);
  private readonly previewUrlMap = new Map<string, string>();

  // 汇总数据（支持双向绑定）
  readonly summary = model<ExpenseSummary>(DEFAULT_SUMMARY);
  readonly summaryChange = output<ExpenseSummary>();

  // 单独监听预支金额变化
  readonly advanceAmountChange = output<number>();

  // 附件变化输出
  readonly attachmentsChange = output<ExpenseAttachment[]>();

  // 是否忙碌（禁用操作）
  readonly busy = input(false);

  // 预支金额的独立信号（用于输入框）
  // readonly advanceAmountValue = signal<number>(0);
  readonly advanceAmountValue = signal<number | null>(null);

  // 上传配置
  readonly uploadAccept = UPLOAD_CONFIG.accept;
  readonly uploadMaxSizeText = UPLOAD_CONFIG.maxSizeText;

  // 获取 Math 对象用于模板
  readonly Math = Math;

  constructor() {
    // 同步 summary 中的预支金额到独立信号
    // effect(() => {
    //   // this.advanceAmountValue.set(this.summary().advanceAmount);
    //   const amount = this.summary().advanceAmount;
    //   this.advanceAmountValue.set(amount === 0 ? null : amount);
    // });
  }

  // 附件预览列表（转换格式）
  attachmentPreviewItems(): AttachmentPreviewItem[] {
    return this.summary().attachments.map((att) => ({
      id: att.id,
      name: att.name,
      url: att.url,
      kind: this.getFileKind(att.type),
      meta: this.formatFileSize(att.size),
      removable: true,
    }));
  }

  // 获取文件类型（用于预览组件）
  private getFileKind(fileType: string): AttachmentPreviewKind {
    if (fileType.includes('image')) return 'image';
    if (fileType.includes('video')) return 'video';
    return 'file'; // PDF 和其他文件都归类为 'file'
  }

  // 格式化文件大小
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 验证文件类型
  private validateFileType(file: File): boolean {
    const isValidType = ALLOWED_FILE_TYPES.includes(file.type);
    if (!isValidType) {
      this.message.error('不支持的文件类型，请上传 JPG、PNG 或 PDF 格式的文件');
      return false;
    }
    return true;
  }

  // 验证文件大小
  private validateFileSize(file: File): boolean {
    const isValidSize = file.size <= UPLOAD_CONFIG.maxSize;
    if (!isValidSize) {
      this.message.error(`文件 ${file.name} 大小不能超过 ${UPLOAD_CONFIG.maxSizeText}`);
      return false;
    }
    return true;
  }

  // 预支金额变化
  onAdvanceAmountChange(value: string | number | null): void {
    const rawValue = String(value ?? '').trim();
    this.advanceAmountValue.set(rawValue ? Number(rawValue) : null);
    const numValue = Number(rawValue);
    const finalValue = Number.isFinite(numValue) ? numValue : 0;
    const current = this.summary();
    const updated: ExpenseSummary = {
      ...current,
      advanceAmount: finalValue,
      differenceAmount: finalValue - current.totalAmount,
    };

    this.summary.set(updated);
    this.summaryChange.emit(updated);
    this.advanceAmountChange.emit(finalValue);
  }

  // 更新总金额（由父组件调用，当行程明细变化时）
  updateTotalAmount(totalAmount: number): void {
    const current = this.summary();
    const updated: ExpenseSummary = {
      ...current,
      totalAmount: totalAmount,
      differenceAmount: current.advanceAmount - totalAmount,
    };

    this.summary.set(updated);
    this.summaryChange.emit(updated);
  }

  // 上传前校验
  beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = this.toRawFile(file);
    if (!rawFile) {
      this.message.warning('文件读取失败，请重试');
      return false;
    }

    // 文件类型校验
    if (!this.validateFileType(rawFile)) {
      return false;
    }

    // 文件大小校验
    if (!this.validateFileSize(rawFile)) {
      return false;
    }

    // 文件去重
    const exists = this.summary().attachments.some(
      (att) => att.name === rawFile.name && att.size === rawFile.size
    );
    if (exists) {
      this.message.warning('文件已存在，请勿重复上传');
      return false;
    }

    // 创建预览 URL
    const previewUrl = URL.createObjectURL(rawFile);
    this.previewUrlMap.set(this.fileIdentity(rawFile), previewUrl);

    // 创建附件对象
    const newAttachment: ExpenseAttachment = {
      id: generateId(),
      name: rawFile.name,
      url: previewUrl,
      size: rawFile.size,
      type: rawFile.type,
      uploadTime: new Date(),
    };

    // 添加到附件列表
    const current = this.summary();
    const updated: ExpenseSummary = {
      ...current,
      attachments: [...current.attachments, newAttachment],
    };

    this.summary.set(updated);
    this.summaryChange.emit(updated);
    this.attachmentsChange.emit(updated.attachments);

    this.message.success(`${rawFile.name} 添加成功`);
    return false;
  };

  // 自定义上传请求（模拟上传，实际应该调用真实API）
  readonly customRequest = (item: NzUploadXHRArgs): Subscription => {
    // 这里可以调用真实的上传服务
    // this.uploadService.upload(item.file).subscribe({
    //   next: (response) => {
    //     // 上传成功后更新附件的 URL
    //     this.updateAttachmentUrl(item.file, response.url);
    //     item.onSuccess?.(response, item.file, item);
    //   },
    //   error: (err) => item.onError?.(err, item.file, item),
    // });

    // 模拟成功
    setTimeout(() => {
      item.onSuccess?.({}, item.file, item);
    }, 100);

    return new Subscription();
  };

  // 移除附件
  removeAttachment(attachment: ExpenseAttachment): void {
    // 释放预览 URL
    this.revokePreviewUrl(attachment);

    const current = this.summary();
    const updated: ExpenseSummary = {
      ...current,
      attachments: current.attachments.filter((att) => att.id !== attachment.id),
    };

    this.summary.set(updated);
    this.summaryChange.emit(updated);
    this.attachmentsChange.emit(updated.attachments);

    this.message.success(`${attachment.name} 已移除`);
  }

  // 根据 ID 移除附件
  removeAttachmentById(id: string): void {
    const attachment = this.summary().attachments.find((att) => att.id === id);
    if (attachment) {
      this.removeAttachment(attachment);
    }
  }

  // 清空所有附件
  //   clearAllAttachments(): void {
  //     // 释放所有预览 URL
  //     this.summary().attachments.forEach((att) => {
  //       this.revokePreviewUrl(att);
  //     });

  //     const current = this.summary();
  //     const updated: ExpenseSummary = {
  //       ...current,
  //       attachments: [],
  //     };

  //     this.summary.set(updated);
  //     this.summaryChange.emit(updated);
  //     this.attachmentsChange.emit([]);

  //     this.message.success('已清空所有附件');
  //   }

  // 更新附件 URL（上传成功后调用）
  updateAttachmentUrl(attachmentId: string, newUrl: string): void {
    const current = this.summary();
    const updatedAttachments = current.attachments.map((att) =>
      att.id === attachmentId ? { ...att, url: newUrl } : att
    );

    const updated: ExpenseSummary = {
      ...current,
      attachments: updatedAttachments,
    };

    this.summary.set(updated);
    this.summaryChange.emit(updated);
    this.attachmentsChange.emit(updated.attachments);
  }

  // 重置所有数据
  reset(): void {
    // 释放所有预览 URL
    this.summary().attachments.forEach((att) => {
      this.revokePreviewUrl(att);
    });

    const resetData: ExpenseSummary = {
      totalAmount: 0,
      advanceAmount: 0,
      differenceAmount: 0,
      attachments: [],
    };

    this.summary.set(resetData);
    this.advanceAmountValue.set(null);
    this.summaryChange.emit(resetData);
    this.attachmentsChange.emit([]);
  }

  // 设置数据（用于编辑模式）
  setData(totalAmount: number, advanceAmount: number, attachments: ExpenseAttachment[] = []): void {
    // 清空旧的预览 URL
    this.summary().attachments.forEach((att) => {
      this.revokePreviewUrl(att);
    });

    const data: ExpenseSummary = {
      totalAmount: totalAmount || 0,
      advanceAmount: advanceAmount || 0,
      differenceAmount: (advanceAmount || 0) - (totalAmount || 0),
      attachments: attachments || [],
    };

    this.summary.set(data);
    this.advanceAmountValue.set(data.advanceAmount === 0 ? null : data.advanceAmount);
    this.summaryChange.emit(data);
    this.attachmentsChange.emit(data.attachments);
  }

  // 获取当前数据
  getValue(): ExpenseSummary {
    return this.summary();
  }

  // 清理内存
  ngOnDestroy(): void {
    this.clearPreviewUrls();
  }

  // 辅助方法：转换为原始文件
  private toRawFile(file: NzUploadFile): File | null {
    if (file.originFileObj instanceof File) {
      return file.originFileObj;
    }
    if (file instanceof File) {
      return file;
    }
    return null;
  }

  // 生成文件唯一标识
  private fileIdentity(file: File): string {
    return `${file.name}|${file.size}|${file.lastModified}`;
  }

  // 释放预览 URL
  private revokePreviewUrl(attachment: ExpenseAttachment): void {
    const key = `${attachment.name}|${attachment.size}`;
    const cached = this.previewUrlMap.get(key);
    if (cached) {
      URL.revokeObjectURL(cached);
      this.previewUrlMap.delete(key);
    }
  }

  // 清空所有预览 URL
  private clearPreviewUrls(): void {
    for (const url of this.previewUrlMap.values()) {
      URL.revokeObjectURL(url);
    }
    this.previewUrlMap.clear();
  }
}
