import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
} from "@angular/core";

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";

type TerminalTheme = {
  background?: string;
  foreground?: string;
  cursor?: string;
  selectionBackground?: string;
};

@Component({
  selector: "app-terminal-view",
  standalone: true,
  template: `<div class="term-wrap" #host></div>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
        min-height: 0;
      }
      .term-wrap {
        height: 100%;
        width: 100%;
        overflow: hidden;
      }
      /* 让 xterm 内部也吃满高度（Angular scoped 样式需要 :global） */
      .term-wrap :global(.xterm),
      .term-wrap :global(.xterm-viewport),
      .term-wrap :global(.xterm-screen) {
        height: 100%;
      }
    `,
  ],
})
export class TerminalViewComponent implements AfterViewInit, OnDestroy {
  @ViewChild("host", { static: true }) host!: ElementRef<HTMLDivElement>;
  @Output() resized = new EventEmitter<{ cols: number; rows: number }>();

  /** 是否自动滚到底部 */
  @Input() follow = true;

  /** xterm 基础配置 */
  @Input() fontSize = 16;
  @Input() fontFamily =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  @Input() cursorBlink = false;
  @Input() cursorStyle: "block" | "underline" | "bar" = "underline";

  /** 可选：主题 */
  @Input() theme?: TerminalTheme;

  private term?: Terminal;
  private fitAddon?: FitAddon;
  private ro?: ResizeObserver;

  private rafId = 0;
  private fitTimer: any;

  private lastCR?: { cols: number; rows: number };

  // 用真实宽高做去抖；避免 RO 抖动导致反复 fit
  private lastSize?: { w: number; h: number };

  // fit 期间忽略 RO（切断回环）
  private fitting = false;

  // 拖拽停止后多久执行 fit
  private readonly FIT_DEBOUNCE_MS = 180;

  constructor(private zone: NgZone) { }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const term = new Terminal({
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        cursorBlink: this.cursorBlink,
        cursorStyle: this.cursorStyle,
        disableStdin: true,
        scrollback: 5000,
        theme: this.theme,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());

      term.open(this.host.nativeElement);

      this.term = term;
      this.fitAddon = fit;

      // 初次 fit：等布局稳定一帧
      this.scheduleFit("init");

      // ResizeObserver：只在“尺寸真的变化”时触发，并且拖拽停下后才 fit
      this.ro = new ResizeObserver((entries) => {
        if (this.fitting) return;

        const rect = entries[0]?.contentRect;
        if (!rect) return;

        // 用像素取整压掉 0.x 抖动
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);

        const prev = this.lastSize;
        if (prev && prev.w === w && prev.h === h) return;

        this.lastSize = { w, h };
        this.scheduleFit("ro");
      });

      this.ro.observe(this.host.nativeElement);
    });
  }

  ngOnDestroy(): void {
    try {
      this.ro?.disconnect();
    } catch { }
    try {
      cancelAnimationFrame(this.rafId);
    } catch { }
    try {
      clearTimeout(this.fitTimer);
    } catch { }
    try {
      this.term?.dispose();
    } catch { }
  }

  /** 写入 chunk（支持 ANSI 高亮） */
  write(chunk: string) {
    const term = this.term;
    if (!term) return;
    term.write(chunk);
    if (this.follow) term.scrollToBottom();
  }

  writeln(line: string) {
    const term = this.term;
    if (!term) return;
    term.writeln(line);
    if (this.follow) term.scrollToBottom();
  }

  clear() {
    this.term?.clear();
  }

  reset() {
    const term = this.term;
    if (!term) return;
    term.write("\x1bc"); // RIS reset
  }

  copyAll(): string {
    const term = this.term;
    if (!term) return "";
    const buf = term.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buf.length; i++) {
      lines.push(buf.getLine(i)?.translateToString(true) ?? "");
    }
    return lines.join("\n");
  }

  scrollToBottom() {
    this.term?.scrollToBottom();
  }

  fit() {
    this.scheduleFit("manual");
  }

  /**
   * - debounce：拖拽过程中不断重置定时器，停下后只 fit 一次
   * - 避免拖拽过程中反复 fit 导致 cols floor 漂移（“滚动条变短”）
   */
  private scheduleFit(_reason: string) {
    clearTimeout(this.fitTimer);
    this.fitTimer = setTimeout(() => {
      cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => this.safeFitAndEmit());
    }, this.FIT_DEBOUNCE_MS);
  }

  private safeFitAndEmit() {
    const term = this.term;
    const fit = this.fitAddon;
    if (!term || !fit) return;

    this.fitting = true;
    try {
      fit.fit();
    } catch {
      // ignore
      return;
    } finally {
      // 下一拍放开，避免同步回环
      queueMicrotask(() => (this.fitting = false));
    }
    const cols = term.cols;
    const rows = term.rows;

    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) return;

    const prev = this.lastCR;
    if (prev && prev.cols === cols && prev.rows === rows) return;

    this.lastCR = { cols, rows };
    this.zone.run(() => this.resized.emit({ cols, rows }));
  }
}
