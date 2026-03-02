import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, input, Input, model, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SpriteClassMeta, SpriteGroupItem } from '@models/sprite.model';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSpaceModule } from 'ng-zorro-antd/space';

@Component({
  selector: 'app-sprite-viewport',
  imports: [
    CommonModule,
    NzCheckboxModule,
    FormsModule,
    NzSpaceModule,
    NzBadgeModule
  ],
  template: `
    <div class="view-card bg-fx">
      <div class="view-header">
        <nz-space>
          <div class="tip">
            <nz-badge nzColor="purple"/>
            鼠标滚轮缩放
          </div>
          <div class="tip">
            <nz-badge nzColor="geekblue"/>
            拖拽移动
          </div>
        </nz-space>
        <div class="actions">
          <nz-space>
            <label nz-checkbox [(ngModel)]="showGrid">像素网格</label>
            <label nz-checkbox [(ngModel)]="showBoxes">切片框</label>
          </nz-space>
        </div>
      </div>
      <div class="viewport" #viewport 
        [style.height.px]="(item?.meta?.spriteHeight ?? 0) + 48"
        [class.grid-fx]="showGrid"
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp()"
        (mouseleave)="onMouseUp()"
        (wheel)="onWheel($event)"
        (click)="clearActiveIfBlank($event)"
      >
        <div class="stage abs inset-0"  [style.transform]="stageTransform()" style="transform-origin: 0 0;">
          <div class="sprite abs" [style.width.px]="item?.meta?.spriteWidth" [style.height.px]="item?.meta?.spriteHeight">
            <div class="abs inset-0"  [style.backgroundImage]="'url(' + previewSpriteUrl + ')'"
                    style="background-repeat:no-repeat;background-position:0 0;background-size:100% 100%;opacity:.95;" ></div>
            <div class="abs inset-0 abs2"></div>
            <div class="abs inset-0 boxes" [style.display]="showBoxes ? 'block' : 'none'">
              @for (cls of classes; track cls.name) {
                <div
                    class="abs box-item transition"
                    [class.active]="activeClassName() === cls.className"
                  
                    [style.left.px]="cls.x"
                    [style.top.px]="cls.y"
                    [style.width.px]="cls.width"
                    [style.height.px]="cls.height"
                    (mousemove)="onBoxMove($event, cls)"
                    (mouseleave)="onBoxLeave()"
                    (click)="$event.stopPropagation(); setActive(cls.name)"
                  ></div>
              }
            </div>
          </div>
        </div>
        <div class="tooltip abs"
                [class.hidden]="!tooltip().visible"
                [style.left.px]="tooltip().left"
                [style.top.px]="tooltip().top"
        >
          <div class="font-medium">{{ tooltip().name }}</div>
          <div >{{ tooltip().meta }}</div>
        </div>
      </div>
      <div class="info-bar"></div>
    </div>
  `,
  styles: [`
      .view-card{
        border: 1px solid rgba(15, 23, 42, 0.12);
        position:relative;
        border-radius: 12px;
        overflow: hidden;
      }
      .view-header{
        padding:8px 12px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        .tip{
          display:inline-flex;
          align-items:center;
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
        }
        label{
          color: rgba(255, 255, 255, 0.8);
        }
      }
      .viewport{
        cursor: default;
        min-height: 360px;
        background-color: rgb(5, 8, 21);
        position:relative;
        overflow: hidden;
        &.grid-fx{
        background-image:
            linear-gradient(to right, rgba(148, 163, 184, .06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, .06) 1px, transparent 1px);
        background-size: 28px 28px;
        }
      }
      /* 微弱噪点 + 渐变背景 */
      .bg-fx {
          background:
              radial-gradient(1200px 650px at 20% 10%, rgba(34, 211, 238, .14), transparent 55%),
              radial-gradient(900px 520px at 80% 35%, rgba(124, 58, 237, .16), transparent 55%),
              radial-gradient(900px 520px at 40% 90%, rgba(52, 211, 153, .10), transparent 55%),
              linear-gradient(180deg, #050816 0%, #070B18 40%, #050816 100%);
          position: relative;
      }
      .bg-fx:before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: .10;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
        mix-blend-mode: overlay;
      }
      .sprite{
        border-radius: 12px;
        background-color: rgba(255,255,255,.02);
        top:24px;
        left:24px;
        --tw-ring-offset-shadow: 0 0 #0000;
        --tw-shadow: 0 0 0 1px rgba(34, 211, 238, .14), 0 24px 80px rgba(0, 0, 0, .55);
        --tw-shadow-colored: 0 0 0 1px var(--tw-shadow-color), 0 24px 80px var(--tw-shadow-color);
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
      }
      .abs{
        position:absolute;
      }
      .inset-0{
        left:0;
        top:0;
        right:0;
        bottom:0;
      }
      .abs2{
        border-radius:12px;
        background: linear-gradient(135deg, rgba(34, 211, 238, .08), rgba(124, 58, 237, .10));
      }
      .transition {
        transition-property: color, background-color, border-color, fill, stroke, opacity, box-shadow, transform, filter, -webkit-text-decoration-color, -webkit-backdrop-filter;
        transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
        transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter, -webkit-text-decoration-color, -webkit-backdrop-filter;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 150ms;
      }
      .box-item{
        border-width: 1px;
        border-style: solid;
        border-color: rgba(255,255,255,.15);
        &:hover{
          border-color: rgba(124, 58, 237, .40);
        }
        &.active{
          border-color: rgba(34,211,238,.70);
          box-shadow: 0 0 0 1px rgba(34,211,238,.25), 0 0 28px rgba(34,211,238,.18);
        }
      }
      .tooltip{
        pointer-events:none;
        z-index:10;
        border-radius: 8px;
        border:1px solid rgba(148, 163, 184, .14);
        background-color: rgba(18, 28, 52, 0.7);
        padding: 6px 10px;
        box-shadow: 0 0 0 1px rgba(34, 211, 238, .25), 0 10px 30px rgba(124, 58, 237, .18);
        color: #fff;
        &.hidden{
          display:none;
        }
      }
    `],
})
export class SpriteViewportComponent {
  @Input() item: SpriteGroupItem | null = null;

