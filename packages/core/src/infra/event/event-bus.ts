export type Unsubscribe = () => void;

/**
 * 最小事件总线接口：core 内部解耦用
 * - server/ws 可以订阅转发
 * - ui 可以订阅更新状态
 */
export interface IEventBus<EM extends Record<string, any> = Record<string, any>> {
    emit<K extends keyof EM & string>(type: K, payload: EM[K]): void;
    on<K extends keyof EM & string>(type: K, handler: (payload: EM[K]) => void): Unsubscribe;

    /** 可选：监听所有事件（用于 debug / 埋点） */
    onAny?(handler: (type: string, payload: any) => void): Unsubscribe;
}