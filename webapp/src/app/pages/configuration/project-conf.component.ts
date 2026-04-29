import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgDevtoolComponent } from '@app/shared/devtools/ng-devtool.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzTypographyModule } from 'ng-zorro-antd/typography';

import * as _ from 'lodash';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { firstValueFrom } from 'rxjs';
import { ConfigChangeBarComponent } from './components/config-change-bar-component';
import { ConfigNavComponent } from './components/config-nav-component';
import { ConfigSectionComponent } from './components/config-section-component';
import { ConfigNavNodeVM, DocStateVM, DomainDocMetaVM, DomainSchemaDiffResult, DomainSchemaDoc, ResolvedDomain } from './models';
import { ConfApiService, } from './services';
import { flattenPatch, mapResolvedToNav } from './utils';
import { PageLayoutComponent } from '@app/shared';
import { ProjectContextStore } from '@app/core/stores';

@Component({
  selector: 'app-project-conf.component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzLayoutModule,
    NzMenuModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    NzButtonModule,
    NzTypographyModule,
    NzPopoverModule,
    NzTooltipModule,
    NgDevtoolComponent,
    NzIconModule,
    ConfigNavComponent,
    ConfigChangeBarComponent,
    NzModalModule,
    ConfigSectionComponent,
    PageLayoutComponent,
  ],
  styleUrl: './project-conf.component.less',
  template: `
    <app-page-layout [title]="'项目配置'" [loading]="loading()">
      <ng-container ngProjectAs="actions">
        <button nz-button nzType="primary" (click)="isModalVisible.set(true)">打开配置文件</button>
        <app-ng-devtool></app-ng-devtool>
      </ng-container>
      <div class="panel">
        <app-config-nav-component
          [nodes]="navNodes()"
          [activeDomainId]="activeDomainId() ?? ''"
          (domainSelect)="onDomainSelect($event)"
        >
        </app-config-nav-component>
        <div class="content">
          <app-config-section-component
            [schema]="domainSchema()?.schema"
            [vm]="domainVM()"
            (vmChange)="domainVM.set($event)"
            [options]="domainSchema()?.options ?? {}"
          >
          </app-config-section-component>
          <app-config-change-bar-component
            [dirty]="domainDirty()"
            (diff)="onDiff()"
            (reset)="onReset()"
            (save)="saveActive()"
          >
          </app-config-change-bar-component>
        </div>
      </div>
    </app-page-layout>
    <nz-modal
      [(nzVisible)]="isModalVisible"
      nzTitle="配置"
      (nzOnCancel)="isModalVisible.set(false)"
      [nzMaskClosable]="false"
    >
      <ng-container *nzModalContent>
        <div class="modal-body">
          <label>选择配置文件</label>
          <nz-select style="width: 100%" [(ngModel)]="selectedDocId" nzPlaceHolder="请选择配置文件">
            @for (doc of activeDocsMeta() || []; track doc.docId) {
              <nz-option [nzLabel]="doc.title" [nzValue]="doc.docId"></nz-option>
            }
          </nz-select>
        </div>
      </ng-container>
      <ng-container *nzModalFooter>
        <button nz-button nzType="primary" (click)="openConfig()" [disabled]="!selectedDocId()">
          打开配置文件
        </button>
      </ng-container>
    </nz-modal>
  `
})
export class ProjectConfComponent {
  private api = inject(ConfApiService);
  private projectContext = inject(ProjectContextStore);
  private msg = inject(NzMessageService);
  private modal = inject(NzModalService);


  projectId = computed(() => this.projectContext.currentProjectId() || '');

  loading = signal(false);
  isModalVisible = signal(false);
  catalog = signal<ResolvedDomain[] | null>(null);

  // 左侧 nav 的 VM（domain->doc 扁平结构）
  navNodes = computed<ConfigNavNodeVM[]>(() => mapResolvedToNav(this.catalog() ?? []));
  // 当前选中 domain ID
  activeDomainId = signal<string | null>(null);
  // 选中的 doc ID
  selectedDocId = signal<string | null>(null);
  // 当前 doc 内容（raw/json）
  docStates = signal<Record<string, DocStateVM>>({});

  domainSchema = signal<DomainSchemaDoc | null>(null);
  // 当前 domain 级 VM（由多个 doc 组装而成）
  domainVM = signal<any | null>(null);
  baselineDomainVM = signal<any | null>(null);

  activeDomain = computed(() => {
    const did = this.activeDomainId();
    return (this.catalog() ?? []).find(x => x.domainId === did) ?? null;
  });

  activeDocs = computed(() => this.activeDomain()?.docs ?? []);

  activeDocsMeta = computed<DomainDocMetaVM[]>(() => {
    const d = this.activeDomain();
    if (!d) return [];
    return (d.docs ?? []).map(x => ({
      docId: x.spec.id,
      title: x.spec.title,
      exists: x.exists,
      relPath: x.chosen?.relPath,
      codec: x.chosen?.codec,
    }));
  });

