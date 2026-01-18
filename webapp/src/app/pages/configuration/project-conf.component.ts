import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { ConfApiService, ConfigCategory, ConfigDescriptor, ConfigField, JsonPatchOp } from './conf-api.service';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NgDevtoolComponent } from '@app/shared/devtools/ng-devtool.component';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-project-conf.component',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzLayoutModule,
    NzMenuModule,
    NzFormModule,
    NzInputModule,
    NzSwitchModule,
    NzButtonModule,
    NzTypographyModule,
    NzButtonModule,
    NzPopoverModule,
    NzTooltipModule,
    NgDevtoolComponent,
    NzIconModule

  ],
  templateUrl: './project-conf.component.html',
  styleUrls: ['./project-conf.component.less'],
})
export class ProjectConfComponent {
  private api = inject(ConfApiService);
  private fb = inject(FormBuilder);
  private msg = inject(NzMessageService);
  private projectState = inject(ProjectStateService);

  projectId = computed(() => this.projectState.currentProjectId() || "");

  descriptor = signal<ConfigDescriptor | null>(null);
  values = signal<Record<string, any>>({});
  selectedSectionId = signal<string>("base");

  loading = signal(false);
  keyword = signal("");


  activeCategoryId = signal<string>("angular");

  form = signal<FormGroup>(this.fb.group({}));

  // 当前类目
  activeCategory = computed<ConfigCategory | null>(() => {
    const d = this.descriptor();
    if (!d) return null;
    return d.categories.find((c) => c.id === this.activeCategoryId()) ?? d.categories[0] ?? null;
  });

  // 当前类目的所有字段（用于建表单、生成 patch）
  activeFields = computed<ConfigField[]>(() => {
    const cat = this.activeCategory();
    if (!cat) return [];
    return cat.groups.flatMap((g) => g.fields);
  });

  // 右侧渲染用：过滤后的 groups（按 keyword 过滤 fields）
  filteredGroups = computed(() => {
    const cat = this.activeCategory();
    if (!cat) return [];
    const kw = this.keyword().trim().toLowerCase();
    if (!kw) return cat.groups;

    return cat.groups
      .map((g) => ({
        ...g,
        fields: g.fields.filter((f) => {
          const hay = `${f.label} ${f.key} ${f.path}`.toLowerCase();
          return hay.includes(kw);
        }),
      }))
      .filter((g) => g.fields.length > 0);
  });

  // diff/backup
  diffText = signal("");
  lastBackupId = signal("");

  constructor() {
    // 初始化加载
    this.reload(this.projectId());

    // 类目切换 -> 重建 form（包含该类目的全部字段）
    effect(() => {
      const fields = this.activeFields();
      const g: any = {};
      for (const f of fields) {
        g[f.path] = [this.values()[f.path] ?? (f as any).default ?? null];
      }
      this.form.set(this.fb.group(g));
      this.diffText.set("");
    });

    // project 切换 -> 重新加载
    effect(() => {
      const pid = this.projectId();
      this.reload(pid);
    });
  }

  selectCategory(id: string) {
    this.activeCategoryId.set(id);
  }

  reload(pid: string) {
    this.loading.set(true);
    this.api.getDescriptor(pid).subscribe({
      next: (d) => {
        this.descriptor.set(d);
        this.activeCategoryId.set(d.categories?.[0]?.id ?? "angular");
        this.api.getValues(pid).subscribe({
          next: (r) => {
            this.values.set(r.values ?? {});
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  openConfig() {
    // this.api.openConfig(this.projectId(), "angular").subscribe({
    //   next: () => this.msg.success("已打开配置文件"),
    //   error: () => this.msg.error("打开失败"),
    // });
  }

  private buildPatch(): JsonPatchOp[] {
    const fields = this.activeFields();
    const fg = this.form();
    const patch: JsonPatchOp[] = [];

    for (const f of fields) {
      const next = fg.get(f.path)?.value;
      const prev = this.values()[f.path];
      if (next !== prev) patch.push({ op: "replace", path: f.path, value: next });
    }
    return patch;
  }

  preview() {
    const patch = this.buildPatch();
    if (!patch.length) {
      this.msg.info("没有变更");
      return
    }
    const pid = this.projectId();
    this.api.patch(pid, patch, true).subscribe((res) => {
      this.diffText.set(res.diffText || "");
      this.msg.success("已生成 Diff 预览");
    });
  }

  apply() {
    const patch = this.buildPatch();
    if (!patch.length) {
      this.msg.info("没有变更");
      return
    }
    const pid = this.projectId();
    this.api.patch(pid, patch, false).subscribe((res) => {
      this.diffText.set(res.diffText || "");
      this.lastBackupId.set(res.backupId || "");
      this.api.getValues(pid).subscribe((r) => this.values.set(r.values ?? {}));
      this.msg.success("已应用修改");
    });
  }

  rollback() {
    const id = this.lastBackupId();
    if (!id) return;
    const pid = this.projectId();
    this.api.rollback(pid, id).subscribe(() => {
      this.msg.success("已回滚");
      this.reload(pid);
    });
  }
}
