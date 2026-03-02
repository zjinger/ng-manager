import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from "@angular/common";
import { Component, Input, computed, inject } from "@angular/core";
import { NzEmptyModule } from "ng-zorro-antd/empty";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMessageService } from "ng-zorro-antd/message";
import { SpriteConfig, SpriteSnapshot, } from "@models/sprite.model";

type ImgItem = { name: string; url: string };

@Component({
  selector: "app-sprite-images-panel",
  standalone: true,
  imports: [CommonModule, NzEmptyModule, NzButtonModule, NzIconModule],
  template: `
    <div class="wrap">
      @if(images().length === 0){
        <nz-empty nzNotFoundContent="暂无图片列表（后续可从 cutImageSvn 扫描并映射 URL）"></nz-empty>
      } @else {
        <div class="img-grid">
          @for (img of images(); track img.url) {
            <div class="img-card">
              <div class="thumb">
                <img [src]="img.url" [alt]="img.name" loading="lazy" />
              </div>
              <div class="meta">
                <div class="name">{{img.name}}</div>
                <button nz-button nzSize="small" (click)="copy(img.url)">
                  <nz-icon nzType="copy"></nz-icon>
                  复制URL
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .wrap{ height:100%; min-height:0; }
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
    .thumb{ height: 160px; background: rgba(0,0,0,.18); display:flex; align-items:center; justify-content:center; }
    .thumb img{ max-width:100%; max-height:100%; object-fit:contain; }
    .meta{ padding: 10px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .name{ font-size:12px; opacity:.85; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  `]
})
export class SpriteImagesPanelComponent {
  @Input() gen: SpriteSnapshot | null = null;
  @Input() cfg: SpriteConfig | null = null;

  private clipboard = inject(Clipboard);
  private msg = inject(NzMessageService);

  images = computed<ImgItem[]>(() => {
    // 目前 SpriteSnapshot 没定义 images 字段，这里先留扩展口：
    // 后续可以让 generate 接口返回 images 或另一个 state signal 传进来
    const list = (this.gen as any)?.images ?? (this.gen as any)?.miscImages ?? [];
    return (list as any[])
      .map((x) => ({ name: String(x.name ?? x.file ?? ""), url: String(x.url ?? "") }))
      .filter((x) => x.url);
  });

  copy(url: string) {
    this.clipboard.copy(url);
    this.msg.success("已复制图片 URL");
  }
}