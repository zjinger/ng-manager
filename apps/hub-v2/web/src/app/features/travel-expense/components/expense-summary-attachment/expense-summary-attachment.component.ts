import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';

import { Subscription } from 'rxjs';

import {
  AttachmentPreviewKind,
  AttachmentPreviewItem,
  AttachmentPreviewWallComponent,
} from '@app/shared/ui';

import { ExpenseAttachment, ExpenseSummary } from '../../models';

const DEFAULT_SUMMARY: ExpenseSummary = {
  totalAmount: 0,
  advanceAmount: 0,
  differenceAmount: 0,
  attachments: [],
};

/**
 * 上传配置
 */
const UPLOAD_CONFIG = {
  accept: 'image/jpeg,image/jpg,image/png,application/pdf',
  maxSize: 10 * 1024 * 1024,
  maxSizeText: '10MB',
};

/**
 * 支持文件类型
 */
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

/**
 * 生成唯一ID
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

@Component({
  selector: 'app-expense-summary-attachment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzIconModule,
    NzUploadModule,
    AttachmentPreviewWallComponent,
  ],
  template: `
    <form nz-form nzLayout="vertical">
      <!-- 金额区域 -->
      <div class="row" nz-row [nzGutter]="16">
        <!-- 总金额 -->
        <div class="col" nz-col [nzSpan]="8">
          <nz-form-item>
            <nz-form-label>总计金额</nz-form-label>

            <nz-form-control>
              <div class="amount-display total-amount">
                <span class="currency">¥</span>

                <span class="number">
                  {{ summary().totalAmount | number : '1.2-2' }}
                </span>
              </div>
            </nz-form-control>
          </nz-form-item>
        </div>

        <!-- 预支金额 -->
        <div class="col" nz-col [nzSpan]="8">
          <nz-form-item>
            <nz-form-label>
              预支金额

              <span class="editable-tip"> 可编辑 </span>
            </nz-form-label>

            <nz-form-control>
              <input
                nz-input
                type="number"
                inputmode="decimal"
                placeholder="请输入预支金额"
                [ngModel]="summary().advanceAmount || null"
                (ngModelChange)="onAdvanceAmountChange($event)"
                name="advanceAmount"
              />
            </nz-form-control>
          </nz-form-item>
        </div>

        <!-- 应退/应补 -->
        <div class="col" nz-col [nzSpan]="8">
          <nz-form-item>
            <nz-form-label>
              {{ differenceAmount() >= 0 ? '应退金额' : '应补金额' }}
            </nz-form-label>

            <nz-form-control>
              <div
                class="amount-display"
                [class.refund-amount]="differenceAmount() >= 0"
                [class.repay-amount]="differenceAmount() < 0"
              >
                <span class="currency">¥</span>

                <span class="number">
                  {{ Math.abs(differenceAmount()) | number : '1.2-2' }}
                </span>
              </div>
            </nz-form-control>
          </nz-form-item>
        </div>
      </div>

      <!-- 上传区域 -->
      <div class="row" nz-row [nzGutter]="16">
        <div class="col" nz-col [nzSpan]="24">
          <nz-form-item>
            <nz-form-label>
              附件材料

              <span class="attachment-tip"> 支持 JPG、PNG、PDF 格式 </span>
            </nz-form-label>

            <nz-form-control>
              <nz-upload
                nzType="drag"
                class="upload-zone"
                [nzMultiple]="true"
                [nzShowUploadList]="false"
                [nzAccept]="uploadAccept"
                [nzDisabled]="busy()"
                [nzBeforeUpload]="beforeUpload"
                [nzCustomRequest]="customRequest"
              >
                <p class="upload-zone__icon">
                  <nz-icon nzType="plus" />
                </p>

                <div class="upload-zone__title">点击或拖拽文件到此区域上传</div>

                <div class="upload-zone__hint">
                  支持 JPG、PNG、PDF 格式， 单个文件最大 {{ uploadMaxSizeText }}
                </div>
              </nz-upload>

              @if (attachmentPreviewItems().length > 0) {
              <div class="upload-picked">
                <div class="attachment-list-header">
                  已上传文件（{{ attachmentPreviewItems().length }}）
                </div>

                <app-attachment-preview-wall
                  [items]="attachmentPreviewItems()"
                  [showMeta]="true"
                  [removeDisabled]="busy()"
                  (remove)="removeAttachmentById($event)"
                />
              </div>
              }
            </nz-form-control>
          </nz-form-item>
        </div>
      </div>
    </form>
  `,
  styles: [
    `
      .row {
        margin-bottom: 0;
      }

      .amount-display {
        display: flex;
        align-items: baseline;
        padding: 4px 11px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        font-weight: 600;

        .currency {
          margin-right: 4px;
          font-size: 14px;
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
        margin-left: 8px;
        padding: 2px 6px;
        border-radius: 4px;
        background: #e6f7ff;
        color: #1890ff;
        font-size: 12px;
        font-weight: normal;
      }

      .attachment-tip {
        margin-left: 8px;
        color: #8c8c8c;
        font-size: 12px;
        font-weight: normal;
      }

      .upload-zone {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 24px;
        min-height: 180px;
        border-radius: 18px;
        border: 1px dashed #d9d9d9;
        background: #fafafa;
        transition: all 0.3s;
        cursor: pointer;
        text-align: center;

        &:hover {
          border-color: #1890ff;
          background: #f5f5f5;
        }
      }

      .upload-zone__icon {
        width: 52px;
        height: 52px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(24, 144, 255, 0.1);
        color: #1890ff;
      }

      .upload-zone__icon > span[nz-icon] {
        font-size: 28px;
      }

      .upload-zone__title {
        margin-top: 12px;
        font-size: 16px;
        font-weight: 600;
        color: #262626;
      }

      .upload-zone__hint {
        margin-top: 8px;
        max-width: 360px;
        line-height: 1.7;
        font-size: 14px;
        color: #8c8c8c;
      }

      .upload-picked {
        margin-top: 16px;
      }

      .attachment-list-header {
        margin-bottom: 12px;
        font-size: 14px;
        color: #262626;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseSummaryAttachmentComponent implements OnDestroy {
  private readonly message = inject(NzMessageService);

  /**
   * 预览URL缓存
   */
  private readonly previewUrlMap = new Map<string, string>();

  /**
   * 表单数据（唯一状态源）
   */
  readonly summary = model<ExpenseSummary>(DEFAULT_SUMMARY);

  /**
   * 输出
   */
  readonly summaryChange = output<ExpenseSummary>();

  readonly attachmentsChange = output<ExpenseAttachment[]>();

  readonly advanceAmountChange = output<number>();

  /**
   * 忙碌状态
   */
  readonly busy = input(false);

  /**
   * 上传配置
   */
  readonly uploadAccept = UPLOAD_CONFIG.accept;

  readonly uploadMaxSizeText = UPLOAD_CONFIG.maxSizeText;

  /**
   * 模板使用
   */
  readonly Math = Math;

  /**
   * 差额
   */
  readonly differenceAmount = computed(() => {
    // return this.summary().differenceAmount ?? 0;
    const summary = this.summary();
    return (
      (summary.advanceAmount ?? 0) -
      (summary.totalAmount ?? 0)
    );
  });

  /**
   * 附件预览列表
   */
  readonly attachmentPreviewItems = computed<AttachmentPreviewItem[]>(() => {
    return this.summary().attachments.map((att) => ({
      id: att.id,
      name: att.name,
      url: att.url,
      kind: this.getFileKind(att.type),
      meta: this.formatFileSize(att.size),
      removable: true,
    }));
  });

  /**
   * 预支金额变化
   */
  onAdvanceAmountChange(value: string | number | null): void {
    const amount = Number(value ?? 0);

    const finalAmount = Number.isFinite(amount) ? amount : 0;

    const current = this.summary();

    const updated: ExpenseSummary = {
      ...current,
      advanceAmount: finalAmount,
      differenceAmount: finalAmount - current.totalAmount,
    };

    this.updateSummary(updated);
  }

  /**
   * 更新总金额
   */
  updateTotalAmount(totalAmount: number): void {
    const current = this.summary();

    const updated: ExpenseSummary = {
      ...current,
      totalAmount,
      differenceAmount: current.advanceAmount - totalAmount,
    };

    this.updateSummary(updated);
  }

  /**
   * 上传前校验
   */
  readonly beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = this.toRawFile(file);

    if (!rawFile) {
      this.message.error('文件读取失败');
      return false;
    }

    if (!this.validateFileType(rawFile)) {
      return false;
    }

    if (!this.validateFileSize(rawFile)) {
      return false;
    }

    const exists = this.summary().attachments.some(
      (att) => att.name === rawFile.name && att.size === rawFile.size
    );

    if (exists) {
      this.message.warning('文件已存在');
      return false;
    }

    const previewUrl = URL.createObjectURL(rawFile);

    this.previewUrlMap.set(this.fileIdentity(rawFile), previewUrl);

    const newAttachment: ExpenseAttachment = {
      id: generateId(),
      name: rawFile.name,
      url: previewUrl,
      type: rawFile.type,
      size: rawFile.size,
      uploadTime: new Date(),
    };

    const updated: ExpenseSummary = {
      ...this.summary(),
      attachments: [...this.summary().attachments, newAttachment],
    };

    this.updateSummary(updated);

    this.message.success(`${rawFile.name} 上传成功`);

    return false;
  };

  /**
   * 自定义上传
   */
  readonly customRequest = (item: NzUploadXHRArgs): Subscription => {
    setTimeout(() => {
      item.onSuccess?.({}, item.file, item);
    }, 100);

    return new Subscription();
  };

  /**
   * 删除附件
   */
  removeAttachmentById(id: string): void {
    const attachment = this.summary().attachments.find((item) => item.id === id);

    if (!attachment) {
      return;
    }

    this.revokePreviewUrl(attachment);

    const updated: ExpenseSummary = {
      ...this.summary(),
      attachments: this.summary().attachments.filter((item) => item.id !== id),
    };

    this.updateSummary(updated);

    this.message.success(`${attachment.name} 已删除`);
  }

  /**
   * 统一更新 summary
   */
  private updateSummary(summary: ExpenseSummary): void {
    this.summary.set(summary);

    this.summaryChange.emit(summary);

    this.attachmentsChange.emit(summary.attachments);

    this.advanceAmountChange.emit(summary.advanceAmount);
  }

  /**
   * 文件类型校验
   */
  private validateFileType(file: File): boolean {
    const valid = ALLOWED_FILE_TYPES.includes(file.type);

    if (!valid) {
      this.message.error('仅支持 JPG、PNG、PDF 格式');
    }

    return valid;
  }

  /**
   * 文件大小校验
   */
  private validateFileSize(file: File): boolean {
    const valid = file.size <= UPLOAD_CONFIG.maxSize;

    if (!valid) {
      this.message.error(`文件大小不能超过 ${UPLOAD_CONFIG.maxSizeText}`);
    }

    return valid;
  }

  /**
   * 文件类型映射
   */
  private getFileKind(type: string): AttachmentPreviewKind {
    if (type.includes('image')) {
      return 'image';
    }

    if (type.includes('video')) {
      return 'video';
    }

    return 'file';
  }

  /**
   * 文件大小格式化
   */
  private formatFileSize(bytes: number): string {
    if (!bytes) {
      return '0 B';
    }

    const unit = 1024;

    const sizes = ['B', 'KB', 'MB', 'GB'];

    const index = Math.floor(Math.log(bytes) / Math.log(unit));

    return `${parseFloat((bytes / Math.pow(unit, index)).toFixed(2))} ${sizes[index]}`;
  }

  /**
   * 转换原始文件
   */
  private toRawFile(file: NzUploadFile): File | null {
    if (file.originFileObj instanceof File) {
      return file.originFileObj;
    }

    if (file instanceof File) {
      return file;
    }

    return null;
  }

  /**
   * 文件唯一标识
   */
  private fileIdentity(file: File): string {
    return `${file.name}|${file.size}|${file.lastModified}`;
  }

  /**
   * 释放预览URL
   */
  private revokePreviewUrl(attachment: ExpenseAttachment): void {
    const key = `${attachment.name}|${attachment.size}`;

    const url = this.previewUrlMap.get(key);

    if (!url) {
      return;
    }

    URL.revokeObjectURL(url);

    this.previewUrlMap.delete(key);
  }

  /**
   * 清理URL
   */
  private clearPreviewUrls(): void {
    for (const url of this.previewUrlMap.values()) {
      URL.revokeObjectURL(url);
    }

    this.previewUrlMap.clear();
  }

  /**
   * 销毁
   */
  ngOnDestroy(): void {
    this.clearPreviewUrls();
  }
}
