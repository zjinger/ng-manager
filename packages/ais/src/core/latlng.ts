// packages/ais-core/src/core/latlng.ts

import { BitBuffer } from "./bit-buffer";
import { clampInt } from "./bit-helpers";
/** 默认经纬度位宽 */
const DEFAULT_BW_LATLNG = {
    LON22: 22,
    LAT21: 21,
} as const;

export enum LATLNG_PRECISION {
    'MIN_1_100' = 100,      // 经纬度精度：1/100 分
    'MIN_1_1000' = 1000,  // 经纬度精度：1/1000 分
    'MIN_1_10000' = 10000,  // 经纬度精度：1/10000 分
};
export type latlngKind = 'lat' | 'lng';
export type latFlag = 'N' | 'S'
export type lngFlag = 'E' | 'W'
export type latlngFlag = latFlag | lngFlag | undefined;

/** 
 * 度-分-方向
 */
interface LlDegreeMinute {
    deg: number; // 度
    min: number; // 分 
    per: LATLNG_PRECISION; // 精度
    bitW: number; // 位宽
    flag?: latlngFlag; // 'N' | 'S' | 'E' | 'W' | undefined
    kind?: latlngKind; // 'lat' | 'lng'
}

/** 经度部分 */
export interface Lng extends LlDegreeMinute {
    kind: 'lng';
    flag: lngFlag;
}
/** 纬度部分 */
export interface Lat extends LlDegreeMinute {
    kind: 'lat';
    flag: latFlag;
}

/** 
 * 经纬度
 */
export interface CoreLatLng {
    lat: Lat;
    lng: Lng;
}
/** 
 * 经度默认码与范围限制（±180°）
 */
export const LON_UNAVAILABLE = 181 * 60
export const LON_MAX = 180 * 60

/** 
 * 纬度默认码与范围限制（±90°）
 */
export const LAT_UNAVAILABLE = 91 * 60
export const LAT_MAX = 90 * 60

function signFromFlag(flag: latlngFlag, kind: latlngKind): 1 | -1 {
    if (kind === 'lat') return flag === 'S' ? -1 : 1;
    return flag === 'W' ? -1 : 1;
}

/** 以 DMS（度、分、方向）计算十进制度；分字段可为小数（如 23.45′） */
export function dmsToDegree(
    deg?: number, min?: number, flag?: latlngFlag, kind: latlngKind = 'lat'
): number {
    const d = Number.isFinite(deg as number) ? Number(deg) : 0;
    const m = Number.isFinite(min as number) ? Number(min) : 0;
    const s = signFromFlag(flag, kind);
    return s * (d + m / 60);
}

/** 从 LatLng（仅用 deg/min/flag）得到 {lat,lng} 十进制度 */
export function latLngLikeToDegrees(ll: CoreLatLng): { latDeg: number; lngDeg: number } {
    const { lat, lng } = ll
    return {
        latDeg: dmsToDegree(lat.deg, lat.min, lat.flag, 'lat'),
        lngDeg: dmsToDegree(lng.deg, lng.min, lng.flag, 'lng'),
    };
}

/** 经度默认码与范围限制（±180°） */
export function normLng(h: number, per: LATLNG_PRECISION = 100): number {
    const v = Number(h)
    if (!Number.isFinite(v)) return LON_UNAVAILABLE * per;
    if (v < -180 * 6000 || v > 180 * 6000) return LON_UNAVAILABLE * per;
    return v;
}

/** 纬度默认码与范围限制（±90°） */
export function normLat(h: number, per: LATLNG_PRECISION = 100): number {
    const v = Number(h)
    if (!Number.isFinite(v)) return LAT_UNAVAILABLE * per;
    if (v < -90 * 6000 || v > 90 * 6000) return LAT_UNAVAILABLE * per;
    return v;
}

/** 将 (度, 分, 方向) 按给定精度编码成两补整数（分的 1/per 单位） */
function encodeSignedMinutes(degMin: LlDegreeMinute
): number {
    const kind = degMin.kind || 'lat';
    return kind === 'lat' ? encodeSignedLatMinutes(degMin as Lat) : encodeSignedLngMinutes(degMin as Lng);
}

/** 纬度编码：两补 + 指定位宽 */
function encodeSignedLngMinutes(lng: Lng): number {
    const { min, deg, flag, per = 100, bitW } = lng;
    const sign: 1 | -1 = (flag === 'W') ? -1 : 1;
    // 统一到“分”，再乘以 per，最后整体乘符号
    const totalHundredth = Math.round((deg * 60 + min) * per) * sign;
    const maxAbs = LON_MAX * per; // 180 * 60 * per
    const unavailable = LON_UNAVAILABLE * per; // 181 * 60 * per
    const v = Number.isFinite(totalHundredth) ? totalHundredth : unavailable;
    const bounded = (v < -maxAbs || v > maxAbs) ? unavailable : v;
    return clampInt(bounded, bitW, true);
}

/** 纬度编码：两补 + 指定位宽 */
function encodeSignedLatMinutes(lat: Lat): number {
    const { min, deg, flag, per = 100, bitW } = lat;
    const sign: 1 | -1 = (flag === 'S') ? -1 : 1;
    // 统一到“分”，再乘以 per，最后整体乘符号
    const totalHundredth = Math.round((deg * 60 + min) * per) * sign;
    const maxAbs = LAT_MAX * per; // 90 * 60 * per
    const unavailable = LAT_UNAVAILABLE * per; // 91 * 60 * per
    const v = Number.isFinite(totalHundredth) ? totalHundredth : unavailable;
    const bounded = (v < -maxAbs || v > maxAbs) ? unavailable : v;
    return clampInt(bounded, bitW, true);
}

