import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UiNotifierService } from '@app/core';
import type {
  TaskBootstrapDonePayload,
  TaskBootstrapFailedPayload,
  TaskBootstrapNeedPickRootPayload,
  TaskEventMsg,
} from '@yinuo-ngm/protocol';
import { getApiErrorMessage } from '@app/core/api';
import { DetectResult } from '@models/project.model';
import { TaskStreamService } from '@pages/tasks/services/task-stream.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { filter, first, firstValueFrom, Subject, Subscription, takeUntil, timeout } from 'rxjs';
import { CreateSummaryAsideComponent } from '../components/create-summary-aside.component';
import { FsExplorerService } from '../components/fs-explorer';
import { PickWorkspaceCandidate, PickWorkspaceModalComponent, PickWorkspaceResult } from '../components/pick-workspace-modal.component';
import { StepBasicComponent } from '../components/step-basic.component';
import { StepConfigComponent } from '../components/step-config.component';
import { StepFeaturesComponent } from '../components/step-features.component';
import { StepPresetComponent } from '../components/step-preset.component';
import { createEmptyDraft, CreateProjectDraft } from '../models';
import { ProjectApiService } from '../services/project-api.service';
import { ProjectStateService } from '../services/project.state.service';
@Component({
  selector: 'app-project-create-modal',
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzCardModule,
    NzGridModule,
    NzStepsModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzSpinModule,
    StepBasicComponent,
    StepPresetComponent,
    StepFeaturesComponent,
    StepConfigComponent,
    CreateSummaryAsideComponent,
  ],
  template: `
    <div nz-row nzJustify="start">
      <div nz-col nzSpan="24">
        <nz-steps [nzCurrent]="step()" >
            <nz-step nzTitle="详情"></nz-step>
            <nz-step nzTitle="预设"></nz-step>
            <nz-step nzTitle="功能"></nz-step>
            <nz-step nzTitle="配置"></nz-step>
          </nz-steps>
          <div class="content">
            <nz-spin [nzSpinning]="creating()" nzTip="正在创建项目...">
            <div class="main">
            @switch(step()){ @case(0){
            <app-step-basic [draft]="draft()" (draftChange)="setDraft($event)" />
            } @case(1){
            <app-step-preset
              [draft]="draft()"
              (draftChange)="setDraft($event)"
              (requestDetect)="detectNow()"
            />
            } @case(2){
            <app-step-features [draft]="draft()" (draftChange)="setDraft($event)" />
            } @case(3){
            <app-step-config [draft]="draft()" (draftChange)="setDraft($event)" />
            } }
            <div class="actions">
                @if(step()===0){
                  <button nz-button (click)="cancel()">
                    <nz-icon nzType="close" nzTheme="outline" />
                    取消
                  </button>
                }

                @if(step() > 0){
                  <button nz-button (click)="prev()">
                    <nz-icon nzType="arrow-left" nzTheme="outline" />
                    上一步
                  </button>
                }

                @if(canCreateHere()){
                  <button nz-button nzType="primary" (click)="create()" [disabled]="creating()">
                    <nz-icon nzType="check" nzTheme="outline" />
                    创建项目
                  </button>
                } @else {
                  <button nz-button nzType="primary" (click)="next()" [disabled]="!canNext() || !canGoNext()">
                    下一步
                    <nz-icon nzType="arrow-right" nzTheme="outline" />
                  </button>
                }
              </div>
          </div>
          </nz-spin>
          <div class="aside">
            <app-create-summary-aside [draft]="draft()" [(isCreating)]="creating" [chunk]="output()" />
          </div>
        </div>
      
      </div>
    </div>
  `,
  styles: [
    `
.content {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  margin-top: 16px;
}

.main {
  min-height: 420px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 18px;
}

.aside {
  position: sticky;
  top: 16px;
  height: fit-content;
}
    `
  ],
})
export class ProjectCreateModal implements OnInit {
  step = signal(0);
  draft = signal<CreateProjectDraft>(createEmptyDraft());
  creating = signal(false);
  output = signal<string>('');
  isDrawerOpen = signal(false);
  private fs = inject(FsExplorerService);
  readonly parentDir = this.fs.currentPath();

  readonly modalRef = inject(NzModalRef);
  private api = inject(ProjectApiService);
  private modal = inject(NzModalService);
  private notify = inject(UiNotifierService);
  private taskStream = inject(TaskStreamService);
  private projectState = inject(ProjectStateService);
  private router = inject(Router);

  private sub: Subscription = new Subscription();

  ngOnInit(): void {
    const d = this.draft();
    const parentDir = this.parentDir;
    this.draft.set({ ...d, rootPath: '', parentDir, name: "" });
  }

