
/**
 * buildABMSentences — 生成 ABM（寻址二进制 / 寻址安全相关）语句组
 * ──────────────────────────────────────────────────────────────────────────────
 * ABM-AIS寻址二进制及寻址安全相关报文的数据流程：
 * ABM-AIS寻址二进制及寻址安全相关报文支持ITU-R M.1371-5定义的6号和12号报文通过AIS设备的外部接口与其他设备进行信息传输。
 * 这类数据由外部系统灵活定义，AIS设备的接口接收该语句后，启动发射机进行播发。
 * 接收端AIS设备传输成功接收报文后，通过 “寻址二进制以及安全相关信息确认”ABK语句进行确认。
 * ──────────────────────────────────────────────────────────────────────────────
 * - 本函数仅封装 ASM 信息(应用数据)
 *    负载格式为：[DAC(10) + FI(6)] + [应用数据 appBits] 
 * - 报文结构：
 *   !--ABM,
 *     a: total,       // 语句总数 ≥1
 *     a: num,         // 当前语句序号 ≥1
 *     b: seq,         // 序列号 0..3
 *     c: destMmsi,    // 目的 AIS 设备 MMSI（9 位）
 *     d: channel,     // 0=无偏好，1=A，2=B，3=A+B
 *     e: msgId,       // 6=寻址二进制, 12=寻址安全相关, 25/70, 26/71 等
 *     f: sixbit,      // 封装数据（多语句分片）
 *     g: padBits      // 填充位数 0..5，仅尾片真实，其余片=0
 *   *hh<CR><LF>
 *
 * - 分片规则：
 *   - 第一片最多 48 个 6bit 字符（288 bit）
 *   - 后续每片最多 60 个 6bit 字符（360 bit）
 * 
 * - 字段语义：
 *  ！--ABM, a, b, c, d, e, f, g, h*hh<CR><LF>
 *      a 向AIS单元传送二进制报文数据所需的语句总数。字段1规定一条报文所用的语句总数，最小值为1。
 *        字段2指明该语句在报文中的次序，最小值为1。所有语句包含同样数量的字段。
 *      b 序列报文标识码既是IEC 61162-1“序列报文识别码手段”，又是ITU-R M.1371-5在6和12两类报文中所用的“序列号”。
 *        该字段范围由ITU-R M.1371-5限制在0到3。
 *        连续信息识别符的值可以在 AIS 设备提供“ABK”确认此号码后再次使用。
 *      c 作为报文目的AIS设备的MMSI。
 *      d 该广播报文使用的AIS频道：
 *          0：对广播频道无特殊选择；
 *          1：在AIS 频道A上广播；
 *          2：在 AIS频道B上广播；
 *          3：广播两次，一次在频道A上发送，另一次在频道 B上发送。
 *      e 封装的数据包含了ITU-R M.1371-5 6号报文的“二进制数据”或12号报文的“安全相关文本”的数据内容。
 *        最长936bit的二进制数据（156 个6 bit ASCII码）使用多行语句。
 *        第一个语句会包含最多48个6 bit ASCII码（288bit），后面的语句可以包含最多60个6 bit ASCII码（360bit)。
 *        该语句的字符总数不应超过82 个6 bit ASCII码。
 *      f 为了实现封装，二进制比特数应是6的倍数。
 *        如果不是，要加入1～5个“填充比特”。
 *        此参数表示最后一个6 bit ASCII码字符中加入的比特数。
 *        若未加“填充比特”，则数值置为零。
 */

import { buildNmeaSentence, BuildNmeaParams } from './nmea-base';
import { NmeaSentence } from './nmea-types';

/** 
 * ABM 寻址二进制报文生成参数
 */
export interface BuildABMOptions extends BuildNmeaParams {
  formatter: 'ABM';                 // 指定为 ABM 格式
  /** 目的 AIS 设备 MMSI（必填），会格式化为 9 位数字 */
  destMmsi: string | number;

