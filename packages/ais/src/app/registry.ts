import { BinaryAppEncoder } from './types';
interface RegistryKey {
    dac: number;
    fi: number;
}

// 注册表：DAC/FI -> 编码器
const encoders = new Map<string, BinaryAppEncoder>();

function makeKey(dac: number, fi: number): string {
    return `${dac}/${fi}`;
}

/** 注册一个应用编码器（在 ais-core 启动时调用一次即可） */
export function registerAppEncoder(
    dac: number,
    fi: number,
    encoder: BinaryAppEncoder,
): void {
    const key = makeKey(dac, fi);
    encoders.set(key, encoder);
}

/** 获取应用编码器 */
export function getAppEncoder(
    dac: number,
    fi: number,
): BinaryAppEncoder | undefined {
    return encoders.get(makeKey(dac, fi));
}

/** 列出当前所有已注册的 DAC/FI（调试用） */
export function listAppEncoders(): RegistryKey[] {
    return Array.from(encoders.keys()).map((k) => {
        const [dacStr, fiStr] = k.split('/');
        return { dac: Number(dacStr), fi: Number(fiStr) };
    });
}