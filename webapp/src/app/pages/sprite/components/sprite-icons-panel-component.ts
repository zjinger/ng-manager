import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from "@angular/common";
import { Component, OnChanges, SimpleChanges, computed, inject, input, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { SpriteBrowseEntry, SpriteClassMeta, SpriteGroupItem, SpriteMetaFile, SpriteSnapshot, SvgMetaFile } from "@models/sprite.model";
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCodeEditorModule } from "ng-zorro-antd/code-editor";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzGridModule } from "ng-zorro-antd/grid";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzMessageService } from "ng-zorro-antd/message";
import { NzSelectModule } from "ng-zorro-antd/select";
import { LessViewportComponent } from "./less-viewport-component";
import { SpriteViewportComponent } from "./sprite-viewport-component";
import { SpriteApiService } from '../services/sprite-api.service';
import { NzImageModule } from 'ng-zorro-antd/image';
@Component({
  selector: "app-sprite-icons-panel",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzGridModule,
    NzEmptyModule,
    NzCodeEditorModule,
    NzButtonModule,
    NzIconModule,
    ClipboardModule,
    NzInputModule,
    SpriteViewportComponent,
    LessViewportComponent,
    NzBadgeModule,
    NzImageModule
  ],
  template: `
    <div class="wrap">
      <div class="bar">
        <div class="left">
          <span class="label">分组</span>
          <nz-select
            style="width: 220px"
            [ngModel]="group()"
            (ngModelChange)="group.set($event); groupChange($event)"
            nzPlaceHolder="请选择"
          >
            @for (opt of groups(); track opt.group) {
              <nz-option [nzLabel]="opt.group" [nzValue]="opt.group"></nz-option>
            }
          </nz-select>
        </div>
      </div>

      @if(!activeItem()){
        <nz-empty nzNotFoundContent="没有可展示的分组"></nz-empty>
      } @else {
        <div class="grid">
          <div class="panel">
            <div class="panel-header">
               <div class="panel-title column">
                <div class="text">图标预览</div>
                <div class="sub-text">共12个图标</div>
              </div>
              <div class="search">
                <input type="text" placeholder="搜索图标名称或类名" nz-input />
              </div>
            </div>

            @if(iconClasses().length === 0 && icons().length === 0){
              <nz-empty nzNotFoundContent="该分组没有可用图标"></nz-empty>
            } @else {
              <div class="icon-grid">
                @if(mode() === 'svg'){
                  @for (c of icons(); track c.name) {
                    <div class="icon-card" (click)="copySvg(c)">
                      <div class="thumb">
                        @if(c.kind === 'file' && c.url){
                          <img  nz-image [nzSrc]="c.url" [alt]="c.name" loading="lazy" />
                        }
                      </div>
                      <div class="meta">
                        <div class="name">{{c.name}}</div>
                      </div>
                    </div>
                  }
                }@else{
                  @for (c of iconClasses(); track c.className) {
                  <div class="icon-card" (click)="copySpriteClass(c.className)">
                    <div class="thumb">
                      <div class="sprite" [ngStyle]="spriteStyle(c)"></div>
                    </div>
                    <div class="meta">
                      <div class="name">{{c.name}}</div>
                      <div class="cls">{{c.className}}</div>
                      <nz-badge [nzStatus]="activeClassName() === c.className ? 'processing' : 'default'" />
                    </div>
                  </div>
                }
                }
              </div>
            }
          </div>

          <div class="panel">
              <div class="panel-header">
               <div class="panel-title column">
                <div class="text">生成结果</div>
                <div class="sub-text">LESS/CSS 样式，包含雪碧图背景定位等信息</div>
              </div>
              <div class="actions">
                <!-- <button nz-button nzType="text" (click)="copyCss()" [disabled]="!cssText()">
                  <nz-icon nzType="reload"></nz-icon>
                </button> -->
              </div>
             </div>
              <div class="sprite-content">
                 <app-sprite-viewport [(activeClassName)]="activeClassName" [item]="activeItem()"/>
              </div>
              <div class="css-content">
                 <app-less-viewport [cssText]="cssText()"/>
              </div>
             </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wrap{ height:100%; min-height:0; display:flex; flex-direction:column; gap:12px; }
    .bar{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .left{ display:flex; align-items:center; gap:10px; min-width:0; }
    .label{ opacity:.8; }
    .hint{ opacity:.75; max-width:520px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ok{ color:#52c41a; }

    .grid{
      flex:1 1 auto;
      min-height:0;
      display:grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr);
      gap: 12px;
    }
    @media (max-width: 1100px){ .grid{ grid-template-columns: 1fr; } }

    .panel{
      border: 1px solid rgba(15, 23, 42, .12);
      border-radius: 20px;
      min-height:0;
      display:flex;
      flex-direction:column;
      background: rgba(255,255,255,.02);
    }
    .panel-header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:12px 12px;
      border-bottom: 1px solid rgba(15, 23, 42, .12);
    }
    .panel-title{ 
        display:flex;
        &.column{ flex-direction:column;  }
        .text{ font-size:14px; font-weight:500; }
        .sub-text{ font-size:12px; opacity:.75; }
     }
     .search{ width:240px; }

    .icon-grid{
      display:grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 10px;
      overflow:auto;
      padding-right: 4px;
      padding:12px;
    }
    .icon-card{
      cursor:pointer;
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 14px;
      background: rgba(0,0,0,.5);
      transition: transform .08s ease, border-color .08s ease;
      user-select:none;
      color: #fff;
      display:flex;
      align-items:center;
      justify-content: space-between;
      padding: 12px 16px;
    }
    .icon-card:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.9); }
    .thumb{
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .meta .name{ font-size:12px; opacity:.9; }
    .meta .cls{ font-size:12px; opacity:.65; }
    .meta {
      position:relative;
    }
    .meta nz-badge{
      position:absolute;
      top:-12px;
      right:0;
    }
    .sprite-content{
      padding: 16px 16px 0 16px;
    }
    .css-content{
      padding:12px;
      line-height: 1.5;
      flex:1 1 auto;
      overflow:hidden;
    }
  `]
})
export class SpriteIconsPanelComponent implements OnChanges {
  private clipboard = inject(Clipboard);
  private msg = inject(NzMessageService);
  private api = inject(SpriteApiService);


