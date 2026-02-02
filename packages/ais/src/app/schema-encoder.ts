import { BitBuffer } from '../core/bit-buffer';
import { clampInt } from '../core/bit-helpers';
import {
    encodeLat,
    encodeLng,
    encodeLatlng,
    LATLNG_PRECISION,
    type Lat,
    type Lng,
    type CoreLatLng,
} from '../core/latlng';
import { encode13bitChineseRule, encode14bitChineseRule, encode6bitAscii } from '../text';
import type { BinaryAppInput } from './types';

// =====  字段类型定义 =====
/**
 * FieldKind：
 *  - uint/sint/bool：普通数值/布尔
 *  - lat/lng/latlng：经纬度
 *  - text6/13/14：文本，
 */
export type FieldKind =
    | 'uint'
    | 'sint'
    | 'bool'
    | 'lat'
    | 'lng'
    | 'latlng'
    | 'text6'
    | 'text13'
    | 'text14';
/**
 * 通用字段定义
 * 说明：
 *  - name：从 payload 中取值的 key
 *  - kind：字段类型
 *  - bits：位宽（对 uint/sint/lat/lng/latlng 生效）
 *  - defaultValue：payload 中没给时使用的默认值
 */
export interface FieldDef {
    /** payload 中的字段名，例如 'MRN'、'towType' 等 */
    name: string;
    kind: FieldKind;
    /** 位宽（对 uint/sint/lat/lng/latlng 生效） */
    bitW?: number;
    /** 默认值（input[name] 为 null/undefined 时用这个） */
    defaultValue?: any;
    /**
     * 对 latlng 类字段可以扩展更多配置（可选）：
     *  - latBits / lngBits：经纬度各自位宽
     *  - per：经纬度精度（默认 1/100 分）
     *  - flagProp：如果 flag 单独在 payload 的某个字段里
     */
    latBits?: number;
    lngBits?: number;
    per?: LATLNG_PRECISION;
    flagProp?: string;
}
// =====  encodeBySchema 主逻辑 =====
/**
 * 根据 schema 把 input 写入 BitBuffer
 *  - 这里完全不涉及 DAC/FI，只是“字段 → bit 流”
 *  - 实际使用时：业务层定义 FieldDef[]，然后调用：
 *      encodeBySchema(schema, payload, buf)
 */
export function encodeBySchema(
    schema: FieldDef[],
    input: BinaryAppInput,
    buf: BitBuffer,
): void {
    for (const field of schema) {
        const raw = input[field.name];
        const value = raw ?? field.defaultValue;
        switch (field.kind) {
            case 'uint': {
                const bits = field.bitW ?? 1;
                const n = Number(value ?? 0);
                const v = clampInt(n, bits, false);
                buf.writeUnsigned(v, bits);
                break;
            }
            case 'sint': {
                const bits = field.bitW ?? 1;
                const n = Number(value ?? 0);
                const v = clampInt(n, bits, true);
                buf.writeSigned(v, bits);
                break;
            }
            case 'bool': {
                buf.writeBool(!!value);
                break;
            }
            case 'lat': {
                encodeLatField(field, value, buf);
                break;
            }
            case 'lng': {
                encodeLngField(field, value, buf);
                break;
            }
            case 'latlng': {
                encodeLatLngField(field, value, buf);
                break;
            }
            case 'text6':
            case 'text13':
            case 'text14': {
                encodeTextField(field, value, buf);
                break;
            }
            default:
                // TODO: 使用错误代码
                throw new Error(`encodeBySchema: unsupported field kind ${(field as any).kind} on ${field.name}`);
        }
    }
}

// =====  经纬度相关的辅助编码函数 =====
/**
 * 支持两种 lat/lng 输入形态：
 *  1）对象：{ deg, min, flag, per?, bitW? } （更精细）
 *  2）数字：十进制度，例如 31.123456
 *
 * schema 中：
 *  - bits：写入位宽（对象形态时会影响 writeSigned 位宽）
 *  - per：精度（默认 1/100 分）
 */
