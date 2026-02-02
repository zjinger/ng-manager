// packages/ais-core/src/text/text14.ts

// “14位中文字符编码规范（B.2）”编码 / 解码
// 作用：把“中英文混排文本”编码成一串 7bit/14bit 的比特串（其实是 7bit 一段一段），供 ASM 描述性补充片段等字段使用
import * as  iconv from "iconv-lite";
import { itu6bitVal } from "./text6";
import { toGb2312 } from "./common";

/* ------------------------------------------------------------------ */
/* ----------------------  B.1 ASCII → 7bit  ------------------------- */
/* ------------------------------------------------------------------ */
/**
 * B.1 机内码(8bit ASCII) → 7位收发代码
 * y1 = x1               , x1 < 0x40
 * y1 = x1 - 0x40        , x1 ≥ 0x40
 *
 * 这里我们只做“编码”方向（ASCII -> 7bit），解码在下面 B.4
 */
function asciiTo7bit_B1(x1: number): number {
  if (x1 < 0x40) return x1;
  return x1 - 0x40;
}

function asciiTo7bitFor14bit(ch: string): string {
  const v6 = itu6bitVal(ch) & 0x3f;
  return v6.toString(2).padStart(7, "0");
}


/* ------------------------------------------------------------------ */
/* ----------------------  B.2 / B.3 汉字 → 13bit  ------------------- */
/* ------------------------------------------------------------------ */
/**
 * B.2 / B.3
 * 已知：A,B 是“清了最高位的”两个 7bit（也就是机内码 x1,x2 的低 7 位）
 *
 * 公式：
 * a = ((A - 0x30) * 4 + floor(B / 0x20)), A < 0x40
 * a = A - 0x40,                             A ≥ 0x40
 *
 * b = (B % 0x20), A < 0x40
 * b = B,          A ≥ 0x40
 */
function han14_to_ab13_B2B3(A: number, B: number): { a: number; b: number } {
  if (A < 0x40) {
    const q = Math.floor(B / 0x20); // B / 32
    const a = (A - 0x30) * 4 + q;
    const b = B % 0x20;
    return { a, b };
  } else {
    const a = A - 0x40;
    const b = B;
    return { a, b };
  }
}

/* ------------------------------------------------------------------ */
/* ----------------  13bit(a,b) → 两个7bit发送(B.2结尾) -------------- */
/* ------------------------------------------------------------------ */
/**
 * 把 a,b 变成最终要“发出去的”两个 7bit：
 * y1 = a | 0x40   （把第7位置“1”）
 * y2 = b
 */
function ab13_to_send14(a: number, b: number): { y1: number; y2: number } {
  const y1 = a | 0x40;
  const y2 = b;
  return { y1, y2 };
}

/* ------------------------------------------------------------------ */
/* ------------------  gb2312 两字节 → 14bit 收发代码 ----------------- */
/* ------------------------------------------------------------------ */
/**
 * 传入：GB2312 两字节机内码
 * 步骤：
 *  1) 清最高位 → A,B
 *  2) 按 B.2 / B.3 求 a,b
 *  3) 把 a 的最高位置 1 → y1,y2
 *  4) 返回两个 7bit 的拼接字符串
 */
function gb2312To14bitSendCode(gb: Uint8Array): string {
  const A = gb[0] & 0x7f;
  const B = gb[1] & 0x7f;
  const { a, b } = han14_to_ab13_B2B3(A, B);
  const { y1, y2 } = ab13_to_send14(a, b);
  return y1.toString(2).padStart(7, "0") + y2.toString(2).padStart(7, "0");
}

/* ------------------------------------------------------------------ */
/* ------------------  主入口：14bit 中文编码 + 英文7位 --------------- */
/* ------------------------------------------------------------------ */
/**
 * 14bit 中文编码 + 英文7位混排
 * - 英文：按 B.1，把 ASCII → 7bit
 * - 中文：GB2312 → (A,B) → (a,b) → (y1,y2)
 *
 * 返回：纯 bit 串（"0" "1"）
 */
