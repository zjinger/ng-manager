export type Unsubscribe = () => void;

export interface IEventBus<EM extends Record<string, any> = Record<string, any>> {
    emit<K extends keyof EM & string>(type: K, payload: EM[K]): void;
    on<K extends keyof EM & string>(
        type: K,
        handler: (payload: EM[K]) => void
    ): Unsubscribe;

    onAny?(handler: (type: string, payload: any) => void): Unsubscribe;
}
