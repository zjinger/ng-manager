// packages/ais-core/src/text/text13.ts

// “13位中文字符编码规范（B.3）”编码 / 解码
// 依赖：iconv-lite（解码 GB2312 → UTF-8 字符串时用）
import * as iconv from "iconv-lite";
import { itu6bitVal } from "./text6";
import { toGb2312 } from "./common";

/**
 * B.3.1.1 中文转区位码
 * GB2312 两字节机内码：高字节、低字节都 ≥ 0xA0
 * 区位码 = (高字节 - 0xA0) * 100 + (低字节 - 0xA0)
 */
export function gb2312ToQuwei(gb: Uint8Array): number {
    const area = gb[0] - 0xA0; // 区
    const pos = gb[1] - 0xA0;  // 位
    return area * 100 + pos;   // 如 1601、1602
}

/**
 * B.3.1.2 区位码 → 13位二进制
 * 文档：
 * “当区位码大于等于1600时，区位码 – 1600 –（区码 – 16）*6。
 *  小于1600时，区位码 + 3700”
 */
export function quweiTo13bit(quwei: number): number {
    const area = Math.floor(quwei / 100);
    let v = quwei;
    if (v >= 1600) {
        v = v - 1600 - (area - 16) * 6;
    } else {
        v = v + 3700;
    }
    const code13 = (v & 0x0fff) | 0x1000;
    return code13; // 13bit，最高位=1
}

/**
 * 英文字符 → 7bit
 * 文档：英文字符采用7位二进制表示，其中第7位为0，1~6位参照 M.1371 的 6bit ASCII
 */
export function asciiTo7bitFor13bit(ch: string): string {
    const v6 = itu6bitVal(ch) & 0x3f;
    // 第7位=0
    return v6.toString(2).padStart(7, "0");
}

/**
 * 13位中文编码 + 英文7位混排（编码）
 * text: 原始字符串（可混合中英文）
 * toGb2312: 单个汉字 → GB2312 两字节 的函数
 *
 * 返回值是 bit 串，后面直接写进 BitBuffer 就行
 *
 * 文档：13-bit 中文编码时，表134中的文本内容长度 n = 13×a + 7×b
 */
export function encode13bitChineseRule(
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
            // 英文 → 7bit
            bits += asciiTo7bitFor13bit(ch);
        } else {
            // 中文 → GB2312 → 区位码 → 13bit
            const gb = toGb2312F(ch);
            const quwei = gb2312ToQuwei(gb);
            const code13 = quweiTo13bit(quwei);
            bits += code13.toString(2).padStart(13, "0");
        }
    }
    return bits;
}

/* ------------------------------------------------------------------ */
/* --------------------------  解  码  ------------------------------- */
/* ------------------------------------------------------------------ */

/**
 * B.3.2.1 收发代码(13bit) → 区位码
 *
 * “当二进制字符串小于3800时，如果13位二进制能整除94，
 *  需要除以94后减1，不能整除直接除以94。再乘以6后加1600加13位二进制。
 *  大于3800时，13位编码 – 3700”
 */
export function bit13ToQuwei(code13: number): number {
    let chint = code13;
    if (chint > 3800) {
        chint = chint - 3700;
    } else {
        if (chint % 94 === 0) {
            chint = chint + 1600 + (chint / 94 - 1) * 6;
        } else {
            chint = chint + 1600 + Math.floor(chint / 94) * 6;
        }
    }
    return chint;
}

/**
 * B.3.2.2 区位码 → 中文(GB2312 两字节)
 */
export function quweiToGb2312(quwei: number): Uint8Array {
    // 确保是 4 位
    const s = quwei.toString().padStart(4, "0");
    const area = parseInt(s.slice(0, 2), 10);
    const pos = parseInt(s.slice(2), 10);
    const hi = area + 0xA0;
    const lo = pos + 0xA0;
    return new Uint8Array([hi, lo]);
}

/**
 * 解码单个“13bit 中文” → UTF-8 字符串
 * （注意这里只解一“个”汉字，外面要负责切 13bit 边界）
 */
export function decode13bitChineseChar(code13: number): string {
    const quwei = bit13ToQuwei(code13);
    const gb = quweiToGb2312(quwei);
    // 再从 gb2312 转成 JS 字符串
    return iconv.decode(Buffer.from(gb), "gb2312");
}

/**
 * 解码一个“13/7 混合的 bit 串”
 * 规则：
 * - 先看剩余长度
 * - 如果第1位是0 → 按 7bit 英文取
 * - 如果第1位是1 → 按 13bit 中文取
 *
 * 注意：这一条要跟你上层的“编码类型=2（13bit）”配合使用
 */
export function decode13bitStream(bits: string): string {
    let i = 0;
    let out = "";
    while (i < bits.length) {
        const remain = bits.length - i;
        if (remain >= 13 && bits[i] === "1") {
            // 13bit 中文
            const seg = bits.slice(i, i + 13);
            const code13 = parseInt(seg, 2);
            const ch = decode13bitChineseChar(code13);
            out += ch;
            i += 13;
        } else if (remain >= 7) {
            // 7bit 英文
            const seg = bits.slice(i, i + 7);
            const v = parseInt(seg, 2); // v 一定是 0..63
            // 按 B.1 / M.1371 的反向来
            // B.4: x1 = y1 + 0x40, y1 < 0x20; else x1 = y1
            let x1: number;
            if (v < 0x20) x1 = v + 0x40;
            else x1 = v;
            out += String.fromCharCode(x1);
            i += 7;
        } else {
            // 剩下的不够 7/13，就丢掉或者break
            break;
        }
    }
    return out;
}