  @ViewChild('viewport', { static: true }) viewportRef!: ElementRef<HTMLDivElement>;

  activeClassName = model<string>("");

  showGrid = true;
  showBoxes = true;

  scale = signal(1);
  tx = signal(0);
  ty = signal(0);
  dragging = signal(false);
  last = signal({ x: 0, y: 0 });

  // Tooltip & Toast
  tooltip = signal({
    visible: false,
    left: 0,
    top: 0,
    name: '—',
    meta: '—',
  });

  get classes() {
    return this.item?.meta?.classes ?? [];
  }

  get previewSpriteUrl() {
    return this.item?.previewSpriteUrl ?? "";
  }

  setActive(className: string) {
    this.activeClassName.set(className);
  }

  stageTransform = computed(() => {
    return `translate(${this.tx()}px, ${this.ty()}px) scale(${this.scale()})`;
  });

  onBoxMove(e: MouseEvent, cls: SpriteClassMeta) {
    if (!this.showBoxes) return;
    if (this.activeClassName() !== cls.className) {
      this.setActive(cls.className);
    }
    const r = this.viewportRef.nativeElement.getBoundingClientRect();
    this.tooltip.set({
      visible: true,
      left: e.clientX - r.left + 10,
      top: e.clientY - r.top + 10,
      name: cls.name,
      meta: `${cls.width}×${cls.height} · (-${cls.x}px, -${cls.y}px)`,
    });
  }

  onBoxLeave() {
    this.tooltip.set({
      ...this.tooltip(),
      visible: false,
    });
  }

  // ====== Pan / Zoom ======
  onMouseDown(e: MouseEvent) {
    this.dragging.set(true);
    this.last.set({ x: e.clientX, y: e.clientY });
  }

  onMouseUp() {
    this.dragging.set(false);
  }

  onMouseMove(e: MouseEvent) {
    if (!this.dragging()) return;
    const last = this.last();
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    this.last.set({ x: e.clientX, y: e.clientY });
    this.tx.set(this.tx() + dx);
    this.ty.set(this.ty() + dy);
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = this.viewportRef.nativeElement.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const delta = -Math.sign(e.deltaY) * 0.08;
    const current = this.scale();
    const next = this.clamp(current * (1 + delta), 0.6, 3);

    const wx = (mx - this.tx()) / current;
    const wy = (my - this.ty()) / current;

    this.scale.set(next);
    this.tx.set(mx - wx * next);
    this.ty.set(my - wy * next);
  }

  clearActiveIfBlank(e: MouseEvent) {
    // 点击空白处清空选中（注意：boxes 会 stopPropagation）
    const target = e.target as HTMLElement;
    if (target.id === 'viewport') this.setActive("");
  }

  private clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }
}