  /** 报文 ID：6/12/25/26/70/71 等 */
  msgId: number;

  /** 第一片最大 six-bit 长度，默认 48 */
  firstMaxLen?: number;

  /** 后续片最大 six-bit 长度，默认 60 */
  nextMaxLen?: number;

  /**
   * 是否压缩字段：
   *   - true：续句 c/d/e（destMmsi/channel/msgId）留空
   *   - false：每句都写全
   */
  compactFields?: boolean;
}

/**
 * 生成 ABM 语句组
 * 注意：
 *   - sixbit/padBits 通常由 bitBufferToSixbit 产生，在外层先编码完整报文 6/12/25/26 再传入
 *   - seqId 按 ITU-R M.1371 要求限制在 0..3，与 6/12 报文内部“序列号”一致
 */
export function buildABMSentences(opts: BuildABMOptions): NmeaSentence[] {
  const {
    formatter,
    sixbit,        // f 字段：six-bit 字符串（完整 payload 已在外部拼好）
    padBits,       // g 字段：尾片真实 0..5，其余片为 0
    destMmsi,
    channel,
    msgId,
    firstMaxLen = 48,
    nextMaxLen = 60,
    compactFields = false,
  } = opts;

  if (!formatter) throw new Error('formatter is required');
  if (!sixbit || sixbit.length === 0) throw new Error('sixbit is empty');

  const fmt = formatter.toUpperCase();

  // b: 序列号 0..3（ABB 是 0..9，这里按 M.1371 限制 0..3）
  const sidNum = Number(opts.seqId);
  const seq = Number.isFinite(sidNum) ? Math.min(3, Math.max(0, sidNum)) : 0;

  // c: 目的 MMSI，规范化为 9 位数字
  const mmsiStr = (destMmsi == undefined || destMmsi == null) ? '' : String(destMmsi);//.padStart(9, '0');

  // e: 报文 ID（1..99 都允许，这里不强制限制具体范围）
  const msgIdNum = Number(msgId);
  if (!Number.isFinite(msgIdNum)) {
    throw new Error(`msgId is invalid: ${msgId}`);
  }

  // 分片规则：第一片 firstMaxLen，后续片 nextMaxLen
  const firstLen = Math.max(1, Math.floor(firstMaxLen));
  const nextLen = Math.max(1, Math.floor(nextMaxLen));

  const chunks: string[] = [];
  let pos = 0;

  // 第一片
  const firstTake = Math.min(firstLen, sixbit.length);
  chunks.push(sixbit.slice(0, firstTake));
  pos = firstTake;

  // 后续片
  while (pos < sixbit.length) {
    const take = Math.min(nextLen, sixbit.length - pos);
    chunks.push(sixbit.slice(pos, pos + take));
    pos += take;
  }

  const total = chunks.length;
  const result: NmeaSentence[] = [];

  for (let i = 0; i < total; i++) {
    const frag = i + 1;
    // g: 仅最后一片使用真实 padBits，其余片=0；范围钳制 0..5
    const pad =
      frag === total ? Math.min(5, Math.max(0, Number(padBits) || 0)) : 0;

    const isFirst = frag === 1;
    const useCompact = compactFields && !isFirst;

    const cField = useCompact ? '' : mmsiStr;                           // c: dest MMSI
    const dField =
      useCompact || channel === undefined ? '' : String(channel);       // d: channel 0/1/2/3
    const eField = useCompact ? '' : String(msgIdNum);                  // e: msgId

    const fields = [
      `!--${fmt}`,         // 起始头：!--ABM
      String(total),       // a: total
      String(frag),        // a: fragment index
      String(seq),         // b: seq（0..3）
      String(cField),      // c: dest MMSI
      String(dField),      // d: AIS channel
      String(eField),      // e: msgId
      chunks[i],           // f: six-bit 分片
      String(pad),         // g: pad bits（不得为空）
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
