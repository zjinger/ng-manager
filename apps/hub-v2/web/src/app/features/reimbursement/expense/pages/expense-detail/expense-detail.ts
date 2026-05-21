import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AttachmentPreviewWallComponent, AttachmentPreviewKind, AttachmentPreviewItem } from '@app/shared/ui';
import { ExpenseBillPreviewComponent } from '../../components';
import {
  CreateReimbursementClaimInput,
  ReimbursementAttachmentEntity,
  ReimbursementClaimDetail,
  ReimbursementItemEntity,
  ReimbursementItemInput,
} from '@app/features/reimbursement/models/reimbursement.model';
import { ReimbursementApiService } from '@app/features/reimbursement/services/reimbursement-api.service';
import { RecordListComponent } from '@app/features/reimbursement/travel-expense/components/record-list/record-list.component';
import { ApprovalFlowComponent } from '@app/features/reimbursement/travel-expense/components/approval-flow/approval-flow.component';
import { ProcessHeaderCardComponent } from '@app/features/reimbursement/travel-expense/components/process-header-card/process-header-card.component';

// 默认表单数据常量
const DEFAULT_FORM_DATA: CreateReimbursementClaimInput = {
  claimType: 'travel',
  departmentId: '',
  departmentName: '',
  applicantName: '',
  titleName: '',
  reason: '',
  fillDate: '',
  advanceAmount: 0,
  travelStartDate: null,
  travelStartHalf: null,
  travelEndDate: null,
  travelEndHalf: null,
  travelDays: null,
  receiptCount: null,
  items: [],
};

// 文件大小单位
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];
const FILE_SIZE_BASE = 1024;

@Component({
  selector: 'app-expense-detail',
  standalone: true,
  imports: [
    NzButtonComponent,
    NzIconModule,
    ExpenseBillPreviewComponent,
    AttachmentPreviewWallComponent,
    RecordListComponent,
    ApprovalFlowComponent,
    ProcessHeaderCardComponent,
  ],
  templateUrl: './expense-detail.html',
  styleUrls: ['./expense-detail.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseDetail implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);
  private readonly reimbursementApi = inject(ReimbursementApiService);

  /** 单据ID */
  private readonly expenseId = this.route.snapshot.paramMap.get('id');

  /** 详情数据 */
  readonly detailData = signal<ReimbursementClaimDetail | null>(null);

  /** 顶部信息 */
  readonly headerData = computed(() => this.detailData());

  /** 表单数据 */
  readonly formData = computed<CreateReimbursementClaimInput>(() => {
    const detail = this.detailData();
    return detail ? this.mapDetailToFormData(detail) : DEFAULT_FORM_DATA;
  });

  /** 附件列表 */
  readonly attachmentItems = computed<AttachmentPreviewItem[]>(() => {
    const attachments = this.detailData()?.attachments ?? [];
    return attachments.map(this.mapAttachmentToPreviewItem);
  });

  /** 是否有附件 */
  readonly hasAttachments = computed(() => this.attachmentItems().length > 0);

  /** 操作记录 */
  readonly recordListData = computed(() => this.detailData()?.logs ?? []);

  /** 审批流 */
  readonly approvalPreview = computed(() => this.detailData()?.approvalPreview ?? null);

  ngOnInit(): void {
    this.loadDetailData();
  }

  /** 加载详情 */
  private loadDetailData(): void {
    if (!this.expenseId) {
      this.message.error('缺少报销单ID');
      return;
    }

    this.reimbursementApi.getClaimById(this.expenseId).subscribe({
      next: (detail) => this.detailData.set(detail),
      error: (error) => {
        console.error(error);
        this.message.error('加载详情失败');
      },
    });
  }

  /** 返回上一页 */
  goBack(): void {
    window.history.back();
  }

  /** 编辑单据 */
  goEdit(): void {
    this.router.navigate(['/expense/edit', this.expenseId]);
  }

  /** 将详情数据转换为表单数据 */
  private mapDetailToFormData(detail: ReimbursementClaimDetail): CreateReimbursementClaimInput {
    return {
      claimType: detail.claimType,
      departmentId: detail.departmentId,
      departmentName: detail.departmentName,
      applicantName: detail.applicantName,
      titleName: detail.applicantTitleName,
      reason: detail.reason,
      fillDate: detail.fillDate,
      advanceAmount: detail.advanceAmount,
      travelStartDate: detail.travelStartDate,
      travelStartHalf: detail.travelStartHalf,
      travelEndDate: detail.travelEndDate,
      travelEndHalf: detail.travelEndHalf,
      travelDays: detail.travelDays,
      receiptCount: detail.receiptCount,
      items: detail.items.map(this.mapItemToInput),
    };
  }

  /** 将费用项目实体转换为输入格式 */
  private mapItemToInput = (item: ReimbursementItemEntity): ReimbursementItemInput => ({
    id: item.id,
    itemType: item.itemType,
    category: item.category,
    description: item.description,
    occurredDate: item.occurredDate,
    startDate: item.startDate,
    endDate: item.endDate,
    fromLocation: item.fromLocation,
    toLocation: item.toLocation,
    amount: item.amount,
    meta: item.meta,
    sort: item.sort,
  });

  /** 将附件实体转换为预览组件所需格式 */
  private mapAttachmentToPreviewItem = (att: ReimbursementAttachmentEntity): AttachmentPreviewItem => ({
    id: att.id || '',
    name: att.originalName || att.fileName || '附件',
    url: `/api/admin/uploads/${att.uploadId}/raw`,
    kind: this.getFileKindByMimeType(att.mimeType || ''),
    meta: this.formatFileSize(att.fileSize || 0),
    removable: false,
  });

  /** 根据MIME类型获取文件展示类型 */
  private getFileKindByMimeType(mimeType: string): AttachmentPreviewKind {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'file';
  }

  /** 格式化文件大小 */
  private formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';

    const exponent = Math.floor(Math.log(bytes) / Math.log(FILE_SIZE_BASE));
    const size = (bytes / Math.pow(FILE_SIZE_BASE, exponent)).toFixed(2);
    return `${size} ${FILE_SIZE_UNITS[exponent]}`;
  }
}