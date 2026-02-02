/**
 * buildBBMSentences — 生成 BBM（二进制广播消息）语句组
 * ──────────────────────────────────────────────────────────────────────────────
 * - 本函数仅封装 ASM 信息(应用数据)
 *    负载格式为：[DAC(10) + FI(6)] + [应用数据 appBits] 
 * 
 * - 多语句规则：
 *  - 每条 NMEA 语句字段：
 *     total,num,seqId,channel,msgId,sixbit,padBits
 * - 分片规则：
 *     首句 ≤ 58，续句 ≤ 60 six-bit 字符，以满足行长 ≤ 82 字符；
 *     padBits 仅末句使用；前句固定 0；
 * - 校验：
 *     校验和为 XOR(所有字符，起始符 '!' 之后到 '*' 之前)。
 * 例：
 *   !--BBM,2,1,0,1,8,<payload-part1>,0*hh
 *   !--BBM,2,2,0,1,8,<payload-part2>,3*hh
 */

import { BuildNmeaParams, buildNmeaSentence } from './nmea-base';
import { NmeaSentence } from './nmea-types';

/** 生成 BBM 的参数 */
export interface BuildBBMOptions extends BuildNmeaParams {
    formatter: 'BBM';
    /** BBM 字段5：被封装的 AIS 报文 ID（8/14/25/26...） */
    msgId: number;
    /** 首句最大 6bit 载荷字符数（默认 58） */
    firstSentenceMax?: number;
    /** 续句最大 6bit 载荷字符数（默认 60） */
    nextSentenceMax?: number;
}

// 将六位编码字符串拆分为适合 BBM 的多条负载片段
function splitSixbitForBbm(
    sixbit: string,
    firstMax = 58,
    nextMax = 58// 最新一版20251030文档中没有第二句的60限制
): string[] {
    if (sixbit.length <= firstMax) return [sixbit];
    const chunks: string[] = [];
    let idx = 0;

    // 首句
    chunks.push(sixbit.slice(idx, idx + firstMax));
    idx += firstMax;

    // 续句
    while (idx < sixbit.length) {
        chunks.push(sixbit.slice(idx, idx + nextMax));
        idx += nextMax;
    }
    return chunks;
}

/**
 * BBM 二进制广播报文
 * - 字段顺序：total, num, seqId, chan(0..3), messageId, sixbit, padBits
 * - 首句最多 58 个 6bit 符号；续句最多 60（经验规则，满足“总长≤82字符”的约束）
 * - padBits 仅出现在最后一条；前面的句子固定写 0
 * // 最新一版20251030文档中没有第二句的60限制
 */
export function buildBBMSentences(opts: BuildBBMOptions): NmeaSentence[] {
    const firstMax = opts.firstSentenceMax ?? 58;
    const nextMax = opts.nextSentenceMax ?? 58;
    const seqId = Math.max(0, Math.min(9, Number(opts.seqId)));
    // 1) 分片
    const chunks = splitSixbitForBbm(opts.sixbit, firstMax, nextMax);
    const total = chunks.length;
    // 2) 组装每条 NMEA
    const result: NmeaSentence[] = [];
    for (let i = 0; i < total; i++) {
        const num = i + 1;
        const payload = chunks[i];
        const pad = i === total - 1 ? opts.padBits : 0;
        // 字段：总数, 当前序号, 序列码, 信道, 报文ID, 负载, 填充
        const fields = [
            String(total), // 发射此报文所需的总语句数（1-9）
            String(num), // 语句号，最小值 1（1-9）
            String(seqId), // 报文序列号
            String(opts.channel), // 0/1/2/3
            String(opts.msgId), // BBM 字段5：封装的 AIS 报文 ID
            payload, // 6bit 负载
            String(pad), // 仅最后一条使用实际 padBits，其余为 0
        ];
        const full = buildNmeaSentence({
            talker: opts.talker || '!--',
            formatter: opts.formatter,
            fields
        })
        result.push(full);
    }
    return result;
}
