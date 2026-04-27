export interface INpmRegistry {
    getLatest(cwd: string, name: string): Promise<string | null>;
}
