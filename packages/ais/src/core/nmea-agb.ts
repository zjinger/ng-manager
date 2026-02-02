/**
 * buildAGBSentences — 生成 AGB（ASM6 地理多播）语句组
 * ──────────────────────────────────────────────────────────────────────────────
 * - 本函数仅封装 ASM 信息(应用数据)
 *    负载格式为：[DAC(10) + FI(6)] + [应用数据 appBits] 
 *
 * - 多语句规则：
 *    - a 字段（“语句总数, 当前序号”）用于拆分；最小值均为 1。
 *    - i 字段（padBits）仅 **最后一条** 取真实填充位数（0..5），其他分片固定为 0。
 *    - 连续语句允许对 **未变化字段留空**（IEC 61162-1 Ed.5 7.3.4）；可用 compactFields 控制。
 *
 * - 字段语义：
 *
 * !--AGB, a, b, c, d, d, d, d, d, d, d, d, e, f, g, h, i*hh<CR><LF>
 *   a  传输消息所需的语句总数 与 当前语句序号（a: total, frag）           —— 注释 a
 *   b  顺序消息标识符（0..9，循环，**不得为空**；AMK 用其确认）        —— 注释 b
 *   c  ASM 消息的**来源 MMSI**（空=用发送台自身 MMSI）              —— 注释 c
 *   d  预期接收地理区域（**东北角 NE** 与 **西南角 SW**，纬度在前，经度在后）
 *      格式：NE_lat, NE_hemi, NE_lon, NE_hemi, SW_lat, SW_hemi, SW_lon, SW_hemi —— 注释 d
 *   e  广播无线电消息的 ASM 频道（0/空/1/2/3）                         —— 注释 e
 *   f  ITU-R M.2092 ASM 消息 ID（AGB 处为**保留**，置空）               —— 注释 f
 *   g  使用 FEC：0=无；1=3/4 FEC；2..9 预留                           —— 注释 g
 *   h  six-bit 负载（[DAC+FI]+appBits 六位字符），可能跨多语句           —— 注释 h
 *   i  填充位数（0..5，**不得为空**；仅最后一片真实，其余为 0）          —— 注释 i
 *
 *  注：ASM 最多可链接 15 个“三时隙消息”，最大有效载荷约：
 *      广播 ~2259B / 寻址 ~2199B / 地理多播 ~157B（含 DAC/FI）。
 */
