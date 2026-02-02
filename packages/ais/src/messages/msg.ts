// packages/ais/src/app/msg.ts

import { BitBuffer } from '../core/bit-buffer';

/** 应用负载基本参数（DAC/FI + appBits） */
export interface MsgParams {
    dac: number;
    fi: number;
    appBits: BitBuffer;
}

/**
 * 应用消息编码器
 * @remarks
 * 将应用消息参数编码为比特缓冲区, 格式为：DAC(10bit) + FI(6bit) + appBits
 */
export class MsgEncoder {
    static encodeBits(params: MsgParams): BitBuffer {
        const { dac, fi, appBits } = params;
        const buf = new BitBuffer();
        buf.writeUnsigned(dac, 10);
        buf.writeUnsigned(fi, 6);
        buf.writeBuffer(appBits);
        return buf;
    }
}