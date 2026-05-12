import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  AttachmentPreviewItem,
  AttachmentPreviewKind,
  AttachmentPreviewWallComponent,
} from '@app/shared/ui';
import { ApprovalFlowComponent } from '../../components/approval-flow/approval-flow.component';
import { ExpensePreviewComponent } from '../../components/expense-preview/expense-preview.component';
import { ProcessHeaderCardComponent } from '../../components/process-header-card/process-header-card.component';
import {
  ProcessOperationRecord,
  RecordListComponent,
} from '../../components/record-list/record-list.component';
import { TravelExpenseDetailData } from '../../models';
import { MockDetailData, MockRecordListData } from '../../models/detail';

@Component({
  selector: 'app-travel-expense-detail',
  standalone: true,
  imports: [
    NzButtonComponent,
    ProcessHeaderCardComponent,
    ExpensePreviewComponent,
    AttachmentPreviewWallComponent,
    ApprovalFlowComponent,
    RecordListComponent,
  ],
  templateUrl: './travel-expense-detail.html',
  styleUrls: ['./travel-expense-detail.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelExpenseDetail {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);

  /**
   * 路由参数
   */
  private readonly expenseId = this.route.snapshot.paramMap.get('id');

  /**
   * 页面主数据
   */
  readonly detailData = signal<TravelExpenseDetailData | null>(null);

  /**
   * 操作记录
   */
  readonly recordListData = signal<ProcessOperationRecord[]>(MockRecordListData);

  /**
   * header数据
   */
  readonly headerData = computed(() => {
    return this.detailData()?.header ?? {};
  });

  /**
   * 基础信息
   */
  readonly basicInfo = computed(() => {
    return this.detailData()?.basicInfo ?? null;
  });

  /**
   * 费用明细
   */
  readonly expenseItems = computed(() => {
    return this.detailData()?.expenseItems ?? [];
  });

  /**
   * 汇总信息
   */
  readonly summary = computed(() => {
    return this.detailData()?.summary ?? null;
  });

  /**
   * 附件列表
   */
  readonly attachmentItems = computed<AttachmentPreviewItem[]>(() => {
    const attachments = this.summary()?.attachments ?? [];

    return attachments.map((att) => ({
      id: att.id,
      name: att.name,
      url: att.url,
      kind: this.getFileKind(att.type),
      meta: this.formatFileSize(att.size),
      removable: false,
    }));
  });

  /**
   * 是否存在附件
   */
  readonly hasAttachments = computed(() => {
    return this.attachmentItems().length > 0;
  });

  constructor() {
    this.loadDetailData();
  }

  /**
   * 加载详情
   */
  private loadDetailData(): void {
    try {
      // TODO:
      // this.api.getDetail(this.expenseId)

      this.detailData.set(MockDetailData);
    } catch (error) {
      this.message.error('详情加载失败');
    }
  }

  /**
   * 返回
   */
  goBack(): void {
    window.history.back();
  }

  /**
   * 编辑
   */
  goEdit(): void {
    this.router.navigate(['/travel-expense/edit', this.expenseId]);
  }

  /**
   * 文件类型转换
   */
  private getFileKind(fileType: string): AttachmentPreviewKind {
    if (fileType.includes('image')) {
      return 'image';
    }
    if (fileType.includes('video')) {
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
}
