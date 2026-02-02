// packages/ais-core/src/text/text6.ts

/** ITU-R M.1371-5 Table 44：6-bit ASCII 映射 */
const ITU6_TABLE = [
    '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
    'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '[', '\\', ']', '^', '_', ' ',
    '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?'
];

/** 
 * 根据 R-REC-M.1371-5 标准，获取 AIS 6bit ASCII 字符对应的数值
 * @param ch AIS 6bit ASCII 字符
 */
export function itu6bitVal(ch: string): number {
    const i = ITU6_TABLE.indexOf(ch);
    if (i === -1) throw new Error(`无效 ITU-R M.1371 6-bit ASCII 字符: ${ch}`);
    return i;
}
/**
 * 6bit ASCII → bit 串 IEC 61162-1
 * n = 6 * m
 */
export function encode6bitAscii(text: string): string {
    let bits = '';
    for (const ch of text) {
        const v = itu6bitVal(ch);
        bits += v.toString(2).padStart(6, '0');
    }
    return bits;
}

/**
 * bit 串 → 6bit ASCII IEC 61162-1
 */
export function decode6bitAscii(bits: string): string {
    let text = '';
    for (let i = 0; i < bits.length; i += 6) {
        const chunk = bits.slice(i, i + 6);
        if (chunk.length < 6) {
            throw new Error(`Incomplete 6-bit chunk: "${chunk}"`);
        }
        const v = parseInt(chunk, 2);
        let code: number;
        if (v <= 39) {
            code = v + 48;
        } else if (v >= 40 && v <= 63) {
            code = v + 56;
        } else {
            throw new Error(`Invalid 6-bit value: ${v}`);
        }
        text += String.fromCharCode(code);
    }
    return text;
}


