import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgDevtoolComponent } from '@app/shared/devtools/ng-devtool.component';
import { ProjectStateService } from '@pages/projects/services/project.state.service';
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

import { firstValueFrom } from 'rxjs';
import { ConfigChangeBarComponent } from './components/config-change-bar-component';
import { ConfigDomainDocsComponent } from './components/config-domain-docs.component';
import { ConfigNavComponent } from './components/config-nav-component';
import { ResolvedDomain } from './models/config-domain.model';
import { ConfigNavNodeVM, DocStateVM, DomainDocMetaVM } from './models/config-ui.model';
import { ConfApiService, ConfigEditSessionStore } from './services';
import { mapResolvedToNav } from './utils/map';
import { NzSelectModule } from 'ng-zorro-antd/select';

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
    ConfigDomainDocsComponent,
    NzModalModule
  ],
  templateUrl: './project-conf.component.html',
  styleUrls: ['./project-conf.component.less'],
})
export class ProjectConfComponent {
  private api = inject(ConfApiService);
  private projectState = inject(ProjectStateService);
  private editStore = inject(ConfigEditSessionStore);
  private msg = inject(NzMessageService);
  private modal = inject(NzModalService);

  projectId = computed(() => this.projectState.currentProjectId() || '');

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

  activeDomain = computed(() => {
    const did = this.activeDomainId();
    return (this.catalog() ?? []).find(x => x.domain.id === did) ?? null;
  });

  activeDocs = computed(() => this.activeDomain()?.docs ?? []);

  activeDocsMeta = computed<DomainDocMetaVM[]>(() => {
    const d = this.activeDomain();
    if (!d) return [];
    return (d.docs ?? []).map(x => ({
      docId: x.spec.id,
      title: x.spec.title,
      description: x.spec.description,
      exists: x.exists,
      relPath: x.chosen?.relPath,
      codec: x.chosen?.codec,
    }));
  });

  // dirty：对 raw 做 dirty（json 可后续）
  domainDirty = computed(() => Object.values(this.docStates()).some(s => !!s.dirty));
  /**
   * 右侧上下文：Project/Target/Configuration 选择框（后续做 UI 时用）
   * - 注意：schema 里 section.target 已经固定 build/serve，因此保存时不依赖 ctx.target
   */
  vmCtx = signal<{ project?: string; target?: string; configuration?: string }>({
    project: undefined,
    target: undefined,
    configuration: undefined,
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
    this.api.getCatalogV2(pid).subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        const firstDomainId = catalog[0]?.domain?.id ?? "";
        if (firstDomainId) {
          this.activeDomainId.set(firstDomainId);
          this.loadDomainDocs(firstDomainId);
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
    this.loadDomainDocs(domainId);
  }

  async loadDomainDocs(domainId: string) {
    const pid = this.projectId();
    const domain = (this.catalog() ?? []).find(x => x.domain.id === domainId);
    if (!pid || !domain) return;

    this.loading.set(true);
    try {
      const nextStates: Record<string, DocStateVM> = {};
      console.log('Loading docs for domain:', domainId, domain.docs);
      for (const d of domain.docs) {
        const docId = d.spec.id;
        if (!d.exists) {
          // missing=hide 的 doc 在 catalog 里通常不会出现；如果出现，按只读处理
          nextStates[docId] = { docId, loading: false, exists: false, dirty: false };
          continue;
        }
        try {
          const r = await firstValueFrom(this.api.readDocV2(pid, docId));
          const raw = r.raw ?? "";
          nextStates[docId] = {
            docId,
            loading: false,
            exists: true,
            codec: r.codec,
            relPath: r.relPath,
            baselineRaw: raw,
            raw,
            json: r.data,
            dirty: false,
          };
        } catch {
          // 读取失败，标记 error
          nextStates[docId] = { docId, loading: false, exists: false, error: '读取失败', dirty: false };
          continue;
        }
      }
      this.docStates.set(nextStates);
      console.log('Loaded doc states:', nextStates);
    } catch (e) {
      console.error(e);
      this.msg.error("加载配置文件失败");
      this.docStates.set({});
    } finally {
      this.loading.set(false);
    }
  }

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
    this.editStore.setCurrent(e.type, e.values);
  }

  onReset() {

  }

  async saveActive() {

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
        console.log('openInEditor response:', res);
      })
  }
}