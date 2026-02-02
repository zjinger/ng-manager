// packages/ais/src/core/bit-helpers.ts

import { BitBuffer, WriteMode } from './bit-buffer';

/**
 * 通用裁剪：无效→0；无符号越界→饱和到边界；有符号按两补范围饱和
 * @param v 待裁剪数值
 * @param bits 位宽
 * @param signed 是否有符号
 * @returns 裁剪后的数值
 */
export function clampInt(v: number, bits: number, signed = false): number {
    if (!Number.isFinite(v)) return 0;
    if (!signed) {
        const max = (1 << bits) - 1;
        if (v < 0) return 0;
        if (v > max) return max;
        return v;
    }
    const maxS = (1 << (bits - 1)) - 1;
    const minS = -(1 << (bits - 1));
    if (v > maxS) return maxS;
    if (v < minS) return minS;
    return v;
}

/**
 * 编码数值字段
 * @param value 待编码数值
 * @param bitWidth 位宽
 * @returns 编码后的数值
 */
export function encodeNumberField(value: number | string | undefined, bitWidth: number): number {
    return clampInt(Number(value ?? 0), bitWidth);
}

/**
 * 写入有符号字段
 * @param buf BitBuffer 实例
 * @param value 待写入数值
 * @param bitWidth 位宽
 */
export function writeSignedField(buf: BitBuffer, value: number | string | undefined, bitWidth: number) {
    buf.writeSigned(encodeNumberField(value, bitWidth), bitWidth);
}

/**
 * 写入无符号字段
 * @param buf BitBuffer 实例
 * @param value 待写入数值
 * @param bitWidth 位宽
 */
export function writeUnsignedField(buf: BitBuffer, value: number | string | undefined, bitWidth: number) {
    buf.writeUnsigned(encodeNumberField(value, bitWidth), bitWidth);
}

/**
 * 写一个范围 [0, max] 的数，如果为 null(或 NaN) 则写填充值
 * @param buf BitBuffer 实例
 * @param value 待写入数值
 * @param bits 位宽
 * @param nullValue 填充值
 * @param mode 越界策略：strict=抛错；clamp=饱和到边界
 */
export function writeNullableUnsigned(
    buf: BitBuffer,
    value: number | null | undefined,
    bits: number,
    nullValue: number,
    mode: WriteMode = 'strict',
) {
    if (value == null || Number.isNaN(value)) {
        buf.writeUnsigned(nullValue, bits, mode);
    } else {
        buf.writeUnsigned(value, bits, mode);
    }
}


/**
 * 写入布尔标志位，true = 1，false = 0
 * @param buf BitBuffer 实例
 * @param flag 布尔值，null/undefined 视为 false
 */
export function writeFlag(buf: BitBuffer, flag: boolean | undefined | null) {
    buf.writeBool(!!flag);
}