export interface CoreDomainHandle<T> {
    service: T;
    dispose?: () => Promise<void> | void;
}

export function asHandle<T>(service: T): CoreDomainHandle<T> {
    return { service };
}