export function encode14bitChineseRule(
  text: string,
  toGb2312Fun?: (ch: string) => Uint8Array
): string {
  const toGb2312F = typeof toGb2312Fun === 'function' ? toGb2312Fun : toGb2312;
  if (toGb2312F == null || typeof toGb2312F !== 'function') {
    throw new Error('encode13bitChineseRule: toGb2312 function is required');
  }
  let bits = "";
  for (const ch of text) {
    const cc = ch.charCodeAt(0);
    if (cc < 0x80) {
      // 英文 → B.1
      // const y1 = asciiTo7bit_B1(cc);
      // bits += y1.toString(2).padStart(7, "0");
      bits += asciiTo7bitFor14bit(ch);
    } else {
      // 中文 → B.2/B.3
      const gb = toGb2312(ch);
      bits += gb2312To14bitSendCode(gb);
    }
  }
  return bits;
}

/* ------------------------------------------------------------------ */
/* -------------------------  解  码  部  分 -------------------------- */
/* ------------------------------------------------------------------ */
/**
 * B.4 收发代码(7bit) → 机内码(ASCII)
 * x1 = y1 + 0x40, y1 < 0x20
 * x1 = y1        , y1 ≥ 0x20
 */
export function asciiFrom7bit_B4(y1: number): number {
  if (y1 < 0x20) return y1 + 0x40;
  return y1;
}

/**
 * B.5 / B.6
 * 已知：a,b (注意 a 是清了最高位的 6bit)，要还原成 A,B
 *
 * A = 0x30 + floor(a/4),  b < 0x20
 * A = a + 0x40,          b ≥ 0x20
 *
 * B = b + (a & 3) * 0x20, b < 0x20
 * B = b,                  b ≥ 0x20
 */
export function ab13_to_han14_B5B6(a: number, b: number): { A: number; B: number } {
  let A: number;
  let B: number;
  if (b < 0x20) {
    A = 0x30 + Math.floor(a / 4);
    B = b + (a & 3) * 0x20;
  } else {
    A = a + 0x40;
    B = b;
  }
  return { A, B };
}

/**
 * 解码两个 7bit（第一个 7bit 的最高位=1）→ GB2312 两字节
 */
export function send14ToGb2312(y1: number, y2: number): Uint8Array {
  // 去掉最高位得到 a
  const a = y1 & 0x3f;
  const b = y2;
  // 还原出 A,B
  const { A, B } = ab13_to_han14_B5B6(a, b);
  // 再把最高位加回去就是机内码 x1,x2
  const x1 = A | 0x80;
  const x2 = B | 0x80;
  return new Uint8Array([x1, x2]);
}

/**
 * 把“14bit 中文编码 + 英文7位混排”的 bit 串解码回字符串
 * 规则：
 * - 7bit 里最高位=0 → 英文 → 用 B.4
 * - 7bit 里最高位=1 → 后面还要再取 7bit → 中文 → 用 B.5/B.6
 */
export function decode14bitStream(bits: string): string {
  let i = 0;
  let out = "";
  while (i < bits.length) {
    const remain = bits.length - i;
    if (remain < 7) break;
    const seg1 = bits.slice(i, i + 7);
    const y1 = parseInt(seg1, 2);
    if ((y1 & 0x40) === 0) {
      // 英文
      const x1 = asciiFrom7bit_B4(y1);
      out += String.fromCharCode(x1);
      i += 7;
    } else {
      // 中文，需要再取第二个 7bit
      if (remain < 14) break;
      const seg2 = bits.slice(i + 7, i + 14);
      const y2 = parseInt(seg2, 2);
      const gb = send14ToGb2312(y1, y2);
      const ch = iconv.decode(Buffer.from(gb), "gb2312");
      out += ch;
      i += 14;
    }
  }
  return out;
}

