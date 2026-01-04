import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { StepBasicComponent } from '../components/step-basic.component';
import { StepPresetComponent } from '../components/step-preset.component';
import { StepFeaturesComponent } from '../components/step-features.component';
import { StepConfigComponent } from '../components/step-config.component';
import { CreateSummaryAsideComponent } from '../components/create-summary-aside.component';
import { createEmptyDraft, CreateProjectDraft } from '../models/project-draft';
import { ProjectService } from '../project.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-project-create.component',
  imports: [
    CommonModule,
    RouterModule,
    NzStepsModule,
    NzCardModule,
    NzButtonModule,
    StepBasicComponent,
    StepPresetComponent,
    StepFeaturesComponent,
    StepConfigComponent,
    CreateSummaryAsideComponent,
  ],
  templateUrl: './project-create.component.html',
  styleUrl: './project-create.component.less',
})
export class ProjectCreateComponent {
  step = signal(0);
  creating = signal(false);
  draft = signal<CreateProjectDraft>(createEmptyDraft());

  constructor(
    private api: ProjectService,
    private msg: NzMessageService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // 支持 /projects/create?mode=import&path=xxx
    const mode = this.route.snapshot.queryParamMap.get('mode');
    const path = this.route.snapshot.queryParamMap.get('path');
    if (mode === 'import' && path) {
      const d = this.draft();
      this.draft.set({ ...d, mode: 'import', rootPath: path, parentDir: '', name: this.basename(path) });
      this.step.set(1); // 直接跳到“预设”
      queueMicrotask(() => this.detectNow());
    }
  }

  setDraft(d: CreateProjectDraft) {
    this.draft.set(d);
  }

  canNext(): boolean {
    const s = this.step();
    const d = this.draft();

    if (s === 0) {
      if (!d.name?.trim()) return false;
      if (d.mode === 'create' && !d.parentDir?.trim()) return false;
      if (!d.rootPath?.trim()) return false;
      return true;
    }
    if (s === 1) {
      // Step2 允许跳过 detect，但建议至少有 rootPath
      return !!d.rootPath?.trim();
    }
    return true;
  }

  async next() {
    const s = this.step();
    if (s === 0) {
      // Step1 校验 + 路径重复检查（可选）
      const ok = await this.api.checkPathExists(this.draft().rootPath);
      if (!ok) {
        this.msg.error('该路径不可用或已存在重复项目');
        return;
      }
    }
    const ns = Math.min(3, s + 1);
    this.step.set(ns);

    // 进入 Step2 自动 detect
    if (ns === 1) await this.detectNow();
  }

  prev() {
    this.step.set(Math.max(0, this.step() - 1));
  }

  cancel() {
    this.router.navigateByUrl('/projects');
  }

  async detectNow() {
    const d = this.draft();
    if (!d.rootPath?.trim()) return;

    const r = await this.api.detectProject(d.rootPath);
    const scripts = r.scripts ?? [];
    const detected = {
      framework: r.framework ?? 'Unknown',
      hasPackageJson: !!r.hasPackageJson,
      scriptsCount: scripts.length,
      hasGit: !!r.hasGit,
      lockFile: r.lockFile ?? 'none',
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
  }

  async create() {
    const d = this.draft();
    if (!d.rootPath?.trim() || !d.name?.trim()) {
      this.msg.error('请先完善项目信息');
      return;
    }

    this.creating.set(true);
    try {
      const { projectId } = await this.api.createProject(d);
      this.msg.success('项目已创建');
      // TODO: 进入 Project Workspace（你后面会有 /projects/:id）
      this.router.navigateByUrl('/projects');
    } catch (e: any) {
      this.msg.error(e?.message ?? '创建失败');
    } finally {
      this.creating.set(false);
    }
  }

  private basename(p: string) {
    return p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? p;
  }
}
