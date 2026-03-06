import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';

type ReleaseChannel = 'CLI' | 'Desktop';
type ReleaseStatus = 'draft' | 'published' | 'deprecated';

interface ReleaseItem {
  id: string;
  channel: ReleaseChannel;
  version: string;
  title: string;
  notes: string;
  downloadUrl: string;
  status: ReleaseStatus;
  publishedAt: string;
}

@Component({
  selector: 'app-releases-page',
  imports: [
    ReactiveFormsModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
  ],
  template: `
    <section class="page">
      <div class="header">
        <div class="header-row">
          <h1 class="header-title">版本管理</h1>
          <div class="header-desc">客户端版本发布管理</div>
        </div>
        <!-- <div class="actions">
          <button nz-button nzType="primary" (click)="createRelease()">
            <nz-icon nzType="plus" nzTheme="outline" />
            <span>新增版本</span>
          </button>
        </div> -->
      </div>
      <nz-card nzTitle="发布列表">
        <nz-table #table [nzData]="releases()" [nzFrontPagination]="false">
          <thead>
            <tr>
              <th>渠道</th>
              <th>版本号</th>
              <th>状态</th>
              <th>发布时间</th>
              <!-- <th>操作</th> -->
            </tr>
          </thead>
          <tbody>
            @for (item of table.data; track item.id) {
              <tr>
                <td>{{ item.channel }}</td>
                <td>{{ item.version }}</td>
                <td><nz-tag [nzColor]="statusColor(item.status)">{{ item.status }}</nz-tag></td>
                <td>{{ item.publishedAt }}</td>
                <!-- <td><a (click)="edit(item)">编辑</a></td> -->
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <!-- <nz-card [nzTitle]="editingId() ? '编辑版本' : '新建版本'" class="section">
        <form nz-form [formGroup]="form" nzLayout="vertical">
          <div class="grid-2">
            <nz-form-item>
              <nz-form-label>渠道</nz-form-label>
              <nz-form-control>
                <nz-select formControlName="channel">
                  <nz-option nzValue="CLI" nzLabel="CLI"></nz-option>
                  <nz-option nzValue="Desktop" nzLabel="Desktop"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label>版本号</nz-form-label>
              <nz-form-control>
                <input nz-input formControlName="version" />
              </nz-form-control>
            </nz-form-item>
          </div>

          <nz-form-item>
            <nz-form-label>标题</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="title" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>更新说明</nz-form-label>
            <nz-form-control>
              <textarea nz-input rows="6" formControlName="notes"></textarea>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>下载地址</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="downloadUrl" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>状态</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="status">
                <nz-option nzValue="draft" nzLabel="draft"></nz-option>
                <nz-option nzValue="published" nzLabel="published"></nz-option>
                <nz-option nzValue="deprecated" nzLabel="deprecated"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <button nz-button nzType="primary" (click)="save()" [disabled]="form.invalid">保存版本</button>
        </form>
      </nz-card> -->

      <!-- <nz-card nzTitle="客户端接口" class="section">
        <pre class="api-block">GET /api/client/releases/latest</pre>
      </nz-card> -->
    </section>
  `,
  styles: `
    .page { background: #fff; border-radius: 10px; padding: 20px; }
    .subtitle { margin-bottom: 16px; color: #6b7280; }
    .section { margin-top: 16px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .api-block {
      margin: 0;
      padding: 12px;
      border-radius: 8px;
      background: #0f172a;
      color: #f8fafc;
      font-family: Consolas, Monaco, 'Courier New', monospace;
    }
  `
})
export class ReleasesPageComponent {
  private readonly fb = new FormBuilder();

  protected readonly editingId = signal<string | null>(null);
  protected readonly releases = signal<ReleaseItem[]>([
    {
      id: 'rel-1',
      channel: 'Desktop',
      version: '2.6.1',
      title: 'Desktop 稳定版',
      notes: '- 修复缓存失效\n- 优化下载重试',
      downloadUrl: 'https://cdn.example.com/ngm/desktop/2.6.1',
      status: 'published',
      publishedAt: '2026-03-05 14:20'
    },
    {
      id: 'rel-2',
      channel: 'CLI',
      version: '1.9.0-beta.2',
      title: 'CLI Beta',
      notes: '- 新增 release channel 切换',
      downloadUrl: 'https://cdn.example.com/ngm/cli/1.9.0-beta.2',
      status: 'draft',
      publishedAt: '-'
    }
  ]);

  protected readonly form = this.fb.nonNullable.group({
    channel: ['CLI' as ReleaseChannel, [Validators.required]],
    version: ['', [Validators.required]],
    title: ['', [Validators.required]],
    notes: [''],
    downloadUrl: ['', [Validators.required]],
    status: ['draft' as ReleaseStatus, [Validators.required]]
  });

  protected createRelease(): void {
    this.editingId.set(null);
    this.form.reset({
      channel: 'CLI',
      version: '',
      title: '',
      notes: '',
      downloadUrl: '',
      status: 'draft'
    });
  }

  protected edit(item: ReleaseItem): void {
    this.editingId.set(item.id);
    this.form.reset({
      channel: item.channel,
      version: item.version,
      title: item.title,
      notes: item.notes,
      downloadUrl: item.downloadUrl,
      status: item.status
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const now = this.formatNow();
    if (this.editingId() !== null) {
      this.releases.update((list) =>
        list.map((item) =>
          item.id === this.editingId()
            ? {
              ...item,
              ...value,
              publishedAt: value.status === 'published' ? item.publishedAt : '-'
            }
            : item
        )
      );
      return;
    }

    const id = `rel-${Date.now()}`;
    this.releases.update((list) => [
      { id, ...value, publishedAt: value.status === 'published' ? now : '-' },
      ...list
    ]);
    this.editingId.set(id);
  }

  protected statusColor(status: ReleaseStatus): string {
    if (status === 'published') {
      return 'green';
    }
    if (status === 'deprecated') {
      return 'default';
    }
    return 'orange';
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
