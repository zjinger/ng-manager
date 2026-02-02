// packages/ais-core/src/core/transport.ts

import { buildAABSentences } from './nmea-aab';
import { buildABBSentences } from './nmea-abb';
import { buildABMSentences } from './nmea-abm';
import { buildAGBSentences } from './nmea-agb';
import { BuildNmeaParams } from './nmea-base';
import { buildBBMSentences } from './nmea-bbm';
import type {
    AisTalker,
    AISChannelSel,
    ASMChannelSel,
    CoreRegionBox,
    NmeaSentence,
    FecType,
} from './nmea-types';

export type TransportKind =
    | 'AIS6'        // 生成 AIS 6 号（寻址二进制报文） ABM
    | 'AIS8'        // 生成 AIS 8 号（二进制广播） BBM
    | 'AIS25'    // 生成 AIS 25 号（单时隙二进制广播） BBM
    | 'AIS26'    // 生成 AIS 26 号（多时隙二进制广播或寻址） BBM 或 ABM
    | 'ASM1'        // 生成ASM 1号预约广播 （FEC）ABB
    | 'ASM2'        // 生成ASM 2号广播（FEC） ABB
    | 'ASM3'        // 生成ASM 3号预约寻址（FEC） AAB
    | 'ASM4'        // 生成ASM 4号寻址报文（FEC） ABB
    | 'ASM6'        // 生成ASM6号区域多播报文（FEC） AGB 

/** 统一的封装参数 */
export interface TransportOptions {
    /** 传输类型 */
    kind: TransportKind;
    /** AIS 或 ASM 的信道选择 */
    channel: AISChannelSel | ASMChannelSel;
    /** 可选：FEC 类型 */
    fecType?: FecType;
    /** AIS 或 ASM 的 Talker 标识 */
    talker?: AisTalker;
    /**
     * 可选： 广播or寻址
     * 0 - 广播; 1 - 寻址
     */
    broadcastOrAddressed?: 0 | 1;
    /** 可选：多句报文的序列号，0-9 循环 */
    seqId?: number;
    /** 首句最大 6bit 载荷字符数 */
    firstSentenceMax?: number;
    /** 续句最大 6bit 载荷字符数 */
    nextSentenceMax?: number;
    /**
    * 可选：强制限制每条 NMEA 行的最大总长度（含前缀和校验，不含 CRLF）。
    * 每句 six-bit 最大字符数（默认 80，按设备可调整）
    */
    maxLineLen?: number;
    /** 可选：源/目的 MMSI*/
    srcMmsi?: number | string;
    /** 可选：目的 MMSI */
    destMmsi?: number[] | string[];
    /** 可选：组播区域 */
    region?: CoreRegionBox
}

/**
 * 批量处理生成ABM ，支持多个目的地址
 * @param destMmsi 
 * @param params 
 */
function batchBuildABMSentences(destMmsi: Array<string | number>, msgId: number, params: BuildNmeaParams): NmeaSentence[] {
    if (!destMmsi || destMmsi.length === 0) {
        // TODO：抛出异常代码
        throw new Error('Destination MMSI is required for ABM transport');
    }
    const sentences: NmeaSentence[] = []
    for (const mmsi of destMmsi) {
        const nmea = buildABMSentences({
            ...params,
            formatter: 'ABM',
            msgId,
            destMmsi: mmsi.toString(),
        });
        sentences.push(...nmea)
    }
    return sentences;
}

/**
 * 
 */
function batchBuildAABSentences(destMmsi: Array<string | number>, fecType: FecType, params: BuildNmeaParams): NmeaSentence[] {
    if (!destMmsi || destMmsi.length === 0) {
        // TODO：抛出异常代码
        throw new Error('Destination MMSI is required for AAB transport');
    }
    const sentences: NmeaSentence[] = []
    for (const mmsi of destMmsi) {
        const nmea = buildAABSentences({
            ...params,
            formatter: 'AAB',
            destMmsi: mmsi.toString(),
            fecType,
        });
        sentences.push(...nmea)
    }
    return sentences;
}

/**
 * 不同传输类型对应的生成函数映射
 */
const TransportKindBuilderMap: {
    [key in TransportKind]: (params: BuildNmeaParams, opts: TransportOptions) => NmeaSentence[];
} = {
    // 寻址 ABM
    AIS6: (params: BuildNmeaParams, opts: TransportOptions) => {
        return batchBuildABMSentences(opts.destMmsi!, 6, params)
    },
    // 广播 BBM 
    AIS8: (params: BuildNmeaParams, opts: TransportOptions) => {
        return buildBBMSentences({
            ...params,
            formatter: 'BBM',
            msgId: 8,
        })
    },
    // 广播 BBM
    AIS25: (params: BuildNmeaParams, opts: TransportOptions) => {
        return buildBBMSentences({
            ...params,
            formatter: 'BBM',
            msgId: 25,
        })
    },
    // 广播 BBM 或 寻址 ABM
    AIS26: (params: BuildNmeaParams, opts: TransportOptions) => {
        if (opts.broadcastOrAddressed === 1) {
            return batchBuildABMSentences(opts.destMmsi!, 26, params)
        }
        return buildBBMSentences({
            ...params,
            formatter: 'BBM',
            msgId: 26,
        })
    },
    // 广播 ABB
    ASM1: (params: BuildNmeaParams, opts: TransportOptions) => {
        return buildABBSentences({
            ...params,
            formatter: 'ABB',
            fecType: opts.fecType,
        })
    },
    // 广播 ABB
    ASM2: (params: BuildNmeaParams, opts: TransportOptions) => {
        return buildABBSentences({
            ...params,
            formatter: 'ABB',
            fecType: opts.fecType,
        })
    },
    // 预约寻址 AAB
    ASM3: (params: BuildNmeaParams, opts: TransportOptions) => {
        // return buildAABSentences({
        //     ...params,
        //     formatter: 'AAB',
        //     destMmsi: opts.destMmsi!,
        //     fecType: opts.fecType,
        // })
        return batchBuildAABSentences(opts.destMmsi!, opts.fecType!, params)
    },
    // 寻址 AAB
    ASM4: (params: BuildNmeaParams, opts: TransportOptions) => {
        // return buildAABSentences({
        //     ...params,
        //     formatter: 'AAB',
        //     destMmsi: opts.destMmsi!,
        //     fecType: opts.fecType,
        // })
        return batchBuildAABSentences(opts.destMmsi!, opts.fecType!, params)
    },
    // 区域多播 AGB
    ASM6: (params: BuildNmeaParams, opts: TransportOptions) => {
        return buildAGBSentences({
            ...params,
            formatter: 'AGB',
            region: opts.region!,
            fecType: opts.fecType,
        })
    }
}

/**
 * 统一封装入口：
 *  - sixbit: 6bit payload 字符串
 *  - padBits: 填充位数
 * 返回若干 NMEA 语句
 */
export function buildTransport(
    sixbit: string,
    padBits: number,
    opts: TransportOptions,
): NmeaSentence[] {
    const { kind, maxLineLen, talker, channel, seqId } = opts;
    const baseNmeaParams: BuildNmeaParams = {
        talker,
        channel,
        seqId,
        sixbit,
        padBits,
        maxLineLen,
        formatter: 'ABM', // 占位，实际按 kind 生成
    }
    const builder = TransportKindBuilderMap[kind];
    if (builder) {
        return builder(baseNmeaParams, opts);
    } else {
        // TODO：抛出异常代码
        throw new Error(`Unsupported transport kind: ${kind}`);
    }
}