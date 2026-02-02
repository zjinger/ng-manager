/**
 * buildABBSentences — 生成  ABB（ASM2 ）语句组
 * ──────────────────────────────────────────────────────────────────────────────
 * - 本函数仅封装 ASM 信息(应用数据)
 *    负载格式为：[DAC(10) + FI(6)] + [应用数据 appBits] 
 * 
 * - 句型：
 *  !--ABB,total,frag,seqId,mmsi,channel,msgId,fecType,sixbit,padBits*hh
 * 
 * - 字段语义：
 *   a: total & frag        → 语句总数、当前序号（均≥1）
 *   b: seqId               → 顺序消息标识符，0..9 循环，**不得为空**
 *   c: mmsi                → 源 ASM 台 MMSI，可空（空=用发送台自身 MMSI）
 *   d: channel             → 0/空=无偏好；1=ASM1；2=ASM2；3=双信道
 *   e: msgId               → 保留，置空
 *   f: fecType             → 0=无编码；1=3/4 FEC；2=SAT 上行；3..9预留
 *   g: sixbit              → ASM 负载的 six-bit 文本（可能多语句分片）
 *   h: padBits             → 0..5；**不得为空**；仅末片使用实际填充，中间片=0
 *
 * - 兼容性：
 *   * 如果目标设备仍希望遵循较短行长，可把 `maxLineLen` 调小（例如 58/60 或统一 60）。
 *   * 提供 `compactFields`：续句将 c/d 字段留空以缩短行长（符合“未变化字段可留空”的规则）。
 *
 */

import { BuildNmeaParams, buildNmeaSentence } from './nmea-base';
import { FecType, NmeaSentence } from './nmea-types';

/** 生成 ABB 的参数 */
export interface BuildABBOptions extends BuildNmeaParams {
  formatter: 'ABB';                 // 指定为 ABB 格式
  fecType?: FecType; // f 字段：0/1/2，3..9 预留
  mmsi?: string | number | ''; // c 字段；可空
  compactFields?: boolean; // 续句是否清空 c/d 字段（减少行长）
}

export function buildABBSentences(opts: BuildABBOptions): NmeaSentence[] {
  const {
    formatter,
    sixbit,      // g 字段：six-bit 字符串（[DAC+FI]+appBits 已在外部拼好）
    padBits,     // h 字段：尾片真实 0..5，其余片为 0
    fecType = 0, // f 字段：FEC 0..9
    channel,     // d 字段：ASM 频道（0/空/1/2/3）
    mmsi,        // c 字段：来源 MMSI，可空
    compactFields = false,
    maxLineLen = 82, // 按 82 总长约束
  } = opts;

  if (!formatter) throw new Error('formatter is required');
  if (!sixbit || sixbit.length === 0) throw new Error('sixbit is empty');

  const fmt = formatter.toUpperCase();

  // b: 顺序号 0..9（不得为空）
  const sidNum = Number(opts.seqId);
  const seqId = Number.isFinite(sidNum) ? Math.min(9, Math.max(0, sidNum)) : 0;

  // f: FEC 0..9
  const fec = Math.min(9, Math.max(0, Number(fecType) || 0));
  const maxLen = Math.max(1, Math.floor(maxLineLen));
  // —— 第一遍：仅按“整句 ≤ 82（含 *hh）”切片，得到每片 g 长度（slices）与总片数 ——
  const slices: number[] = [];
  let pos = 0;
  let frag = 1;
  const talker = opts.talker || '!--';
  // 构建“除 g/h 外的前缀”（a_total/a_num 先用占位，第二遍再写真实）
  const buildPrefix = (fragIndex: number) => {
    const compact = compactFields && fragIndex > 1;

    const cField = compact ? '' : (mmsi ?? '');
    const dField = compact ? '' : (channel === undefined ? '' : String(channel));
    const eField = ''; // 保留字段，置空
    const fField = String(fec);

    // a_total 与 a_num 用占位（'0'），第二遍写真实值；占位能保证“≤82”切片更保守
    const a_total_placeholder = '0';
    const a_frag_placeholder = '0';

    const fieldsPrefix = [
      `${talker}${fmt}`,               // 头
      a_total_placeholder,       // a: total（占位）
      a_frag_placeholder,        // a: frag（占位）
      String(seqId),             // b
      String(cField),            // c
      String(dField),            // d
      eField,                    // e（保留）
      fField                     // f
      // 后续是 g（six-bit 分片）、h（pad）
    ];

    return fieldsPrefix.join(',');
  };

  while (pos < sixbit.length) {
    const prefix = buildPrefix(frag);
    // 句式：core = prefix + ',' + g + ',' + h
    // 需要 core.length + 3（*hh） ≤ 82
    // h 始终为单字符（0..5），所以先扣掉 1 个字符与两个逗号
    const iLen = 1; // h 的长度始终为 1
    const roomForG = maxLen - 3 /* *hh */ - (prefix.length + 2 /* 两个逗号 */ + iLen);
    if (roomForG <= 0) {
      throw new Error(`ABB sentence prefix too long (frag=${frag}), cannot fit any payload under 82 chars.`);
    }
    const remain = sixbit.length - pos;
    const take = Math.max(0, Math.min(roomForG, remain));
    if (take === 0) {
      throw new Error(`Cannot allocate payload for frag=${frag} under 82-char rule.`);
    }
    slices.push(take);
    pos += take;
    frag++;
  }

  const total = slices.length;

  // —— 第二遍：正式输出，使用真实 a_total/a_num，尾片写真实 padBits，逐句最终校验 ——
  const result: NmeaSentence[] = [];
  let offset = 0;

  for (let i = 0; i < total; i++) {
    const fragIndex = i + 1;
    const compact = compactFields && fragIndex > 1;

    const cField = compact ? '' : (mmsi ?? '');
    const dField = compact ? '' : (channel === undefined ? '' : String(channel));
    const eField = ''; // 保留
    const fField = String(fec);

    const gPayload = sixbit.slice(offset, offset + slices[i]);
    offset += slices[i];

    const hPad = String(
      fragIndex === total ? Math.min(5, Math.max(0, Number(padBits) || 0)) : 0
    );

    const fields = [
      String(total),      // a: total（真实）
      String(fragIndex),  // a: fragment index（真实）
      String(seqId),      // b: seqId
      String(cField),     // c: MMSI（可空）
      String(dField),     // d: channel（0/1/2/3 或空）
      eField,             // e: msgId（保留空）
      fField,             // f: FEC 类型
      gPayload,           // g: six-bit 分片
      hPad                // h: pad bits（不得为空）
    ];
    const core = fields.join(',');
    // 最终保险校验：整句（含 *hh）≤ 82
    if (core.length + 3 > 82) {
      throw new Error(`ABB sentence length exceeds 82 (frag=${fragIndex}, len=${core.length + 3}).`);
    }
    const full = buildNmeaSentence({
      talker,
      formatter: opts.formatter,
      fields
    })
    result.push(full);
  }
  return result;
}
