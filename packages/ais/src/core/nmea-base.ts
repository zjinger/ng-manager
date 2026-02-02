// packages/ais-core/src/core/nmea-base.ts

import type { NmeaSentence, AisTalker, AisFormatter, AISChannelSel, ASMChannelSel } from './nmea-types';

export interface BuildNmeaOptions {
    talker: AisTalker;   // "AI" / "AB" 等
    formatter: AisFormatter;
    fields: (string | number | '')[];
}

/**
 * 构建 NMEA 语句的选项
 */
export interface BuildNmeaParams {
    talker?: AisTalker;
    /**报文格式 */
    formatter: AisFormatter;
    /** 序列号（0..9，默认 0；多片时相同，单片可空） */
    seqId?: number;
    /** 被封装报文的 6-bit 字符串（只放“负载”部分，例如 8号= DAC+FI+app） */
    sixbit: string;
    /** 填充位数 :最后一条语句才使用的 padBits（0..5） */
    padBits: number;
    /** 
     * ASM 频道（0/空=无偏好；1=ASM1；2=ASM2；3=两信道） 
     * AIS 频道（0：不选择信道广播，1：AIS信道A广播，2：AIS 信道B广播，3：AIS信道A和B都广播）
     */
    channel: ASMChannelSel | AISChannelSel;
    /**
     * 可选：强制限制每条 NMEA 行的最大总长度（含前缀和校验，不含 CRLF）。
     * 每句 six-bit 最大字符数（默认 80，按设备可调整）
     */
    maxLineLen?: number;
}

/**
 * 计算 NMEA 校验和（不含起始 '!' 和结束 '*'）
 * 取整句中从第一个字符 '!' 后面开始，到星号 '*' 之前为止的所有字符
 * 逐字符做 按位异或 XOR；
 * 把结果转成 两位十六进制大写（不足两位左侧补 0）
 */
export function nmeaChecksum(payload: string): string {
    let cs = 0;
    for (let i = 0; i < payload.length; i++) cs ^= payload.charCodeAt(i);
    return cs.toString(16).toUpperCase().padStart(2, '0');
}

/** 拼一条完整 NMEA 语句（带 *CS） */
export function buildNmeaSentence(opts: BuildNmeaOptions): NmeaSentence {
    const { talker, formatter, fields } = opts;
    const head = `${talker}${formatter}`;
    const body = [head, ...fields].join(',');
    const cs = nmeaChecksum(body);
    return { raw: `${body}*${cs}` };
}