export type DbShape<T> = {
    version: 1;
    items: Record<string, T>;
};