  detectNow() {
    const d = this.draft();
    if (!d.rootPath?.trim()) return;
    this.api.detect(d.rootPath).subscribe(r => {
      const scripts = r.scripts ?? [];
      const detected: DetectResult = {
        framework: r.framework ?? 'unknown',
        hasPackageJson: !!r.hasPackageJson,
        scriptsCount: scripts.length,
        hasGit: !!r.hasGit,
        lockFile: r.lockFile ?? 'unknown',
        recommendedScript: scripts.includes('dev') ? 'dev' : (scripts.includes('start') ? 'start' : ''),
        hasMakefile: !!r.hasMakefile,
        hasDockerCompose: !!r.hasDockerCompose,
      };

      // 根据识别结果调整导入选项
      const importScriptsAsTasks = scripts.length > 0;
      const importMakefileTasks = !!r.hasMakefile;
      const importDockerComposeTasks = !!r.hasDockerCompose;

      this.draft.set({
        ...d,
        detected,
        importScriptsAsTasks,
        importMakefileTasks: importMakefileTasks && d.importMakefileTasks, // 默认不强开
        importDockerComposeTasks: importDockerComposeTasks && d.importDockerComposeTasks,
        defaultTaskName: detected.recommendedScript || d.defaultTaskName,
      });
    })
  }

  async create() {
    const d = this.draft();
    if (!d.rootPath?.trim() || !d.name?.trim()) {
      this.notify.error('请先完善项目信息');
      return;
    }
    if (this.creating()) return;
    let nzTitle = '确认创建项目？', nzContent = `请确认目标路径 ${d.rootPath}，确定要创建该项目吗？`, nzOkText = '确认创建', nzOkDanger = false;
    if (d.overwriteIfExists) {
      nzTitle = '确认覆盖已存在的项目？';
      nzContent = `请确认目标路径 ${d.rootPath}，创建时会覆盖原有数据，且不可恢复，确定要继续吗？`;
      nzOkText = '确认覆盖';
      nzOkDanger = true;
    }
    const modalRef = this.modal.confirm({
      nzTitle,
      nzContent,
      nzOkText,
      nzCancelText: '取消',
      nzOkDanger,
      nzCentered: true,
      nzOnOk: async () => {
        this.doCreate(d);
        modalRef.close();
      },
    })
  }

  private async doCreate(d: CreateProjectDraft) {
    this.creating.set(true);
    this.taskStream.ensureConnected();

    const destroy$ = new Subject<void>();

    try {
      //  发起 bootstrap
      const bootstrap$ = d.preset === 'git'
        ? this.api.bootstrapByGit(d)
        : this.api.bootstrapByCli(d);

      const { taskId } = await firstValueFrom(bootstrap$);

      // 订阅 task（用于 tail / output）
      this.taskStream.subscribeTask(taskId, 3000);

      // 监听输出（展示在 aside）
      this.sub.add(
        this.taskStream.output$(taskId).subscribe((m) => {
          const chunk = m.payload.text ?? '';
          this.output.set(chunk);
        })
      );

      // 等待首个关键事件：done / failed / needPick
      const firstEvt = await this.waitForTaskEvent(taskId, [
        'bootstrapDone',
        'bootstrapFailed',
        'bootstrapNeedPickRoot',
      ], 10 * 60 * 1000, destroy$);

      if (firstEvt.type === 'bootstrapDone') {
        const payload = firstEvt.payload as TaskBootstrapDonePayload;
        this.notify.success('项目创建完成');
        this.projectState.getProjects(payload.projectId);
        this.modalRef.close({ ok: true });
        this.router.navigate(['/dashboard']);
        return;
      }

      if (firstEvt.type === 'bootstrapFailed') {
        const payload = firstEvt.payload as TaskBootstrapFailedPayload;
        this.notify.error(`项目创建失败：${payload?.reason ?? 'unknown error'}`);
        return;
      }

      // needPickRoot：打开选择框
      const pickPayload = firstEvt.payload as TaskBootstrapNeedPickRootPayload; // TaskBootstrapNeedPickRootPayload
      const candidates = pickPayload?.candidates ?? [];
      if (!candidates.length) {
        this.notify.error('项目导入失败：未找到可导入的工作区目录');
        return;
      }

      const pickedRoot = await this.pickWorkspaceRootByModal(candidates);
      if (!pickedRoot) {
        this.modal.info({
          nzTitle: '提示',
          nzContent: '您未选择任何目录，项目导入已取消。可通过“导入”功能重新手动导入。',
          nzCancelText: null,
          nzOkText: '我知道了',
          nzOnOk: () => {
            this.modalRef.close();
          }
        });
        return;
      }

      //  回传 pickedRoot（这里用 HTTP 返回 ok 即可，不依赖 WS done）
      const pickResult = await firstValueFrom(
        this.api.bootstrapPickRoot({ taskId, pickedRoot }).pipe(
          timeout(60 * 1000),
          takeUntil(destroy$),
        )
      );

      this.notify.success('项目导入完成');
      this.projectState.getProjects(pickResult.projectId);
      this.modalRef.close({ ok: true });
      this.router.navigate(['/dashboard']);

      //  再等最终结果：done / failed（重新订阅等待，不复用之前的 done$）
      // const finalEvt = await this.waitForTaskEvent(taskId, [
      //   'bootstrapDone',
      //   'bootstrapFailed',
      // ], 10 * 60 * 1000, destroy$);

      // if (finalEvt.type === 'bootstrapDone') {
      //   const payload2 = finalEvt.payload as TaskBootstrapDonePayload;
      //   this.notify.success('项目导入完成');
      //   this.projectState.getProjects(payload2.projectId);
      //   this.modalRef.close({ ok: true });
      //   this.router.navigate(['/dashboard']);
      //   return;
      // } else {
      //   const payload2 = finalEvt.payload as TaskBootstrapFailedPayload;
      //   this.notify.error(`项目导入失败：${payload2?.reason ?? 'unknown error'}`);
      //   return;
      // }
    } catch (err: any) {
      const msg =
        err?.name === 'TimeoutError'
          ? '创建超时：脚手架/克隆可能卡住了，请查看任务日志'
          : getApiErrorMessage(err, '创建失败');
      console.error('创建项目失败', err);
      this.notify.error(msg);
    } finally {
      destroy$.next();
      destroy$.complete();
      this.creating.set(false);
    }
  }

