import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTypographyModule } from 'ng-zorro-antd/typography';

type DocStatus = 'draft' | 'published';

interface DocItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  status: DocStatus;
  updatedAt: string;
}

@Component({
  selector: 'app-docs-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzTypographyModule
  ],
  template: `
    <section class="page">
      <h2 nz-typography>Docs</h2>
      <nz-alert
        nzType="info"
        nzShowIcon
        nzMessage="Markdown 文件存储在服务器文件系统，当前页面用于编辑元数据与正文。"
      ></nz-alert>

      <nz-card nzTitle="文档列表" class="section">
        <nz-table #table [nzData]="docs()" [nzFrontPagination]="false">
          <thead>
            <tr>
              <th>slug</th>
              <th>标题</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            @for (item of table.data; track item.id) {
              <tr>
                <td>{{ item.slug }}</td>
                <td>{{ item.title }}</td>
                <td><nz-tag [nzColor]="item.status === 'published' ? 'green' : 'orange'">{{ item.status }}</nz-tag></td>
                <td>{{ item.updatedAt }}</td>
                <td><a (click)="edit(item)">编辑</a></td>
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <nz-card [nzTitle]="editingId() ? '编辑文档' : '新建文档'" class="section">
        <form nz-form [formGroup]="form" nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>slug</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="slug" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>标题</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="title" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>摘要</nz-form-label>
            <nz-form-control>
              <textarea nz-input rows="2" formControlName="summary"></textarea>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Markdown 内容</nz-form-label>
            <nz-form-control>
              <textarea nz-input rows="10" formControlName="content"></textarea>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>状态</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="status">
                <nz-option nzValue="draft" nzLabel="draft"></nz-option>
                <nz-option nzValue="published" nzLabel="published"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <div class="actions">
            <button nz-button (click)="resetForm()">重置</button>
            <button nz-button nzType="primary" (click)="save()" [disabled]="form.invalid">保存文档</button>
          </div>
        </form>
      </nz-card>
    </section>
  `,
  styles: `
    .page { background: #fff; border-radius: 10px; padding: 20px; }
    .section { margin-top: 16px; }
    .actions { display: flex; gap: 8px; }
  `
})
export class DocsPageComponent {
  private readonly fb = new FormBuilder();

  protected readonly editingId = signal<string | null>(null);
  protected readonly docs = signal<DocItem[]>([
    {
      id: 'doc-1',
      slug: 'getting-started',
      title: '快速开始',
      summary: 'ngm-hub 的安装与初始化',
      content: '# 快速开始\n\n请先安装 Node.js 20+。',
      status: 'published',
      updatedAt: '2026-03-05 10:00'
    },
    {
      id: 'doc-2',
      slug: 'release-guide',
      title: '发布流程',
      summary: 'CLI/Desktop 发布步骤',
      content: '# 发布流程\n\n1. 打 tag\n2. 发布资源',
      status: 'draft',
      updatedAt: '2026-03-04 17:30'
    }
  ]);

  protected readonly form = this.fb.nonNullable.group({
    slug: ['', [Validators.required]],
    title: ['', [Validators.required]],
    summary: [''],
    content: [''],
    status: ['draft' as DocStatus]
  });

  protected edit(item: DocItem): void {
    this.editingId.set(item.id);
    this.form.reset({
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      content: item.content,
      status: item.status
    });
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ slug: '', title: '', summary: '', content: '', status: 'draft' });
  }

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const now = this.formatNow();

    if (this.editingId() !== null) {
      this.docs.update((list) =>
        list.map((item) => (item.id === this.editingId() ? { ...item, ...value, updatedAt: now } : item))
      );
      return;
    }

    const id = `doc-${Date.now()}`;
    this.docs.update((list) => [{ id, ...value, updatedAt: now }, ...list]);
    this.editingId.set(id);
  }

  private formatNow(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }
}
