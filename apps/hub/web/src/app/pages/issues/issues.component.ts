import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, debounceTime, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { AttachmentCardItem, AttachmentCardListComponent } from '../../shared/components';
import { HubDateTimePipe } from '../../shared/pipes/date-time.pipe';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import { AttachmentPolicyResult, IssueActionType, IssueAttachmentDto, IssueCloseReasonType, IssueDetailResult, IssueItem, IssueListResult, IssuePriority, IssueStatus, IssueType, ProjectMemberItem, ProjectOption } from './issues.model';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-issues-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzDescriptionsModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzUploadModule,
    PageHeaderComponent,
    AttachmentCardListComponent,
    HubDateTimePipe,
    NzSpaceModule,
    NzIconModule
  ],
  templateUrl: './issues.component.html',
  styles: [
    PAGE_SHELL_STYLES,
  ],
  styleUrls: ['./issues.component.less']
})
export class IssuesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);
  private readonly router = inject(Router);

  private attachmentMimePrefixes = ['image/', 'video/'];
  private attachmentExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp', '.flv', '.wmv', '.mpeg', '.mpg'];

  protected readonly issues = signal<IssueItem[]>([]);
  protected readonly selectedIssueId = signal<string | null>(null);
  protected readonly selectedDetail = signal<IssueDetailResult | null>(null);
  protected readonly projectOptions = signal<ProjectOption[]>([]);
  protected readonly projectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly memberLoading = signal(false);
  protected readonly total = signal(0);

  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal<string | null>(null);
  protected readonly actionLoading = signal(false);
  protected readonly commentLoading = signal(false);
  protected readonly attachmentLoading = signal(false);
  protected readonly detailAttachmentFileList = signal<NzUploadFile[]>([]);

  protected readonly createVisible = signal(false);
  protected readonly createLoading = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected attachmentAccept = 'image/*,video/*';
  protected readonly createUploadFileList = signal<NzUploadFile[]>([]);
  private readonly createAttachmentFileMap = new Map<string, File>();
  protected readonly createAttachmentNames = signal<string[]>([]);

  protected readonly filters = this.fb.nonNullable.group({
    projectId: [''],
    status: [''],
    type: [''],
    priority: [''],
    keyword: ['']
  });

  protected readonly createForm = this.fb.nonNullable.group({
    projectId: ['', [Validators.required]],
    title: ['', [Validators.required]],
    description: [''],
    type: ['bug' as IssueType],
    priority: ['medium' as IssuePriority],
    module: [''],
    version: [''],
    environment: ['']
  });

  protected readonly assignForm = this.fb.nonNullable.group({
    assigneeId: ['']
  });

  protected readonly actionForm = this.fb.nonNullable.group({
    comment: [''],
    closeReasonType: ['' as '' | IssueCloseReasonType]
  });

  protected readonly commentForm = this.fb.nonNullable.group({
    content: ['']
  });

  public constructor() {
    this.filters.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => {
      void this.loadIssues();
    });

    void this.loadProjectOptions();
    void this.loadAttachmentPolicy();
    void this.loadIssues();
  }

  protected async reload(): Promise<void> {
    await this.loadIssues();
    const selectedId = this.selectedIssueId();
    if (selectedId) {
      await this.loadIssueDetail(selectedId);
    }
  }

  protected openCreateModal(): void {
    void this.router.navigate(['/issues/new']);
  }

  protected async submitCreate(): Promise<void> {
    if (this.createForm.invalid) {
      return;
    }

    this.createLoading.set(true);
    this.createError.set(null);

    try {
      const value = this.createForm.getRawValue();
      const pendingFiles = [...this.createAttachmentFileMap.values()];
      const created = await firstValueFrom(
        this.api.post<IssueItem, Record<string, string>>('/api/admin/issues', {
          projectId: value.projectId,
          title: value.title.trim(),
          description: value.description.trim(),
          type: value.type,
          priority: value.priority,
          module: value.module.trim(),
          version: value.version.trim(),
          environment: value.environment.trim()
        })
      );

      if (pendingFiles.length > 0) {
        try {
          await this.uploadIssueAttachmentFiles(created.id, pendingFiles);
        } catch (error) {
          this.listError.set(this.getErrorMessage(error, 'Issue created, but attachment upload failed'));
        }
      }

      this.createAttachmentFileMap.clear();
      this.createUploadFileList.set([]);
      this.createAttachmentNames.set([]);
      this.createVisible.set(false);
      await this.loadIssues();
      this.selectIssue(created);
    } catch (error) {
      this.createError.set(this.getErrorMessage(error, '创建问题失败'));
    } finally {
      this.createLoading.set(false);
    }
  }

  protected selectIssue(item: IssueItem): void {
    this.selectedIssueId.set(item.id);
    this.assignForm.reset({
      assigneeId: item.assigneeId || ''
    });
    this.actionForm.reset({ comment: '', closeReasonType: '' });
    this.commentForm.reset({ content: '' });
    void this.loadProjectMembers(item.projectId);
    void this.loadIssueDetail(item.id);
  }

  protected quickAssign(item: IssueItem, event: MouseEvent): void {
    event.stopPropagation();
    void this.handleQuickAssign(item);
  }

  protected quickFlow(item: IssueItem, event: MouseEvent): void {
    event.stopPropagation();
    void this.handleQuickFlow(item);
  }

  protected async runAction(action: 'assign' | 'start-progress' | 'mark-fixed' | 'verify' | 'reopen' | 'close'): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    this.actionLoading.set(true);
    this.detailError.set(null);

    try {
      const comment = this.actionForm.controls.comment.value.trim();
      const closeReasonType = this.actionForm.controls.closeReasonType.value;

      if (action === 'assign') {
        const assigneeId = this.assignForm.controls.assigneeId.value.trim();
        if (!assigneeId) {
          throw new Error('指派时需要选择项目成员');
        }
        await firstValueFrom(
          this.api.post<IssueItem, Record<string, string>>(`/api/admin/issues/${detail.issue.id}/assign`, {
            assigneeId,
            comment
          })
        );
      } else if (action === 'start-progress') {
        await firstValueFrom(
          this.api.post<IssueItem, Record<string, string>>(`/api/admin/issues/${detail.issue.id}/start-progress`, {
            comment
          })
        );
      } else if (action === 'mark-fixed') {
        if (!comment) {
          throw new Error('标记已修改时必须填写修复说明');
        }
        await firstValueFrom(
          this.api.post<IssueItem, Record<string, string>>(`/api/admin/issues/${detail.issue.id}/mark-fixed`, {
            comment
          })
        );
      } else if (action === 'verify') {
        await firstValueFrom(
          this.api.post<IssueItem, Record<string, string>>(`/api/admin/issues/${detail.issue.id}/verify`, {
            comment
          })
        );
      } else if (action === 'reopen') {
        if (!comment) {
          throw new Error('驳回重开时必须填写原因');
        }
        await firstValueFrom(
          this.api.post<IssueItem, Record<string, string>>(`/api/admin/issues/${detail.issue.id}/reopen`, {
            comment
          })
        );
      } else {
        if (detail.issue.status === 'open') {
          if (!closeReasonType) {
            throw new Error('新建状态直接关闭时必须选择原因');
          }
          if (!comment) {
            throw new Error('新建状态直接关闭时必须填写说明');
          }
        }
        await firstValueFrom(
          this.api.post<IssueItem, Record<string, string>>(`/api/admin/issues/${detail.issue.id}/close`, {
            comment,
            closeReasonType
          })
        );
      }

      this.actionForm.patchValue({ comment: '' });
      await this.loadIssues();
      await this.loadIssueDetail(detail.issue.id);
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '执行操作失败'));
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected async submitComment(): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    const content = this.commentForm.controls.content.value.trim();
    if (!content) {
      this.detailError.set('评论内容不能为空');
      return;
    }

    this.commentLoading.set(true);
    this.detailError.set(null);

    try {
      const result = await firstValueFrom(
        this.api.post<IssueDetailResult, { content: string }>(`/api/admin/issues/${detail.issue.id}/comments`, {
          content
        })
      );
      this.selectedDetail.set(result);
      this.commentForm.reset({ content: '' });
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '评论失败'));
    } finally {
      this.commentLoading.set(false);
    }
  }

  protected readonly beforeCreateUpload = (file: NzUploadFile): boolean => {
    const raw = file.originFileObj as File | undefined;
    if (!raw) {
      return false;
    }
    if (!this.isAllowedAttachmentFile(raw)) {
      this.createError.set(`\u4ec5\u652f\u6301\u56fe\u7247\u548c\u89c6\u9891\u6587\u4ef6\uff1a${raw.name}`);
      return false;
    }
    this.createError.set(null);
    this.createAttachmentFileMap.set(file.uid, raw);
    this.syncCreateAttachmentFiles();
    return false;
  };

  protected onCreateUploadChange(event: { fileList: NzUploadFile[] }): void {
    const nextList = event.fileList ?? [];
    const activeUids = new Set(nextList.map((item) => item.uid));
    for (const uid of Array.from(this.createAttachmentFileMap.keys())) {
      if (!activeUids.has(uid)) {
        this.createAttachmentFileMap.delete(uid);
      }
    }
    const filteredList = nextList.filter((item) => this.createAttachmentFileMap.has(item.uid));
    this.createUploadFileList.set(filteredList);
    this.syncCreateAttachmentFiles();
  }

  protected onCreateAttachmentPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) {
      return;
    }
    const pastedFiles: Array<{ uid: string; file: File }> = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind !== 'file') {
        continue;
      }
      const raw = item.getAsFile();
      if (!raw) {
        continue;
      }
      if (!this.isAllowedAttachmentFile(raw)) {
        continue;
      }
      const ext = this.extByMime(raw.type);
      const name = raw.name && raw.name.trim().length > 0 ? raw.name : `pasted-${Date.now()}-${i + 1}${ext}`;
      const normalized = new File([raw], name, { type: raw.type || 'application/octet-stream' });
      const uid = `paste-${Date.now()}-${i}`;
      pastedFiles.push({ uid, file: normalized });
    }
    if (pastedFiles.length === 0) {
      this.createError.set('粘贴内容中没有可上传的图片或视频');
      return;
    }
    this.createError.set(null);
    event.preventDefault();
    const current = [...this.createUploadFileList()];
    for (const item of pastedFiles) {
      this.createAttachmentFileMap.set(item.uid, item.file);
      current.push({
        uid: item.uid,
        name: item.file.name,
        size: item.file.size,
        type: item.file.type,
        originFileObj: item.file,
        status: 'done'
      });
    }
    this.createUploadFileList.set(current);
    this.syncCreateAttachmentFiles();
  }

  @HostListener('document:paste', ['$event'])
  protected handleDocumentPaste(event: ClipboardEvent): void {
    if (event.defaultPrevented || !this.createVisible()) {
      return;
    }
    this.onCreateAttachmentPaste(event);
  }
  protected readonly uploadDetailAttachmentRequest = (item: NzUploadXHRArgs): Subscription => {
    void this.handleDetailAttachmentUpload(item);
    return new Subscription();
  };

  protected readonly removeDetailAttachment = (file: NzUploadFile): boolean => {
    void this.removeAttachment(file.uid);
    return false;
  };

  protected readonly downloadDetailAttachment = (file: NzUploadFile): void => {
    if (file.url) {
      window.open(file.url, '_blank', 'noopener');
    }
  };

  protected readonly previewDetailAttachment = (file: NzUploadFile): void => {
    if (file.url) {
      window.open(file.url, '_blank', 'noopener');
    }
  };

  private async handleDetailAttachmentUpload(item: NzUploadXHRArgs): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      item.onError?.(new Error('\u672a\u9009\u62e9\u95ee\u9898'), item.file);
      return;
    }

    const uploadFile = this.extractUploadRawFile(item.file as NzUploadFile);
    if (!uploadFile) {
      item.onError?.(new Error('\u65e0\u6548\u9644\u4ef6\u6587\u4ef6'), item.file);
      return;
    }
    if (!this.isAllowedAttachmentFile(uploadFile)) {
      const error = new Error(`\u4ec5\u652f\u6301\u56fe\u7247\u548c\u89c6\u9891\u6587\u4ef6\uff1a${uploadFile.name}`);
      this.detailError.set(error.message);
      item.onError?.(error, item.file);
      return;
    }

    this.attachmentLoading.set(true);
    this.detailError.set(null);

    try {
      await this.uploadIssueAttachmentFiles(detail.issue.id, [uploadFile]);
      item.onSuccess?.({}, item.file, undefined);
      await this.loadIssueDetail(detail.issue.id);
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '\u4e0a\u4f20\u9644\u4ef6\u5931\u8d25'));
      item.onError?.(error as Error, item.file);
    } finally {
      this.attachmentLoading.set(false);
    }
  }
  protected async removeAttachment(attachmentId: string): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    this.attachmentLoading.set(true);
    this.detailError.set(null);

    try {
      const result = await firstValueFrom(
        this.api.delete<IssueDetailResult>(`/api/admin/issues/${detail.issue.id}/attachments/${attachmentId}`)
      );
      this.selectedDetail.set(result);
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '删除附件失败'));
    } finally {
      this.attachmentLoading.set(false);
    }
  }

  protected previewAttachment(attachment: IssueAttachmentDto): void {
    window.open(attachment.downloadUrl, '_blank', 'noopener');
  }

  protected downloadAttachment(attachment: IssueAttachmentDto): void {
    window.open(attachment.downloadUrl, '_blank', 'noopener');
  }

  protected toAttachmentCardItems(attachments: IssueAttachmentDto[]): AttachmentCardItem[] {
    return attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.originalName,
      size: attachment.fileSize,
      mimeType: attachment.mimeType ?? null,
      fileExt: attachment.fileExt ?? null,
      url: attachment.downloadUrl,
      previewUrl: attachment.downloadUrl
    }));
  }

  protected actionTypeColor(actionType: IssueActionType): string {
    if (actionType === 'create') return 'green';
    if (actionType === 'assign') return 'blue';
    if (actionType === 'start_progress') return 'orange';
    if (actionType === 'mark_fixed') return 'purple';
    if (actionType === 'verify') return 'cyan';
    if (actionType === 'reopen') return 'red';
    if (actionType === 'close') return 'default';
    if (actionType === 'comment') return 'yellow';
    if (actionType === 'upload_attachment') return 'green';
    if (actionType === 'remove_attachment') return 'red';
    return 'default';
  }
  protected actionTypeLabel(actionType: IssueActionType): string {
    if (actionType === 'create') return '创建';
    if (actionType === 'assign') return '指派';
    if (actionType === 'start_progress') return '开始处理';
    if (actionType === 'mark_fixed') return '申请测试';
    if (actionType === 'verify') return '验证';
    if (actionType === 'reopen') return '驳回重新修复';
    if (actionType === 'close') return '关闭';
    if (actionType === 'comment') return '评论';
    if (actionType === 'upload_attachment') return '上传附件';
    if (actionType === 'remove_attachment') return '删除附件';
    return '默认';
  }

  protected isImageAttachment(attachment: IssueAttachmentDto): boolean {
    const mimeType = attachment.mimeType?.toLowerCase() ?? '';
    if (mimeType.startsWith('image/')) {
      return true;
    }

    const ext = attachment.fileExt?.toLowerCase() ?? '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  }

  protected canAssign(status: IssueStatus): boolean {
    return status === 'open' || status === 'reopened';
  }

  protected canStartProgress(status: IssueStatus): boolean {
    return status === 'open' || status === 'assigned' || status === 'reopened';
  }

  protected canMarkFixed(status: IssueStatus): boolean {
    return status === 'in_progress';
  }

  protected canVerify(status: IssueStatus): boolean {
    return status === 'fixed';
  }

  protected canReopen(status: IssueStatus): boolean {
    return status === 'fixed' || status === 'verified' || status === 'closed';
  }

  protected canClose(status: IssueStatus): boolean {
    return status === 'open' || status === 'verified';
  }

  protected statusColor(status: IssueStatus): string {
    if (status === 'closed') return 'default';
    if (status === 'verified') return 'green';
    if (status === 'fixed') return 'blue';
    if (status === 'reopened') return 'red';
    if (status === 'in_progress') return 'processing';
    if (status === 'assigned') return 'cyan';
    return 'orange';
  }

  protected statusLabel(status: IssueStatus): string {
    if (status === 'assigned') return '已指派';
    if (status === 'in_progress') return '处理中';
    if (status === 'fixed') return '待测试';
    if (status === 'verified') return '已验证';
    if (status === 'reopened') return '已驳回';
    if (status === 'closed') return '已关闭';
    return '新建';
  }

  protected priorityColor(priority: IssuePriority): string {
    if (priority === 'critical') return 'red';
    if (priority === 'high') return 'orange';
    if (priority === 'medium') return 'blue';
    return 'default';
  }

  protected priorityLabel(priority: IssuePriority): string {
    if (priority === 'critical') return '紧急';
    if (priority === 'high') return '高';
    if (priority === 'medium') return '中';
    return '低';
  }

  protected typeLabel(type: IssueType): string {
    if (type === 'requirement_change') return '需求变更';
    if (type === 'feature') return '新功能';
    if (type === 'improvement') return '改进';
    if (type === 'task') return '任务';
    if (type === 'test_record') return '测试记录';
    return '缺陷';
  }

  private async loadIssues(): Promise<void> {
    this.listLoading.set(true);
    this.listError.set(null);

    try {
      const filter = this.filters.getRawValue();
      const params: Record<string, string | number> = { page: 1, pageSize: 100 };

      if (filter.projectId) params['projectId'] = filter.projectId;
      if (filter.status) params['status'] = filter.status;
      if (filter.type) params['type'] = filter.type;
      if (filter.priority) params['priority'] = filter.priority;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();

      const result = await firstValueFrom(this.api.get<IssueListResult>('/api/admin/issues', { params }));
      this.issues.set(result.items);
      this.total.set(result.total);

      const selectedId = this.selectedIssueId();
      if (selectedId && !result.items.find((item) => item.id === selectedId)) {
        this.selectedIssueId.set(null);
        this.selectedDetail.set(null);
      }
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载问题列表失败'));
    } finally {
      this.listLoading.set(false);
    }
  }

  private async loadIssueDetail(issueId: string): Promise<void> {
    this.detailLoading.set(true);
    this.detailError.set(null);

    try {
      const result = await firstValueFrom(this.api.get<IssueDetailResult>(`/api/admin/issues/${issueId}`));
      this.selectedDetail.set(result);
      this.assignForm.patchValue({
        assigneeId: result.issue.assigneeId || ''
      });
      void this.loadProjectMembers(result.issue.projectId);
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '加载问题详情失败'));
    } finally {
      this.detailLoading.set(false);
    }
  }


  private async ensureIssueContext(item: IssueItem): Promise<void> {
    if (this.selectedIssueId() !== item.id) {
      this.selectedIssueId.set(item.id);
      this.assignForm.reset({
        assigneeId: item.assigneeId || ''
      });
      this.actionForm.reset({ comment: '', closeReasonType: '' });
      this.commentForm.reset({ content: '' });
      await this.loadProjectMembers(item.projectId);
      await this.loadIssueDetail(item.id);
      return;
    }

    const detail = this.selectedDetail();
    if (!detail || detail.issue.id !== item.id) {
      await this.loadIssueDetail(item.id);
    }
  }
  private async handleQuickAssign(item: IssueItem): Promise<void> {
    await this.ensureIssueContext(item);
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }
    if (!this.canAssign(detail.issue.status)) {
      this.detailError.set('当前状态不支持快速指派');
      return;
    }

    const assigneeId = this.assignForm.controls.assigneeId.value.trim();
    if (!assigneeId) {
      this.detailError.set('请先在右侧选择项目成员，再执行快速指派');
      return;
    }

    await this.runAction('assign');
  }

  private resolveQuickFlowAction(status: IssueStatus): 'start-progress' | 'verify' | 'close' | null {
    if (this.canStartProgress(status)) {
      return 'start-progress';
    }
    if (this.canVerify(status)) {
      return 'verify';
    }
    if (status === 'verified' && this.canClose(status)) {
      return 'close';
    }
    return null;
  }

  private async handleQuickFlow(item: IssueItem): Promise<void> {
    await this.ensureIssueContext(item);
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }
    const action = this.resolveQuickFlowAction(detail.issue.status);
    if (!action) {
      this.detailError.set('当前状态暂无可执行的快捷流转');
      return;
    }
    await this.runAction(action);
  }

  private async loadProjectOptions(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.api.get<{ items: ProjectOption[] }>('/api/admin/projects', {
          params: { status: 'active', page: 1, pageSize: 100 }
        })
      );
      this.projectOptions.set(result.items);
    } catch {
      this.projectOptions.set([]);
    }
  }


  protected memberLabel(member: ProjectMemberItem): string {
    const roleText = member.roles.map((role) => this.roleLabel(role)).join('、');
    return `${member.displayName} (${member.userId})${roleText ? ' - ' + roleText : ''}`;
  }

  protected roleLabel(role: ProjectMemberItem['roles'][number]): string {
    if (role === 'product') return '产品';
    if (role === 'ui') return 'UI/设计';
    if (role === 'frontend_dev') return '前端开发';
    if (role === 'backend_dev') return '后端开发';
    if (role === 'qa') return '测试';
    return '运维/环境支持';
  }

  private async loadProjectMembers(projectId: string): Promise<void> {
    if (!projectId) {
      this.projectMembers.set([]);
      return;
    }

    this.memberLoading.set(true);
    try {
      const result = await firstValueFrom(
        this.api.get<{ items: ProjectMemberItem[] }>(`/api/admin/projects/${projectId}/members`)
      );
      this.projectMembers.set(result.items);
    } catch {
      this.projectMembers.set([]);
    } finally {
      this.memberLoading.set(false);
    }
  }
  private syncDetailAttachmentFileList(attachments: IssueAttachmentDto[]): void {
    this.detailAttachmentFileList.set(
      attachments.map((attachment) => ({
        uid: attachment.id,
        name: attachment.originalName,
        status: "done",
        url: attachment.downloadUrl,
        type: attachment.mimeType ?? undefined,
        size: attachment.fileSize,
        thumbUrl: this.isImageAttachment(attachment) ? attachment.downloadUrl : undefined
      }))
    );
  }
  private async uploadIssueAttachmentFiles(issueId: string, files: readonly File[]): Promise<void> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    await firstValueFrom(
      this.api.post<{ items: IssueAttachmentDto[] }, FormData>(`/api/admin/issues/${issueId}/attachments`, formData)
    );
  }

  private async loadAttachmentPolicy(): Promise<void> {
    try {
      const result = await firstValueFrom(this.api.get<AttachmentPolicyResult>('/api/admin/issues/attachment-policy'));
      if (result.accept?.trim()) {
        this.attachmentAccept = result.accept.trim();
      }
      if (Array.isArray(result.mimePrefixes) && result.mimePrefixes.length > 0) {
        this.attachmentMimePrefixes = result.mimePrefixes.map((item) => item.toLowerCase());
      }
      if (Array.isArray(result.exts) && result.exts.length > 0) {
        this.attachmentExts = result.exts.map((item) => item.toLowerCase());
      }
    } catch {
      // fallback to local defaults
    }
  }

  private syncCreateAttachmentFiles(): void {
    this.createAttachmentNames.set(Array.from(this.createAttachmentFileMap.values()).map((file) => file.name));
  }


  private extractUploadRawFile(upload: NzUploadFile): File | null {
    const fromOrigin = upload.originFileObj;
    if (fromOrigin instanceof File) {
      return fromOrigin;
    }
    if (upload instanceof File) {
      return upload;
    }
    return null;
  }

  private isAllowedAttachmentFile(file: File): boolean {
    const mimeType = file.type.toLowerCase();
    if (
      mimeType &&
      this.attachmentMimePrefixes.some((prefix) => mimeType.startsWith(prefix))
    ) {
      return true;
    }

    const name = file.name.toLowerCase();
    return this.attachmentExts.some((ext) => name.endsWith(ext));
  }
  private extByMime(mimeType: string): string {
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/jpeg') return '.jpg';
    if (mimeType === 'image/webp') return '.webp';
    if (mimeType === 'image/gif') return '.gif';
    return '';
  }
  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}