  /**
 * 等待指定 taskId 的某些事件类型之一出现（每次调用都会创建新订阅，避免 first() 复用导致丢事件）
 */
  private async waitForTaskEvent(
    taskId: string,
    types: Array<'bootstrapDone' | 'bootstrapFailed' | 'bootstrapNeedPickRoot'>,
    timeoutMs: number,
    destroy$: Subject<void>,
  ): Promise<TaskEventMsg> {
    const typeSet = new Set(types);

    return await firstValueFrom(
      this.taskStream.events$().pipe(
        filter(e => e?.payload?.taskId === taskId),
        filter(e => typeSet.has(e.type as 'bootstrapDone' | 'bootstrapFailed' | 'bootstrapNeedPickRoot')),
        first(),
        timeout(timeoutMs),
        takeUntil(destroy$),
      )
    );
  }

  setDraft(d: CreateProjectDraft) {
    this.draft.set(d);
  }

  canNext(): boolean {
    const s = this.step();
    const d = this.draft();

    if (s === 0) {
      if (!d.name?.trim()) return false;
      if (!d.parentDir?.trim()) return false;
      if (!d.rootPath?.trim()) return false;
      return true;
    }
    if (s === 1) {
      return !!d.rootPath?.trim();
    }
    return true;
  }

  async next() {
    const s = this.step();
    if (s === 0) {
      // Step1 校验 + 路径重复检查（可选）
      const exists = await this.api.checkPathExists(this.draft().rootPath);
      if (exists && !this.draft().overwriteIfExists) {
        this.notify.error('该路径不可用或已存在重复项目');
        return;
      }
    }
    const ns = Math.min(3, s + 1);
    this.step.set(ns);
    // 进入 Step2 自动 detect
    // if (ns === 1) await this.detectNow();
  }

  prev() {
    this.step.set(Math.max(0, this.step() - 1));
  }

  canGoNext() {
    const s = this.step();
    if (s === 0) return true;               // basic -> preset
    if (s === 1) return this.isManual();    // 只有 manual 才能 preset -> features
    if (s === 2) return true;               // features -> config
    return false;
  }

  private isManual() {
    return this.draft().preset === 'manual';
  }

  canCreateHere() {
    const s = this.step();
    return (this.isManual() && s === 3) || (!this.isManual() && s === 1);
  }

  cancel() {
    this.modal.confirm({
      nzTitle: '取消创建项目',
      nzContent: '确定要取消创建吗',
      nzOkDanger: true,
      nzOkText: '取消创建',
      nzCancelText: '不',
      nzCentered: true,
      nzOnOk: () => {
        this.modalRef.close();
      }
    })
  }

  private async pickWorkspaceRootByModal(candidates: PickWorkspaceCandidate[]): Promise<string | null> {
    const modal: NzModalRef<PickWorkspaceModalComponent> = this.modal.create({
      nzTitle: '选择要导入的工作区目录',
      nzContent: PickWorkspaceModalComponent,
      nzData: {
        candidates,
        defaultPicked: candidates[0],
      },
      nzFooter: null,
      nzCentered: true,
      nzMaskClosable: false,
      nzClosable: true,
      nzWidth: 720,
    });
    const result = await firstValueFrom<PickWorkspaceResult | null>(modal.afterClose);
    return result?.pickedRoot ?? null;
  }

}
