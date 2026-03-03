import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from "@angular/common";
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from "@angular/core";
import { FormsModule } from '@angular/forms';
import { SpriteBrowseEntry, SpriteSnapshot } from "@models/sprite.model";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from "ng-zorro-antd/message";
import { SpriteApiService } from '../services/sprite-api.service';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzImageModule } from 'ng-zorro-antd/image';
type DirCrumb = { label: string; dir: string }; // dir = '' 表示 root
@Component({
  selector: "app-sprite-images-panel",
  standalone: true,
  imports: [CommonModule, FormsModule, NzEmptyModule, NzButtonModule, NzIconModule, NzInputModule, NzTagModule, NzImageModule],
  template: `
    <div class="wrap">
      <div class="header">
          <input nz-input placeholder="搜索文件名" [(ngModel)]="keyword"/>
          <div class="count">
           共 {{imagesCount()}} 张图片
          </div>
      </div>
      @if(cachedImages().length === 0){
        <nz-empty nzNotFoundContent="暂无图片列表（后续可从 cutImageSvn 扫描并映射 URL）"></nz-empty>
      } @else {
        <div class="dir-stack">
         @for(crumb of dirStack;let i = $index; track crumb.dir) {
          <nz-tag color="blue" class="dir-item" (click)="loadDir(crumb)">
            {{crumb.label}}
          </nz-tag>
          @if(i < dirStack.length - 1){
              <nz-icon nzType="right" nzTheme="outline"></nz-icon>
          }
        }
        </div>
        <nz-image-group>
        <div class="img-grid">
          @for (img of images(); track img.url) {
            <div class="img-card">
              <div class="thumb">
                @if(img.kind==='file'){
                  <img  nz-image [nzSrc]="img.url!" [nzFallback]="'/images/placeholder.png'" [nzPlaceholder]="'/images/placeholder.png'" [alt]="img.name" loading="lazy" />
                }@else {
                  <div class="dir" title="目录" (click)="openDir(img)">
                    <nz-icon nzType="folder" nzTheme="fill"></nz-icon>
                  </div>
                }
              </div>
              <div class="meta">
                <div class="name">{{img.name}}</div>
                @if(img.kind === 'dir' && img.fileCount !== undefined){
                  <div class="file-count">共{{img.fileCount}} 张图片</div>
                }
                <!-- <button nz-button nzSize="small" (click)="copy(img.url!)">
                  <nz-icon nzType="copy"></nz-icon>
                  复制URL
                </button> -->
              </div>
            </div>
          }
        </div>
      </nz-image-group>
      }
    </div>
  `,
  styles: [`
    .wrap{ height:100%; min-height:0; overflow-y:auto; padding:12px; }
    .header{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
    .header .count{ font-size:14px; opacity:.45; flex:0 0 auto; white-space:nowrap; }
    .dir-stack{ display:flex; align-items:center; gap:6px; margin-bottom:12px; flex-wrap:wrap; }
    .dir-item{ cursor: pointer; }
    .img-grid{
      display:grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      overflow:auto;
      padding-right: 4px;
    }
    .img-card{
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 16px;
      overflow:hidden;
      background: rgba(255,255,255,.02);
      display:flex;
      flex-direction:column;
    }
    .thumb{ height: 160px; background: rgba(0,0,0,.18); display:flex; align-items:center; justify-content:center; user-select:none;}
    .thumb img{ max-width:100%; max-height:100%; object-fit:contain; cursor: pointer;   }
    .thumb img:focus,.thumb:focus{outline:none}
    .thumb .dir{ color: rgba(255,255,255,.6); font-size:56px; cursor:pointer; }
    .meta{ padding: 10px; display:flex; align-items:center; justify-content:space-between; gap:10px; background: rgba(0,0,0,.04);  }
    .name{ font-size:14px; opacity:.85; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .file-count{ font-size:14px; opacity:.45;flex:0 0 auto; white-space:nowrap; }
  `]
})
export class SpriteImagesPanelComponent implements OnInit, OnChanges {

  @Input() sprite: SpriteSnapshot | null = null;

  private api = inject(SpriteApiService);
  private clipboard = inject(Clipboard);
  private msg = inject(NzMessageService);
  private currentDir = signal<string>(''); // '' root
  dirStack: DirCrumb[] = [{ label: '根目录', dir: '' }]; // 记录当前路径，支持返回上级

  cachedImages = signal<SpriteBrowseEntry[]>([]);
  imagesCount = computed(() => this.images().filter(i => i.kind === 'file').length);
  keyword = signal<string>('');
  ngOnInit(): void {

  }
  ngOnChanges(changes: SimpleChanges): void {
    const sprite = changes['sprite'].currentValue as SpriteSnapshot | null;
    if (sprite) {
      this.dirStack = [{ label: '根目录', dir: '' }];
      this.loadImages(sprite.projectId);
    }
  }
  images = computed(() => {
    const kw = this.keyword().trim().toLowerCase();
    if (!kw) {
      return this.cachedImages();
    }
    else {
      return this.cachedImages().filter(i => i.name.toLowerCase().includes(kw));
    }
  })

  private loadImages(projectId: string, dir: string = '') {
    this.keyword.set('');
    this.currentDir.set(dir);
    this.api.browseImages(projectId, dir)
      .subscribe(res => {
        this.cachedImages.set(res.entries);
      });
  }

  loadDir(crumb: DirCrumb) {
    if (!this.sprite?.projectId) return;
    // 找到点击的 crumb 索引，截断到该层
    const idx = this.dirStack.findIndex(x => x.dir === crumb.dir);
    if (idx >= 0) this.dirStack = this.dirStack.slice(0, idx + 1);
    this.loadImages(this.sprite.projectId, crumb.dir);
  }

  openDir(entry: SpriteBrowseEntry) {
    if (!this.sprite?.projectId) return;
    if (entry.kind !== 'dir') return;

    const name = String(entry.name ?? '').trim();
    if (!name) return;

    const base = this.currentDir();
    const nextDir = base ? `${base}/${name}` : name;
    // push crumb（避免重复 push 同一个）
    this.dirStack = [...this.dirStack, { label: name, dir: nextDir }];

    this.loadImages(this.sprite.projectId, nextDir);
  }

  copy(url: string) {
    this.clipboard.copy(url);
    this.msg.success("已复制图片 URL");
  }
}