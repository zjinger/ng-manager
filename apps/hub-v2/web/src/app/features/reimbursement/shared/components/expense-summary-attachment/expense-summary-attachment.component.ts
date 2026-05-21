import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';

import { Subscription, lastValueFrom } from 'rxjs';

import {
  AttachmentPreviewKind,
  AttachmentPreviewItem,
  AttachmentPreviewWallComponent,
} from '@app/shared/ui';

import { formatUploadSizeLimit, UPLOAD_TARGETS, validateUploadFile } from '@shared/constants';

import type { ExpenseSummary } from '../../models/expense-summary.model';
import { ReimbursementUploadService } from '@app/shared/services/reimbursement-upload.service';
import {
  ReimbursementAttachmentEntity,
  ReimbursementAttachmentCategory,
} from '@app/features/reimbursement/models/reimbursement.model';
import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';

const DEFAULT_SUMMARY: ExpenseSummary = {
  totalAmount: 0,
  advanceAmount: 0,
  differenceAmount: 0,
  attachments: [],
};

// 使用策略配置
const UPLOAD_POLICY = UPLOAD_TARGETS.reimbursementAttachment;

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

              <!-- <span class="editable-tip"> 可编辑 </span> -->
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

              <span class="attachment-tip"> {{ uploadHintText }} </span>
            </nz-form-label>

            <nz-form-control>
              <!-- 添加上传中状态提示 -->
              @if (uploading()) {
              <div class="uploading-tip">
                <nz-icon nzType="loading" />
                正在上传中，请稍候...
              </div>
              }

              <nz-upload
                nzType="drag"
                class="upload-zone"
                [nzMultiple]="true"
                [nzShowUploadList]="false"
                [nzAccept]="uploadAccept"
                [nzDisabled]="busy() || uploading()"
                [nzBeforeUpload]="beforeUpload"
                [nzCustomRequest]="customRequest"
              >
                <p class="upload-zone__icon">
                  <nz-icon nzType="plus" />
                </p>

                <div class="upload-zone__title">点击或拖拽文件到此区域上传</div>

                <div class="upload-zone__hint">
                  {{ uploadHintText }}，单个文件最大 {{ uploadSizeLimit }}
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
                  [removeDisabled]="busy() || uploading()"
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
        border: 1px solid var(--border-color);
        background: var(--bg-subtle);
        font-weight: 600;

        .currency {
          margin-right: 4px;
          font-size: 14px;
          color: var(--text-muted);
        }

        .number {
          color: var(--text-primary);
        }

        &.total-amount {
          .number {
            color: var(--primary-600);
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
        background: color-mix(in srgb, var(--primary-500) 12%, transparent);
        color: var(--primary-600);
        font-size: 12px;
        font-weight: normal;
      }

      .attachment-tip {
        margin-left: 8px;
        color: var(--text-muted);
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
        border: 1px dashed var(--border-color);
        background: var(--bg-subtle);
        transition: all 0.3s;
        cursor: pointer;
        text-align: center;

        &:hover {
          border-color: var(--primary-500);
          background: color-mix(in srgb, var(--primary-500) 6%, var(--bg-subtle));
        }
      }

      :host ::ng-deep .upload-zone.ant-upload-wrapper .ant-upload-drag {
        border-color: var(--border-color);
        background: var(--bg-subtle);
      }

      :host ::ng-deep .upload-zone.ant-upload-wrapper .ant-upload-drag-hover,
      :host ::ng-deep .upload-zone.ant-upload-wrapper .ant-upload-drag:hover {
        border-color: var(--primary-500);
        background: color-mix(in srgb, var(--primary-500) 6%, var(--bg-subtle));
      }

      :host ::ng-deep .upload-zone.ant-upload-wrapper .ant-upload-btn {
        color: var(--text-primary);
      }

      .upload-zone__icon {
        width: 52px;
        height: 52px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--primary-500) 14%, transparent);
        color: var(--primary-600);
      }

      .upload-zone__icon > span[nz-icon] {
        font-size: 28px;
      }

      .upload-zone__title {
        margin-top: 12px;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .upload-zone__hint {
        margin-top: 8px;
        max-width: 360px;
        line-height: 1.7;
        font-size: 14px;
        color: var(--text-muted);
      }

      .upload-picked {
        margin-top: 16px;
      }

      .attachment-list-header {
        margin-bottom: 12px;
        font-size: 14px;
        color: var(--text-primary);
      }

      .uploading-tip {
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        background: color-mix(in srgb, var(--primary-500) 12%, transparent);
        color: var(--primary-600);
        font-size: 14px;
      }

      :host-context(html[data-theme='dark']) {
        .amount-display,
        .upload-zone,
        ::ng-deep .upload-zone.ant-upload-wrapper .ant-upload-drag {
          border-color: var(--border-color);
          background: color-mix(in srgb, var(--bg-container) 78%, var(--bg-subtle));
        }

        .upload-zone:hover,
        ::ng-deep .upload-zone.ant-upload-wrapper .ant-upload-drag-hover,
        ::ng-deep .upload-zone.ant-upload-wrapper .ant-upload-drag:hover {
          border-color: var(--primary-400);
          background: color-mix(in srgb, var(--primary-500) 10%, var(--bg-container));
        }

        .upload-zone__icon {
          color: var(--primary-300);
          background: color-mix(in srgb, var(--primary-500) 20%, transparent);
        }
      }

      .uploading-tip nz-icon {
        margin-right: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseSummaryAttachmentComponent implements OnDestroy {
  private readonly message = inject(NzMessageService);
  private readonly reimbursementUpload = inject(ReimbursementUploadService);
  private readonly reimbursementApi = inject(ReimbursementApiService);

  /**
   * 预览URL缓存
   */
  private readonly previewUrlMap = new Map<string, string>();

  /**
   * 上传中的状态
   */
  readonly uploading = signal(false);

  /**
   * 表单数据（唯一状态源）
   */
  readonly summary = model<ExpenseSummary>(DEFAULT_SUMMARY);

  /**
   * 输出
   */
  readonly summaryChange = output<ExpenseSummary>();
  readonly attachmentsChange = output<ReimbursementAttachmentEntity[]>();
  readonly advanceAmountChange = output<number>();

  /**
   * 忙碌状态
   */
  readonly busy = input(false);

  /**
   * 附件分类（可选，默认为 'other'）
   */
  readonly attachmentCategory = input<ReimbursementAttachmentCategory>('other');

  /**
   * 报销单ID（用于绑定附件）
   */
  readonly claimId = input<string | null>(null);

  /**
   * 上传策略配置
   */
  readonly uploadPolicy = UPLOAD_POLICY;
  readonly uploadAccept = this.uploadPolicy.accept;
  readonly uploadSizeLimit = formatUploadSizeLimit(this.uploadPolicy);
  readonly uploadHintText = this.uploadPolicy.invalidTypeMessage;

  /**
   * 模板使用
   */
  readonly Math = Math;

  /**
   * 差额
   */
  readonly differenceAmount = computed(() => {
    const summary = this.summary();
    return (summary.advanceAmount ?? 0) - (summary.totalAmount ?? 0);
  });

  /**
   * 附件预览列表
   */
  readonly attachmentPreviewItems = computed<AttachmentPreviewItem[]>(() => {
    return this.summary().attachments.map((att) => ({
      id: att.id!,
      name: att.originalName || att.fileName || '未知文件',
      url: `/api/admin/uploads/${att.uploadId}/raw`,
      kind: this.getFileKind(att.mimeType || ''),
      meta: this.formatFileSize(att.fileSize || 0),
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

    this.updateSummary(updated, { skipAttachments: true });
  }

  /**
   * 更新总金额（由外部调用）
   */
  updateTotalAmount(totalAmount: number): void {
    const current = this.summary();

    const updated: ExpenseSummary = {
      ...current,
      totalAmount,
      differenceAmount: current.advanceAmount - totalAmount,
    };

    // 总金额变化只更新 summary，不触发附件和预支金额变化
    this.updateSummary(updated, { skipAttachments: true, skipAdvance: true });
  }

  /**
   * 上传前校验
   */
  readonly beforeUpload = async (file: NzUploadFile): Promise<boolean> => {
    const rawFile = this.toRawFile(file);

    if (!rawFile) {
      this.message.error('文件读取失败');
      return false;
    }

    // 使用策略进行校验
    const validationMessage = validateUploadFile(rawFile, this.uploadPolicy);
    if (validationMessage) {
      this.message.error(validationMessage);
      return false;
    }

    const exists = this.summary().attachments.some(
      (att) => att.originalName === rawFile.name && att.fileSize === rawFile.size
    );

    if (exists) {
      this.message.warning('文件已存在');
      return false;
    }

    // 开始上传
    this.uploading.set(true);

    let tempId = '';

    try {
      tempId = generateId();
      const previewUrl = URL.createObjectURL(rawFile);
      this.previewUrlMap.set(this.fileIdentity(rawFile), previewUrl);

      // 添加临时附件（上传中状态）
      const tempAttachment: ReimbursementAttachmentEntity & {
        uploading: boolean;
        tempUrl: string;
      } = {
        id: tempId,
        originalName: rawFile.name,
        fileName: previewUrl,
        mimeType: rawFile.type,
        fileSize: rawFile.size,
        category: this.attachmentCategory(),
        uploading: true,
        tempUrl: previewUrl,
        createdAt: new Date().toISOString(),
      };

      const updatedWithTemp = {
        ...this.summary(),
        attachments: [...this.summary().attachments, tempAttachment],
      };
      // 添加临时附件，需要触发 attachmentsChange
      this.updateSummary(updatedWithTemp);

      // 实际上传到服务器（获取 uploadId）
      const result = await this.reimbursementUpload.uploadReimbursementFile(rawFile);
      const uploadId = result.uploadId;
      const serverUrl = result.fileUrl;

      // 如果有 claimId，调用 attachUpload 绑定附件到报销单
      const currentClaimId = this.claimId();
      if (currentClaimId) {
        try {
          await lastValueFrom(
            this.reimbursementApi.attachUpload(currentClaimId, {
              uploadId: uploadId,
              category: this.attachmentCategory(),
            })
          );
        } catch (attachError) {
          console.error('绑定附件失败:', attachError);
          this.message.warning('文件已上传但绑定失败，请稍后重试');
          // 上传成功但绑定失败，不移除文件，让用户可以重试
        }
      }

      // 上传成功，更新附件信息
      const finalAttachment: ReimbursementAttachmentEntity = {
        id: tempId,
        uploadId: uploadId,
        originalName: rawFile.name,
        fileName: serverUrl,
        mimeType: rawFile.type,
        fileSize: rawFile.size,
        category: this.attachmentCategory(),
        createdAt: new Date().toISOString(),
      };

      const updatedWithFinal = {
        ...this.summary(),
        attachments: this.summary().attachments.map((att) =>
          att.id === tempId ? finalAttachment : att
        ),
      };
      // 更新最终附件，需要触发 attachmentsChange
      this.updateSummary(updatedWithFinal);

      this.message.success(`${rawFile.name} 上传成功`);
    } catch (error) {
      // 上传失败，移除临时附件
      const updated = {
        ...this.summary(),
        attachments: this.summary().attachments.filter((att) => att.id !== tempId),
      };
      // 移除临时附件，需要触发 attachmentsChange
      this.updateSummary(updated);

      const errorMessage = error instanceof Error ? error.message : '文件上传失败';
      this.message.error(`${rawFile.name} ${errorMessage}`);
    } finally {
      this.uploading.set(false);
    }

    return false;
  };

  /**
   * 自定义上传（不做实际请求，因为已经在 beforeUpload 中处理了）
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
  async removeAttachmentById(id: string): Promise<void> {
    const attachment:any = this.summary().attachments.find((item) => item.id === id);
    if (!attachment) {
      return;
    }
    // 如果是上传中的附件，直接移除
    if ((attachment as any).uploading) {
      this.revokePreviewUrlByUrl((attachment as any).tempUrl);
      const updated = {
        ...this.summary(),
        attachments: this.summary().attachments.filter((item) => item.id !== id),
      };
      this.updateSummary(updated);
      this.message.info('已取消上传');
      return;
    }

    // 已上传的附件，需要调用 detachUpload 解绑
    const currentClaimId = this.claimId();
    if (currentClaimId && attachment.uploadId) {
      try {
        await lastValueFrom(
          this.reimbursementApi.detachUpload(currentClaimId, attachment.id)
        );
      } catch (detachError) {
        console.error('解绑附件失败:', detachError);
        this.message.error('删除附件失败，请重试');
        return;
      }
    }

    // 释放预览URL
    if (attachment.fileName) {
      this.revokePreviewUrlByUrl(attachment.fileName);
    }

    const updated: ExpenseSummary = {
      ...this.summary(),
      attachments: this.summary().attachments.filter((item) => item.id !== id),
    };

    this.updateSummary(updated);
    this.message.success(`${attachment.originalName || attachment.fileName} 已删除`);
  }

  /**
   * 设置附件列表（外部设置时使用）
   */
  setAttachments(attachments: ReimbursementAttachmentEntity[]): void {
    const current = this.summary();
    const updated: ExpenseSummary = {
      ...current,
      attachments,
    };
    this.updateSummary(updated);
  }

  /**
   * 获取所有附件（供外部使用）
   */
  getAttachments(): ReimbursementAttachmentEntity[] {
    return this.summary().attachments;
  }

  /**
   * 统一更新 summary
   */
  private updateSummary(
    summary: ExpenseSummary,
    emitOptions?: { skipAttachments?: boolean; skipAdvance?: boolean }
  ): void {
    this.summary.set(summary);
    this.summaryChange.emit(summary);

    if (!emitOptions?.skipAttachments) {
      this.attachmentsChange.emit(summary.attachments as ReimbursementAttachmentEntity[]);
    }

    if (!emitOptions?.skipAdvance) {
      this.advanceAmountChange.emit(summary.advanceAmount);
    }
  }

  /**
   * 文件类型映射
   */
  private getFileKind(mimeType: string): AttachmentPreviewKind {
    if (mimeType.includes('image')) {
      return 'image';
    }
    if (mimeType.includes('video')) {
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
  private revokePreviewUrlByUrl(url: string): void {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    // 从 map 中删除
    for (const [key, value] of this.previewUrlMap.entries()) {
      if (value === url) {
        this.previewUrlMap.delete(key);
        break;
      }
    }
  }

  /**
   * 清理URL
   */
  private clearPreviewUrls(): void {
    for (const url of this.previewUrlMap.values()) {
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
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