/**
 * 经度编码：两补 + 指定位宽
 * @param lng 经度
 * @returns 
 */
export function encodeLng(lng: Lng): number {
    lng.deg = Math.abs(Number(lng.deg));
    lng.min = Math.abs(Number(lng.min));
    lng.per = lng.per || LATLNG_PRECISION.MIN_1_100;
    lng.bitW = lng.bitW || DEFAULT_BW_LATLNG.LON22;
    lng.kind = 'lng';
    lng.flag = lng.flag || 'E';
    return encodeSignedMinutes(lng);
}

/**
 * 纬度编码：两补 + 指定位宽
 * @param lat 纬度
 * @returns 
 */
export function encodeLat(lat: Lat): number {
    lat.deg = Math.abs(Number(lat.deg));
    lat.min = Math.abs(Number(lat.min));
    lat.per = lat.per || LATLNG_PRECISION.MIN_1_100;
    lat.bitW = lat.bitW || DEFAULT_BW_LATLNG.LAT21;
    lat.kind = 'lat';
    lat.flag = lat.flag || 'N';
    return encodeSignedMinutes(lat);
}

/** 经纬编码：两补 + 指定位宽 */
export function encodeLatlng(latlng: CoreLatLng): { lat: number; lng: number } {
    const { lat, lng } = latlng;
    const lngEncoded = encodeLng(lng);
    const latEncoded = encodeLat(lat);
    return { lat: latEncoded, lng: lngEncoded };
}

// ====================== 增量编码（1/10000′, 两补）工具 ======================

/** 度差 → 1/10000′（两补整型；正东/北为正，西/南为负） */
export function degDeltaToTenThousandthMinutes(deltaDeg?: number, per: LATLNG_PRECISION = LATLNG_PRECISION.MIN_1_10000): number {
    if (deltaDeg === undefined || deltaDeg === null || Number.isNaN(deltaDeg)) return 0;
    return Math.round(deltaDeg * 60 * per); // 1 度 = 60′；×10000
}

/** 
 * 写入增量经度（默认 24bit，两补，默认 单位 1/10000′）——输入为“十进制度差”
 * @param buf BitBuffer 实例
 * @param deltaDeg 经度增量（十进制度差）
 * @param bitWidth 位宽，默认 24
 * @param per 精度，默认 10000 分
 */
export function writeDeltaLngFromDeg(buf: BitBuffer, deltaDeg: number, bitWidth: number = 24, per: LATLNG_PRECISION = LATLNG_PRECISION.MIN_1_10000): void {
    let d = degDeltaToTenThousandthMinutes(deltaDeg, per);
    d = clampInt(d, bitWidth, true);
    buf.writeSigned(d, bitWidth);
}

/** 
 * 写入增量纬度（默认 23bit，两补，默认 单位 1/10000′）——输入为“十进制度差”
 * @param buf BitBuffer 实例
 * @param deltaDeg 十进制度差
 * @param bitWidth 位宽，默认 23
 * @param per 精度，默认 1/10000′
 */
export function writeDeltaLatFromDeg(buf: BitBuffer, deltaDeg: number, bitWidth: number = 23, per: LATLNG_PRECISION = LATLNG_PRECISION.MIN_1_10000): void {
    let d = degDeltaToTenThousandthMinutes(deltaDeg, per);
    d = clampInt(d, bitWidth, true);
    buf.writeSigned(d, bitWidth);
}

/**
 * 写入经纬增量序列
 * 给定一个经纬度数组，从（第二个点）开始依次写入基于前一个点增量的经纬度
 * @param buf BitBuffer 实例
 * @param mainPathPoints 经纬点数组
 * @param lngBit 经度位宽
 * @param latBit 纬度位宽
 * @param per 精度
 */
export function writeLatlngIncrement(buf: BitBuffer, mainPathPoints: CoreLatLng[], lngBit: number, latBit: number, per: LATLNG_PRECISION) {
    const firstLatlng = mainPathPoints[0];
    let { latDeg: prevLatDeg, lngDeg: prevLngDeg } = latLngLikeToDegrees(firstLatlng!);
    // === 处理后续所有点（从索引1开始，依次基于前一个点计算增量）===
    for (let i = 1; i < mainPathPoints.length; i++) {
        const currentLatlng = mainPathPoints[i];
        // 跳过空值点（避免无效数据）
        if (!currentLatlng) continue;
        // 计算当前点与前一个点的经纬度（十进制度）
        const { latDeg: curLatDeg, lngDeg: curLngDeg } = latLngLikeToDegrees(currentLatlng);
        // 计算增量（当前 - 前一个）并写入
        writeDeltaLngFromDeg(buf, curLngDeg - prevLngDeg, lngBit, per);
        writeDeltaLatFromDeg(buf, curLatDeg - prevLatDeg, latBit, per);
        // 更新基准点：当前点变为下一个点的“前一个点”
        prevLatDeg = curLatDeg;
        prevLngDeg = curLngDeg;
    }
}
