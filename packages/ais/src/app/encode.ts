// packages/ais/src/app/encode.ts

import { BitBuffer } from '../core/bit-buffer';
import { bitBufferToSixbit } from '../core/sixbit';
import { MsgEncoder } from '../messages/msg';
import { buildTransport } from '../core/transport';
import { BinaryAppInput, EncodeAisNmeaWithEncoderOptions } from './types';

/**
 * 封装 AIS/ASM NMEA 报文
 * @param options  封装参数
 * @returns 
 */
export function encodeAisNmeaWithEncoder<T extends BinaryAppInput>(
    options: EncodeAisNmeaWithEncoderOptions<T>,
): string[] {
    const {
        dac,
        fi,
        transportOpts,
        payload,
        encoder,
    } = options;

    // 1. 应用层 payload -> appBits
    const appBuf = new BitBuffer();
    encoder(payload, appBuf);

    // 2. 加 DAC/FI 头
    const bits = MsgEncoder.encodeBits({ dac, fi, appBits: appBuf });

    // 3. 转 6bit
    const { payload: sixbit, padBits } = bitBufferToSixbit(bits);

    // 4. 封装成 NMEA（AIS/ASM 承载）
    const sentences = buildTransport(sixbit, padBits, transportOpts);
    return sentences.map((s) => s.raw);
}