function encodeLatField(field: FieldDef, value: any, buf: BitBuffer) {
    const bits = field.bitW ?? 21;
    const per = field.per ?? LATLNG_PRECISION.MIN_1_100;

    if (value == null) {
        // 纯“不可用”编码，可以按你项目需要调整
        buf.writeSigned(0, bits);
        return;
    }

    // 对象形态：{ deg, min, flag? }
    if (typeof value === 'object') {
        const lat: Lat = {
            deg: Math.abs(Number(value.deg ?? 0)),
            min: Math.abs(Number(value.min ?? 0)),
            flag: value.flag ?? 'N',
            per,
            bitW: bits,
            kind: 'lat',
        };
        const encoded = encodeLat(lat);
        buf.writeSigned(encoded, bits);
        return;
    }

    // 数字形态：十进制度
    if (typeof value === 'number') {
        const deg = value;
        const flag = deg < 0 ? 'S' : 'N';
        const lat: Lat = {
            deg: Math.abs(deg),
            min: 0,
            flag,
            per,
            bitW: bits,
            kind: 'lat',
        };
        const encoded = encodeLat(lat);
        buf.writeSigned(encoded, bits);
        return;
    }
    // TODO: 使用错误代码
    throw new Error(`encodeLatField: unsupported lat value for ${field.name}`);
}

function encodeLngField(field: FieldDef, value: any, buf: BitBuffer) {
    const bits = field.bitW ?? 22;
    const per = field.per ?? LATLNG_PRECISION.MIN_1_100;

    if (value == null) {
        buf.writeSigned(0, bits);
        return;
    }

    if (typeof value === 'object') {
        const lng: Lng = {
            deg: Math.abs(Number(value.deg ?? 0)),
            min: Math.abs(Number(value.min ?? 0)),
            flag: value.flag ?? 'E',
            per,
            bitW: bits,
            kind: 'lng',
        };
        const encoded = encodeLng(lng);
        buf.writeSigned(encoded, bits);
        return;
    }

    if (typeof value === 'number') {
        const deg = value;
        const flag = deg < 0 ? 'W' : 'E';
        const lng: Lng = {
            deg: Math.abs(deg),
            min: 0,
            flag,
            per,
            bitW: bits,
            kind: 'lng',
        };
        const encoded = encodeLng(lng);
        buf.writeSigned(encoded, bits);
        return;
    }

    throw new Error(`encodeLngField: unsupported lng value for ${field.name}`);
}

/**
 * latlng 支持两种形态：
 *  1）{ lat: Lat; lng: Lng }
 *  2）{ latDeg, lngDeg }
 *
 * schema 中：
 *  - latBitW / lngBitW：控制两个方向各自位宽（默认 21/22）
 */
function encodeLatLngField(field: FieldDef, value: any, buf: BitBuffer) {
    const latBits = field.latBits ?? 21;
    const lngBits = field.lngBits ?? 22;
    const per = field.per ?? LATLNG_PRECISION.MIN_1_100;

    if (!value) {
        buf.writeSigned(0, lngBits);
        buf.writeSigned(0, latBits);
        return;
    }

    let ll: CoreLatLng;

    // 形态 1：完整 Lat/Lng 对象
    if ('lat' in value && 'lng' in value) {
        ll = value as CoreLatLng;
    } else if ('latDeg' in value && 'lngDeg' in value) {
        // 形态 2：十进制度
        const latDeg = Number(value.latDeg);
        const lngDeg = Number(value.lngDeg);

        const lat: Lat = {
            deg: Math.abs(latDeg),
            min: 0,
            per,
            bitW: latBits,
            kind: 'lat',
            flag: latDeg < 0 ? 'S' : 'N',
        };
        const lng: Lng = {
            deg: Math.abs(lngDeg),
            min: 0,
            per,
            bitW: lngBits,
            kind: 'lng',
            flag: lngDeg < 0 ? 'W' : 'E',
        };
        ll = { lat, lng };
    } else {
        throw new Error(`encodeLatLngField: unsupported value for ${field.name}`);
    }

    const encoded = encodeLatlng(ll);
    buf.writeSigned(encoded.lng, lngBits);
    buf.writeSigned(encoded.lat, latBits);
}

// ===== 文本字段编码 =====
/**
 * 文本编码这块，因为你项目里已经有 6bit/13bit/14bit 的实现，
 * 这里只做一个“桥”，你只需要在 TODO 处调用你现有的函数即可。
 */
function encodeTextField(field: FieldDef, value: any, buf: BitBuffer) {
    const text = value == null ? '' : String(value);
    if (!text) {
        return;
    }
    let bitString: string | undefined;
    switch (field.kind) {
        case 'text6': {
            bitString = encode6bitAscii(text);
            break;
        }
        case 'text13': {
            bitString = encode13bitChineseRule(text);
            break;
        }
        case 'text14': {
            bitString = encode14bitChineseRule(text);
            break;
        }
    }

    if (!bitString) {
        // TODO: 使用错误代码
        // 没接上具体实现前可以直接返回，或抛错
        throw new Error(`encodeTextField: encoder not implemented for kind=${field.kind}`);
    }
    buf.writeBits(bitString);
}