  sprite = input<SpriteSnapshot | null>(null);

  groups = computed<SpriteGroupItem[]>(() => {
    return this.sprite()?.groups ?? [];
  });
  group = signal<string>("");
  activeItem = computed(() => {
    const g = this.group();
    return this.groups().find((x) => x.group === g) ?? null;
  });
  mode = computed<"svg" | "png">(() => {
    return this.activeItem()?.kind === "svg" ? "svg" : "png";
  })
  activeClassName = signal<string>("");

  activePreviewSpriteUrl = computed(() => {
    const it = this.activeItem();
    return it?.previewSpriteUrl ?? null;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["sprite"]) {
      const firstItem = this.sprite()?.groups?.[0];
      if (firstItem) {
        const firstGroup = firstItem.group ?? "";
        this.group.set(firstGroup);
        this.groupChange(firstGroup);
      }
    }
  }

  groupChange(group: string) {
    if (this.activeItem()?.kind === 'svg') {
      this.loadImages(group);
    }
  }

  loadImages(group: string) {
    const id = this.sprite()?.projectId ?? ''
    if (!id) return;
    this.api.browseIconFiles(id, group)
      .subscribe(res => {
        const icons = res.entries ?? [];
        this.icons.set(icons);
      });
  }

  private baseClass = computed(() => {
    const prefix = this.sprite()?.config?.prefix || "sl";
    const g = this.group();
    const sizes = String(g).split("-");
    if (sizes.length > 1) {
      const [w, h] = sizes
      if (w !== h) {
        return `${prefix}-${sizes[0]}-${sizes[1]}`
      }
      return `${prefix}-${sizes[0]}`
    }
    return `${prefix}-${sizes[0]}`;
  });


  iconClasses = computed(() => {
    const it = this.activeItem();
    const meta = it?.meta as SpriteMetaFile
    const classes = (meta?.classes ?? []);
    return classes
      .filter((x) => !!x.className);
  });

  icons = signal<SpriteBrowseEntry[]>([]);

  cssText = computed(() => {
    const it = this.activeItem();
    return String(it?.lessText ?? "");
  });

  async copySpriteClass(className: string) {
    const tpl = this.sprite()?.config?.template || `<i class="{base} {class}"></i>`;
    const html = tpl
      .replaceAll("{base}", this.baseClass())
      .replaceAll("{class}", className);

    this.activeClassName.set(className);
    this.clipboard.copy(html);
    const safe = escapeHtmlText(html);
    const tip = `已复制：${safe}`
    this.msg.success(tip);
  }

  async copySvg(c: SpriteBrowseEntry) {
    const tpl = this.sprite()?.config?.template;
    if (!tpl) return;
    const item = this.activeItem();
    const meta = item?.meta as SvgMetaFile;
    if (!meta) return;
    const size = meta?.size
    const svgMeta = meta.icons.find(i => i.file === c.name);
    if (!svgMeta) return;
    const html = tpl.replaceAll("{name}", svgMeta.name).replaceAll("{size}", size).replaceAll("{base}", svgMeta.className).replaceAll("{group}", meta.group);
    this.clipboard.copy(html);
    const safe = escapeHtmlText(html);
    const tip = `已复制：${safe}`
    this.msg.success(tip);
  }

  async copyCss() {
    const t = this.cssText();
    if (!t) return;
    this.clipboard.copy(t);
    this.msg.success("已复制");
  }

  private baseSpriteStyle() {
    const item = this.activeItem(); // SpriteGroupItem
    const url = item?.previewSpriteUrl; // 推荐用 previewSpriteUrl
    if (!url) return {};
    const meta = item?.meta as SpriteMetaFile;
    return {
      backgroundImage: `url("${url}")`,
      backgroundRepeat: "no-repeat",
      backgroundSize: meta ? `${meta.spriteWidth}px ${meta.spriteHeight}px` : "initial",
    };
  }

  spriteStyle(c: SpriteClassMeta) {
    if (!c) return {};
    const base = this.baseSpriteStyle();
    return {
      ...base,
      width: `${c.width}px`,
      height: `${c.height}px`,
      backgroundPosition: `-${c.x}px -${c.y}px`,
    };
  }
}

function escapeHtmlText(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}