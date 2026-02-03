export interface KvRepo<T> {
    get(id: string): Promise<T | null>;
    list(): Promise<T[]>;
    set(id: string, value: T): Promise<void>;
    delete(id: string): Promise<void>;
}