  // dirty：对 raw 做 dirty（json 可后续）
  domainDirty = computed(() => {
    const base = this.baselineDomainVM();
    const cur = this.domainVM();
    if (!base || !cur) return false;
    return !_.isEqual(base, cur);
  });

  constructor() {
    effect(() => {
      const pid = this.projectId();
      if (pid) this.getCatalog();
    });
  }

  getCatalog() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.api.getCatalog(pid).subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        const firstDomainId = catalog[0]?.domainId ?? "";
        if (firstDomainId) {
          this.activeDomainId.set(firstDomainId);
          this.loadDomainSchema(firstDomainId);
        }

      },
      error: (err) => {
        console.error(err);
        this.msg.error('加载配置目录失败');
      },
      complete: () => this.loading.set(false),
    });
  }

  /**
   * 左侧目录选择 domain
   */
  onDomainSelect(domainId: string) {
    this.activeDomainId.set(domainId);

    // 先只做 angular 示例
    if (domainId === "angular") {
      this.loadDomainSchema(domainId);
    } else {
      this.domainVM.set(null);
    }
  }

  async loadDomainSchema(domainId: string) {
    const pid = this.projectId();
    if (!pid) return;
    this.loading.set(true);

    try {
      const doc = await firstValueFrom(this.api.getDomainSchemas(pid, domainId));
      this.domainSchema.set(doc);
      this.domainVM.set(doc.vm);
      this.baselineDomainVM.set(_.cloneDeep(doc.vm));
    } catch (e) {
      console.error(e);
      this.msg.error("加载配置模型失败");
      this.domainVM.set(null);
      this.baselineDomainVM.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async onDiff() {
    const pid = this.projectId();
    const domainId = this.activeDomainId();
    const cur = this.domainVM();
    if (!pid || !domainId || !cur) return;

    this.loading.set(true);

    try {
      const data: DomainSchemaDiffResult = await firstValueFrom(this.api.diffDomainSchema(pid, domainId, cur));
      const docPatch = data?.docPatch ?? {};
      const filePatch = data?.filePatch ?? [];

      const rows: any[] = [];
      for (const [docId, patch] of Object.entries(docPatch)) {
        rows.push(...flattenPatch("doc", docId, patch));
      }
      for (const fp of filePatch) {
        rows.push(...flattenPatch("file", fp.relPath, fp.patch));
      }
      if (rows.length === 0) {
        this.msg.info("没有可写回的变更");
        return;
      }
      rows.sort((a, b) => {
        if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
        const aa = `${a.target}:${a.path}`;
        const bb = `${b.target}:${b.path}`;
        return aa.localeCompare(bb);
      });

      this.modal.create({
        nzTitle: "变更",
        nzContent: `
        <div style="max-height:60vh; overflow:auto;">
          ${rows
            .map(
              (r: any) => `
              <div style="padding:8px 0; border-bottom:1px solid #f0f0f0;">
                <div style="font-weight:600;">[${r.scope}] ${r.target}</div>
                <div style="opacity:.85; margin-top:4px;">${r.path}</div>
                <pre style="margin:6px 0;">after : ${this.safeStringify(r.value)}</pre>
              </div>
            `
            )
            .join("")}
        </div>
      `,
        nzFooter: null,
        nzWidth: 900,
      });
    } catch (e) {
      console.error(e);
      this.msg.error("生成 Diff 失败");
    } finally {
      this.loading.set(false);
    }
  }

  private safeStringify(v: any): string {
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }

  onReset() {
    const base = this.baselineDomainVM();
    if (!base) return;
    this.domainVM.set(_.cloneDeep(base));
    this.msg.success("已重置为未修改状态");
  }

  /** 右侧编辑器 raw 内容变化回传 */
  onRawChange(e: { docId: string; raw: string }) {
    const map = this.docStates();
    const cur = map[e.docId];
    if (!cur) return;

    const baseline = cur.baselineRaw ?? "";
    const dirty = e.raw !== baseline;

    this.docStates.set({
      ...map,
      [e.docId]: { ...cur, raw: e.raw, dirty }
    });
  }

  /** 右侧表单变化回传（整包 values） */
  onValuesChange(e: { type: string; values: Record<string, any> }) {
  }

  async saveActive() {
    const pid = this.projectId();
    const did = this.activeDomainId();
    const vm = this.domainVM();
    if (!pid || !did || !vm) return;

    this.loading.set(true);
    try {
      await firstValueFrom(this.api.writeDomainSchema(pid, did, vm));
      this.msg.success("保存成功");
      // 保存后：更新 baseline（直接重新加载一次，确保与后端 merge/默认值一致）
      await this.loadDomainSchema(did);

    } catch (e) {
      console.error(e);
      this.msg.error("保存失败");
    } finally {
      this.loading.set(false);
    }
  }

  /** 打开配置文件 */
  openConfig() {
    if (!this.selectedDocId()) {
      this.msg.warning('请先选择配置文件');
      return;
    }
    this.api.openInEditor(
      this.projectId()!,
      this.selectedDocId()!).subscribe(res => {
        this.msg.success('已在默认编辑器中打开该配置文件');
        this.isModalVisible.set(false);
      })
  }
}
