/**
 * buildAABSentences — 生成  AAB（ASM4 ）语句组
 * ──────────────────────────────────────────────────────────────────────────────
 * - 本函数仅封装 ASM 信息(应用数据)
 *    负载格式为：[DAC(10) + FI(6)] + [应用数据 appBits] 
 * 
 * - 句型：
 *  !--AAB,total,num,seqId,srcMmsi,destMmsi,channel,msgId,fecType,sixbit,padBits*hh
 * 
 * - 字段语义：
 *   a: total & num     → 语句总数、当前序号（均 ≥ 1）
 *   b: seqId           → 顺序消息标识符，0..9；不得为空
 *   c: srcMmsi         → 源 ASM 站 MMSI；可空（空 = 用发射站自身）
 *   d: destMmsi        → 目的 ASM 站 MMSI；建议必填
 *   e: channel         → ASM 通道（0/空=无偏好；1=ASM1；2=ASM2；3=双信道）
 *   f: msgId           → 保留，必须置空
 *   g: fecType         → 0=无FEC；1=3/4 FEC；2=SAT 上行；3..9 预留
 *   h: sixbit          → ASM 负载（六位编码文本，可能多语句分片）
 *   i: padBits         → 0..5；不得为空；仅末片使用真实填充，其余片=0
 *
 */

import { BuildNmeaParams, buildNmeaSentence } from './nmea-base';
import { FecType, NmeaSentence } from './nmea-types';

/** 生成 AAB 的参数 */
export interface BuildAABOptions extends BuildNmeaParams {
  formatter: 'AAB';                 // 指定为 AAB 格式  
  fecType?: FecType;                 // g 字段：0/1/2，3..9 预留
  srcMmsi?: string | number | '';    // c 字段：源 ASM 站 MMSI，可空
  destMmsi: string | number;         // d 字段：目的 ASM 站 MMSI（建议必填）
  compactFields?: boolean;           // 续句是否清空 c/d/e 字段（减少行长）
}

/**
 * 生成 AAB 语句组
 */
export function buildAABSentences(opts: BuildAABOptions): NmeaSentence[] {
  const {
    formatter,
    sixbit,       // h 字段：六位编码 payload（外部已包含 DAC/FI+appBits）
    padBits,      // i 字段：尾句真实 0..5，其余句=0
    fecType = 0,  // g 字段：FEC 0..9
    channel,      // e 字段：ASM 通道
    srcMmsi,      // c 字段：源 ASM 站 MMSI，可空
    destMmsi,     // d 字段：目的 ASM 站 MMSI
    maxLineLen = 82,
    compactFields = false,
  } = opts;

  if (!formatter) throw new Error('formatter is required');
  if (!sixbit || sixbit.length === 0) {
    throw new Error('sixbit is empty');
  }
  if (destMmsi === undefined || destMmsi === null || destMmsi === '') {
    throw new Error('destMmsi is required for AAB');
  }

  const fmt = formatter.toUpperCase();

  // b: 顺序号 0..9；不得为空
  const sidNum = Number(opts.seqId);
  const seqId = Number.isFinite(sidNum) ? Math.min(9, Math.max(0, sidNum)) : 0;

  // g: FEC 类型 0..9
  const fec = Math.min(9, Math.max(0, Number(fecType) || 0));

  // c/d: MMSI 规范化
  const srcMmsiStr = srcMmsi === undefined || srcMmsi === null
    ? ''
    : String(srcMmsi);

  const destMmsiStr = (destMmsi == undefined || destMmsi == null) ? '' : String(destMmsi);//.padStart(9, '0'); // 目的 MMSI 补齐 9 位

  // h: 负载分片（这里简单按 maxLineLen 切 g 字段长度，需要更严格 82 字符约束可以仿照 buildABBSentences 的第二版）
  const maxLen = Math.max(1, Math.floor(maxLineLen));
  const chunks: string[] = [];
  for (let i = 0; i < sixbit.length; i += maxLen) {
    chunks.push(sixbit.slice(i, i + maxLen));
  }
  const total = chunks.length;
  const result: NmeaSentence[] = [];

  for (let i = 0; i < total; i++) {
    const frag = i + 1;

    // i: 仅最后一片使用真实 padBits，其余为 0；范围钳制 0..5
    const pad =
      frag === total ? Math.min(5, Math.max(0, Number(padBits) || 0)) : 0;

    // c/d/e：续句在 compactFields=true 时留空
    const cField = i === 0 || !compactFields ? srcMmsiStr : '';
    const dField = i === 0 || !compactFields ? destMmsiStr : '';
    const eField =
      i === 0 || !compactFields
        ? channel === undefined
          ? ''
          : String(channel)
        : '';

    const fField = '';      // msgId 保留，置空
    const gField = String(fec);

    const fields = [
      String(total),   // a: total
      String(frag),    // a: fragment index
      String(seqId),   // b: seqId（必填）
      String(cField),  // c: src MMSI（可空）
      String(dField),  // d: dest MMSI
      String(eField),  // e: channel（0/1/2/3 或空）
      fField,          // f: msgId（保留空）
      gField,          // g: FEC 类型
      chunks[i],       // h: six-bit 分片
      String(pad),     // i: pad bits（不得为空）
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