import { BuildNmeaParams, buildNmeaSentence } from './nmea-base';
import { FecType, CoreRegionBox, NmeaSentence } from './nmea-types';
import { CoreLatLng } from './latlng'
/** 生成 AGB 的参数 */
export interface BuildAGBOptions extends BuildNmeaParams {
  formatter: 'AGB'
  /** g 字段：FEC（0=无；1=3/4；2..9 预留） */
  fecType?: FecType;
  /** c 字段：来源 MMSI，可空（空=采用发送台 MMSI） */
  mmsi?: string | number | '';
  /** d 字段：预期接收地理区域（NE + SW） */
  region: CoreRegionBox;
  /** 续句是否清空不变字段（c/d/e）以缩短行长（符合 7.3.4） */
  compactFields?: boolean;
}
export function buildAGBSentences(opts: BuildAGBOptions): NmeaSentence[] {
  const {
    formatter,        // 'AGB'
    sixbit,           // h 字段：six-bit 字符串（[DAC+FI]+appBits）
    padBits,          // i 字段：尾片真实填充位（0..5），其它分片固定写 0
    seqId: seqRaw,    // b 字段：0..9
    fecType = 0,      // g 字段：FEC（0/1/…）
    channel,          // e 字段：0/空/1/2/3
    mmsi,             // c 字段：来源 MMSI，可空
    region,           // d 字段：NE+SW（纬度在前，经度在后）
    compactFields = false,
    maxLineLen = 82// 按 82 总长约束
  } = opts;

  if (!formatter) throw new Error('formatter is required');
  if (!sixbit || sixbit.length === 0) throw new Error('sixbit is empty');
  if (!region) throw new Error('region is required');
  const maxLen = Math.max(1, Math.floor(maxLineLen));
  const fmt = String(formatter).toUpperCase();
  const talker = opts.talker || '!--';

  // b：顺序号 0..9（不得为空）
  const seq = (() => {
    const n = Number(seqRaw);
    return Number.isFinite(n) ? Math.min(9, Math.max(0, n)) : 0;
  })();

  // g：FEC（0..9）
  const fec = Math.min(9, Math.max(0, Number(fecType) || 0));

  // d：区域坐标（NE & SW） 使用 0.1′ 精度输出 ddmm.m / dddmm.m
  const { NE_LAT, NE_LON, SW_LAT, SW_LON } = formatRegionForNMEA_0p1min(region);

  // ========== 第一遍：仅根据 82 总长做切片，得到每片 h 长度与总片数 ==========
  const slices: number[] = [];
  let pos = 0;
  let frag = 1;
  const totalLen = sixbit.length;

  // 计算“除 h/i 外的前缀”的构造函数（依赖 frag 与 compactFields）
  const buildPrefix = (fragIndex: number) => {
    const compact = compactFields && fragIndex > 1;

    const c_mmsi = compact ? '' : (mmsi ?? '');
    const d_NE_lat = compact ? '' : NE_LAT.val;
    const d_NE_hemi = compact ? '' : NE_LAT.hemi;
    const d_NE_lon = compact ? '' : NE_LON.val;
    const d_NE_lhe = compact ? '' : NE_LON.hemi;

    const d_SW_lat = compact ? '' : SW_LAT.val;
    const d_SW_hemi = compact ? '' : SW_LAT.hemi;
    const d_SW_lon = compact ? '' : SW_LON.val;
    const d_SW_lhe = compact ? '' : SW_LON.hemi;

    const e_chan = compact ? '' : (channel === undefined ? '' : String(channel));
    const f_msgId = ''; // 保留

    const g_fec = String(fec);

    // 注意：前缀暂时将 a_total/a_num 留空长度估算：用占位 "0" / "0"（长度与最终不等式安全）
    // 因为 a_total/a_num 只影响 1~2 个字符，最终都会在 82 之内再严格校验（第二遍）
    const provisionalTotal = '0';
    const provisionalFrag = '0';

    const fieldsPrefix = [
      `${talker}${fmt}`,
      provisionalTotal,            // a: total（占位）
      provisionalFrag,             // a: fragment（占位）
      String(seq),                 // b
      String(c_mmsi),              // c
      d_NE_lat, d_NE_hemi, d_NE_lon, d_NE_lhe, // d NE
      d_SW_lat, d_SW_hemi, d_SW_lon, d_SW_lhe, // d SW
      e_chan,                      // e
      f_msgId,                     // f
      g_fec                        // g
    ];

    return fieldsPrefix.join(',');
  };

  while (pos < totalLen) {
    // i 字段长度：非末片 '0'、末片真实 0..5，长度恒为 1
    const iLen = 1;
    const prefix = buildPrefix(frag);
    // core = prefix + ',' + h + ',' + i
    // 需满足 core.length + 3（*hh） ≤ 82
    const roomForH = maxLen - 3 - (prefix.length + 2 + iLen); // 两个逗号
    if (roomForH <= 0) {
      //TODO: 抛出异常代码
      throw new Error(`AGB语句前缀过长（frag=${frag}），无法在 ${maxLen} 字符限制内容纳任何负载。`);
    }
    const remain = totalLen - pos;
    const take = Math.max(0, Math.min(roomForH, remain));
    if (take === 0) {
      // 理论上不应为 0；保险处理：至少分 1 个字符，保证推进
      // 但这样可能使第二遍校验失败，这里直接抛错更稳妥
      //TODO: 抛出异常代码
      throw new Error(`无法为 frag=${frag} 分配负载，超过 ${maxLen} 字符限制。`);
    }
    slices.push(take);
    pos += take;
    frag++;
  }

  const total = slices.length;

  // ========== 第二遍：正式输出，带真实 total/frag 与校验和 ==========
  const out: NmeaSentence[] = [];
  let offset = 0;

  for (let i = 0; i < total; i++) {
    const fragIndex = i + 1;
    const compact = compactFields && fragIndex > 1;

    const c_mmsi = compact ? '' : (mmsi ?? '');
    const d_NE_lat = compact ? '' : NE_LAT.val;
    const d_NE_hemi = compact ? '' : NE_LAT.hemi;
    const d_NE_lon = compact ? '' : NE_LON.val;
    const d_NE_lhe = compact ? '' : NE_LON.hemi;

    const d_SW_lat = compact ? '' : SW_LAT.val;
    const d_SW_hemi = compact ? '' : SW_LAT.hemi;
    const d_SW_lon = compact ? '' : SW_LON.val;
    const d_SW_lhe = compact ? '' : SW_LON.hemi;

    const e_chan = compact ? '' : (channel === undefined ? '' : String(channel));
    const f_msgId = ''; // 保留
    const g_fec = String(fec);

    const h_payload = sixbit.slice(offset, offset + slices[i]);
    offset += slices[i];

    const i_pad = String(fragIndex === total ? Math.min(5, Math.max(0, Number(padBits) || 0)) : 0);

    const fields = [
      String(total),       // a: total
      String(fragIndex),   // a: fragment
      String(seq),         // b: seqId
      String(c_mmsi),      // c: MMSI（可空）
      d_NE_lat, d_NE_hemi, d_NE_lon, d_NE_lhe,   // d NE
      d_SW_lat, d_SW_hemi, d_SW_lon, d_SW_lhe,   // d SW
      e_chan,              // e
      f_msgId,             // f（保留）
      g_fec,               // g
      h_payload,           // h
      i_pad                // i（最后一片真实，其余 0）
    ];
    const core = fields.join(',');
    // 整句 ≤ maxLen 校验
    if (core.length + 3 > maxLen) { // +3 for "*hh"
      throw new Error(`AGB语句长度超出 ${maxLen} 字符限制（frag=${fragIndex}）。`);
    }
    const full = buildNmeaSentence({
      talker: opts.talker || '!--',
      formatter: opts.formatter,
      fields
    })
    out.push(full);
  }
  return out;
}

