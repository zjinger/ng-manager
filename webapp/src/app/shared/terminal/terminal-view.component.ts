import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
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
  template: `
    <div class="term-wrap" #host></div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
      .term-wrap {
        height: 100%;
        width: 100%;
        overflow: hidden;
      }
    `,
  ],
})
export class TerminalViewComponent implements AfterViewInit, OnDestroy {
  @ViewChild("host", { static: true }) host!: ElementRef<HTMLDivElement>;

  /** 是否自动滚到底部 */
  @Input() follow = true;

  /** xterm 基础配置 */
  @Input() fontSize = 16;
  @Input() fontFamily =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  @Input() cursorBlink = false; // 是否闪烁
  @Input() cursorStyle: "block" | "underline" | "bar" = "underline";

  /** 可选：主题（你后续可接你自己的 light/dark token） */
  @Input() theme?: TerminalTheme;

  private term?: Terminal;
  private fitAddon?: FitAddon;
  private ro?: ResizeObserver;

  constructor(private zone: NgZone) { }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const term = new Terminal({
        fontSize: this.fontSize,
        fontFamily: this.fontFamily,
        cursorBlink: this.cursorBlink,
        cursorStyle: this.cursorStyle,
        disableStdin: true, // 先不考虑输入
        scrollback: 5000,
        theme: this.theme,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());

      term.open(this.host.nativeElement);

      this.term = term;
      this.fitAddon = fit;

      // 初次 fit
      this.safeFit();

      // 容器变化 -> fit（轻的节流）
      let t: any;
      this.ro = new ResizeObserver(() => {
        clearTimeout(t);
        t = setTimeout(() => this.safeFit(), 80);
      });
      this.ro.observe(this.host.nativeElement);
    });
  }

  ngOnDestroy(): void {
    try {
      this.ro?.disconnect();
    } catch { }
    try {
      this.term?.dispose();
    } catch { }
  }

  /** 写入 chunk（支持 ANSI 高亮） */
  write(chunk: string) {
    if (!this.term) return;
    this.term.write(chunk);
    if (this.follow) this.scrollToBottom();
  }

  /** 写入一行（会加换行） */
  writeln(line: string) {
    if (!this.term) return;
    this.term.writeln(line);
    if (this.follow) this.scrollToBottom();
  }

  clear() {
    this.term?.clear();
  }

  /** 全量复制：把 buffer 转成文本（适合日志量不太大；后续可做范围复制） */
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
    this.safeFit();
  }

  private safeFit() {
    try {
      this.fitAddon?.fit();
    } catch {
      // fit 偶发会抛（容器未完成布局等），吞掉即可
    }
  }
}
