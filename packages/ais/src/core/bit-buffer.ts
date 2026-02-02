// packages/ais/src/core/bit-buffer.ts

/** 
 * 写整数时的越界策略
 * strict：抛错
 * clamp：饱和到边界值
 */
export type WriteMode = 'strict' | 'clamp';

export class BitBuffer {
    private bits: number[] = [];

    /** 当前总位数 */
    get length(): number {
        return this.bits.length;
    }

    /** 写入布尔位（true -> 1，false -> 0） */
    writeBool(v: boolean): this {
        this.bits.push(v ? 1 : 0);
        return this;
    }

    /** 写入若干个 0 作为填充 */
    writePad(count: number): this {
        if (count <= 0) return this;
        for (let i = 0; i < count; i++) this.bits.push(0);
        return this;
    }

    /** 按 n 位对齐（不足则补 0），返回补了多少位 */
    alignTo(n: number): number {
        if (n <= 0) return 0;
        const r = this.length % n;
        if (r === 0) return 0;
        const pad = n - r;
        this.writePad(pad);
        return pad;
    }

    /**
     * 写入字符串形式的位串（例如 "010101"）
     * 只允许字符 '0' / '1'，否则抛错
     */
    writeBits(bits: string): this {
        for (const c of bits) {
            if (c !== '0' && c !== '1') {
                throw new Error('BitBuffer.writeBits: only 0/1 allowed');
            }
            this.bits.push(c === '1' ? 1 : 0);
        }
        return this;
    }

    /** 将另一个 BitBuffer 内容写入当前缓冲区 */
    writeBuffer(other: BitBuffer): this {
        if (!(other instanceof BitBuffer)) {
            throw new Error('BitBuffer.writeBuffer: invalid BitBuffer');
        }
        this.bits.push(...other.bits);
        return this;
    }

    /* -----------------  内部辅助：整数范围检查  ----------------- */

    /** 无符号范围 [0, 2^len - 1] */
    private static clampUnsigned(value: number, length: number): bigint {
        if (!Number.isFinite(value)) return 0n;
        const v = BigInt(Math.trunc(value));
        if (v < 0n) return 0n;
        const max = (1n << BigInt(length)) - 1n;
        if (v > max) return max;
        return v;
    }

    /** 有符号范围 [-(2^(len-1)), 2^(len-1)-1]，内部转两补 */
    private static clampSigned(value: number, length: number): bigint {
        if (!Number.isFinite(value)) return 0n;
        const v = BigInt(Math.trunc(value));
        const max = (1n << BigInt(length - 1)) - 1n;
        const min = -1n << BigInt(length - 1);
        if (v > max) return max;
        if (v < min) return min;
        return v;
    }

    /* -----------------  对外整数写入 API  ----------------- */

    /**
     * 写入无符号整数
     * @param value 要写入的数值
     * @param length 位数（>0）
     * @param mode 越界策略：strict=抛错；clamp=饱和到边界
     */
    writeUnsigned(value: number, length: number, mode: WriteMode = 'strict'): this {
        if (length <= 0) return this;
        if (!Number.isFinite(value) || value < 0) {
            throw new Error('BitBuffer.writeUnsigned: invalid value');
        }

        const max = (1n << BigInt(length)) - 1n;
        let v = BigInt(Math.trunc(value));
        if (v < 0n || v > max) {
            if (mode === 'clamp') {
                if (v < 0n) v = 0n;
                else v = max;
            } else {
                throw new Error(
                    `BitBuffer.writeUnsigned: out of range for ${length} bits (value=${value})`,
                );
            }
        }

        this.appendBitsFromBigInt(v, length);
        return this;
    }

    /**
     * 写入有符号整数，使用二进制补码表示
     * @param value 要写入的数值
     * @param length 位数（>0）
     * @param mode 越界策略：strict=抛错；clamp=饱和到边界
     */
    writeSigned(value: number, length: number, mode: WriteMode = 'strict'): this {
        if (length <= 0) return this;

        const max = (1n << BigInt(length - 1)) - 1n;
        const min = -1n << BigInt(length - 1);

        if (!Number.isFinite(value)) {
            throw new Error('BitBuffer.writeSigned: invalid value');
        }

        let v = BigInt(Math.trunc(value));
        if (v < min || v > max) {
            if (mode === 'clamp') {
                v = v < min ? min : max;
            } else {
                throw new Error(
                    `BitBuffer.writeSigned: out of range for ${length} bits (value=${value})`,
                );
            }
        }

        // 转两补表示：
        // - 非负：直接用 v
        // - 负数：v + 2^length
        const twoPowL = 1n << BigInt(length);
        const u = v < 0n ? twoPowL + v : v;

        this.appendBitsFromBigInt(u, length);
        return this;
    }

    /**
     * 统一入口：写入整数
     * - signed=false：无符号 [0, 2^len - 1]
     * - signed=true：有符号 [-(2^(len-1)), 2^(len-1)-1]
     */
    writeInt(
        value: number,
        length: number,
        opts?: { signed?: boolean; mode?: WriteMode },
    ): this {
        const signed = !!opts?.signed;
        const mode = opts?.mode ?? 'strict';
        return signed
            ? this.writeSigned(value, length, mode)
            : this.writeUnsigned(value, length, mode);
    }

    /** 内部：按高位到低位写入 BigInt 的低 length 位 */
    private appendBitsFromBigInt(u: bigint, length: number): void {
        for (let i = length - 1; i >= 0; i--) {
            const bit = (u >> BigInt(i)) & 1n;
            this.bits.push(bit === 1n ? 1 : 0);
        }
    }

    /** 拷贝出一份当前的位数组 */
    toArray(): number[] {
        return [...this.bits];
    }
}