// ============== NMEA d 字段（0.1′）格式化 ==============
function formatRegionForNMEA_0p1min(region: CoreRegionBox) {
  const NE_LAT = formatLat_0p1(region.latlngNE);
  const NE_LON = formatLon_0p1(region.latlngNE);
  const SW_LAT = formatLat_0p1(region.latlngSW);
  const SW_LON = formatLon_0p1(region.latlngSW);
  return { NE_LAT, NE_LON, SW_LAT, SW_LON };
}

function clampRange(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function formatLat_0p1(ll: CoreLatLng): { val: string; hemi: 'N' | 'S' } {
  const lat = ll.lat
  const deg = clampRange(Math.abs(lat.deg ?? 0), 0, 90);
  const min = clampMinute(Number(lat.min));
  const hemi: 'N' | 'S' = lat.flag === 'S' ? 'S' : 'N';
  return { val: toDdmmWithDecimals(deg, min, 2), hemi };
}

function formatLon_0p1(ll: CoreLatLng): { val: string; hemi: 'E' | 'W' } {
  const lng = ll.lng
  const deg = clampRange(Math.abs(lng.deg ?? 0), 0, 180);
  const min = clampMinute(Number(lng.min));
  const hemi: 'E' | 'W' = lng.flag === 'W' ? 'W' : 'E';
  return { val: toDddmmWithDecimals(deg, min, 2), hemi };
}

// ============== 小工具（NMEA 专用） ==============

function clampMinute(min: number): number {
  // 分值允许小数；限制在 [0, 60)
  if (!Number.isFinite(min)) return 0;
  return Math.min(59.9999, Math.max(0, min));
}

function toDdmmWithDecimals(deg: number, min: number, dec: 0 | 1 | 2 | 3 | 4): string {
  const mm = roundFixed(min, dec);
  // 目标长度：2位整数分钟 + 小数点 + dec 位
  const target = 2 + (dec ? 1 + dec : 0);
  return `${String(deg).padStart(2, '0')}${mm.padStart(target, '0')}`;
}

function toDddmmWithDecimals(deg: number, min: number, dec: 0 | 1 | 2 | 3 | 4): string {
  const mm = roundFixed(min, dec);
  // 同样是分钟字段，目标长度与纬度一致
  const target = 2 + (dec ? 1 + dec : 0);
  return `${String(deg).padStart(3, '0')}${mm.padStart(target, '0')}`;
}
function roundFixed(v: number, dec: number): string {
  // const f = Math.pow(10, dec);
  // return (Math.round((v + Number.EPSILON) * f) / f).toFixed(dec);
  const f = Math.pow(10, dec);
  const rounded = Math.round((v + Number.EPSILON) * f) / f;
  // 如果四舍五入到 60.x（实际上只会是整 60），回退到 59.9..9
  if (rounded >= 60) {
    return `59.${'9'.repeat(dec)}`; // dec=1 -> "59.9"
  }
  return rounded.toFixed(dec);
}