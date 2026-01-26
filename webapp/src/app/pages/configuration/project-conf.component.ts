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

import * as _ from 'lodash';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { firstValueFrom } from 'rxjs';
import { ConfigChangeBarComponent } from './components/config-change-bar-component';
import { ConfigNavComponent } from './components/config-nav-component';
import { ConfigSectionComponent } from './components/config-section-component';
import { ConfigNavNodeVM, DocStateVM, DomainDocMetaVM, DomainSchemaDoc, ResolvedDomain } from './models';
import { ConfApiService, } from './services';
import { mapResolvedToNav } from './utils/map';

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
    ConfigSectionComponent
  ],
  templateUrl: './project-conf.component.html',
  styleUrls: ['./project-conf.component.less'],
})
export class ProjectConfComponent {
  private api = inject(ConfApiService);
  private projectState = inject(ProjectStateService);
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

  domainSchema = signal<DomainSchemaDoc | null>(null);
  // 当前 domain 级 VM（由多个 doc 组装而成）
  domainVM = signal<any | null>(null);
  baselineDomainVM = signal<any | null>(null);

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
      // description: x.spec.description,
      exists: x.exists,
      relPath: x.chosen?.relPath,
      codec: x.chosen?.codec,
    }));
  });

  // dirty：对 raw 做 dirty（json 可后续）
  domainDirty = computed(() => Object.values(this.docStates()).some(s => !!s.dirty));

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
        const firstDomainId = catalog[0]?.domain?.id ?? "";
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
        this.msg.success('已在默认编辑器中打开该配置文件');
        this.isModalVisible.set(false);
      })
  }
}