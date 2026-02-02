import { BitBuffer } from "../core/bit-buffer";
import { TransportOptions } from '../core/transport';

export type BinaryAppInput = Record<string, any>;

export type BinaryAppEncoder<T extends BinaryAppInput = BinaryAppInput> =
    (input: T, buf: BitBuffer) => void;

/** 供上层传入 encoder 的完整管线 */
export interface EncodeAisNmeaWithEncoderOptions<T extends BinaryAppInput> {
    dac: number;
    fi: number;
    transportOpts: TransportOptions;
    payload: T;
    encoder: BinaryAppEncoder<T>;
}