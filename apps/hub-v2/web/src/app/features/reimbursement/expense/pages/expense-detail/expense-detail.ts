import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  AttachmentPreviewItem,
  AttachmentPreviewKind,
  AttachmentPreviewWallComponent,
} from '@app/shared/ui';
import { ExpenseBillPreviewComponent } from '../../components';
import { ExpenseCollect } from '../../models';
import { ExpenseMockDetailData } from '../../models/detail';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ApprovalFlowComponent } from '@app/features/reimbursement/travel-expense/components/approval-flow/approval-flow.component';
import { MockRecordListData } from '@app/features/reimbursement/travel-expense/models/detail';
import { ProcessOperationRecord, RecordListComponent } from '@app/features/reimbursement/travel-expense/components/record-list/record-list.component';
import { ProcessHeaderCardComponent } from '@app/features/reimbursement/travel-expense/components/process-header-card/process-header-card.component';

@Component({
  selector: 'app-expense-detail',
  standalone: true,
  imports: [
    NzButtonComponent,
    ProcessHeaderCardComponent,
    ExpenseBillPreviewComponent,
    AttachmentPreviewWallComponent,
    RecordListComponent,
    ApprovalFlowComponent,
    NzIconModule,
  ],
  templateUrl: './expense-detail.html',
  styleUrls: ['./expense-detail.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseDetail {
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
  readonly detailData = signal<ExpenseCollect | null>(null);

  /**
   * 操作记录
   */
  readonly recordListData = signal<ProcessOperationRecord[]>(MockRecordListData);

  /**
   * header
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
   * 是否有附件
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

      this.detailData.set(ExpenseMockDetailData);
    } catch (error) {
      this.message.error('加载详情失败');
    }
  }

  goBack(): void {
    window.history.back();
  }
  goEdit(): void {
    this.router.navigate(['/expense/edit', this.expenseId]);
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
