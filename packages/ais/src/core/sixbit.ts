// packages/ais/src/core/sixbit.ts
import { BitBuffer } from './bit-buffer';

/**
 * @description 六位编码结果类型
 */
export interface SixbitEncodeResult {
    payload: string; // "A>0..."
    padBits: number; // 0..5
}

/**
 * @description 将 0..63 范围内的数值转换为 AIS 6bit 编码字符
 * @param v 数值（0..63）
 * @returns AIS 6bit 编码字符
 * @throws {Error} 数值不在 0..63 范围内
 */
export function sixbitToChar(v: number): string {
    if (v < 0 || v > 63) throw new Error(`sixbit out of range: ${v}`);
    const code = v < 40 ? v + 48 : v + 56;
    return String.fromCharCode(code);
}

/**
 * @description 将 BitBuffer 转换为 AIS 6bit 编码字符串
 * @param buf BitBuffer 实例
 * @returns { payload: string; padBits: number } 六位编码字符串及填充位数
 */
export function bitBufferToSixbit(buf: BitBuffer): SixbitEncodeResult {
    const bits = buf.toArray();
    const padBits = (6 - (bits.length % 6)) % 6;
    const total = bits.length + padBits;
    const padded = bits.slice();
    for (let i = 0; i < padBits; i++) padded.push(0);

    let out = '';
    for (let i = 0; i < total; i += 6) {
        const chunk =
            (padded[i] << 5) |
            (padded[i + 1] << 4) |
            (padded[i + 2] << 3) |
            (padded[i + 3] << 2) |
            (padded[i + 4] << 1) |
            padded[i + 5];
        out += sixbitToChar(chunk);
    }
    return { payload: out, padBits };
}

