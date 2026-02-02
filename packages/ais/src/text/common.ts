import * as iconv from "iconv-lite";
/**
 * 将单个字符转换为 GB2312 两字节机内码
 * @param ch 单个汉字
 * @returns Uint8Array [hi, lo]
 */
export function toGb2312(ch: string): Uint8Array {
    // iconv-lite 默认返回 Buffer，可直接转 Uint8Array
    const buf = iconv.encode(ch, "gb2312");
    if (buf.length !== 2) {
        throw new Error(`字符 "${ch}" 不是 GB2312 范围内的汉字`);
    }
    return new Uint8Array(buf);
}