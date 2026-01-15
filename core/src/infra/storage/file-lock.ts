/**
 * @description 同一个文件的所有操作串行化（读-改-写不会互相踩）
 *  - 不做跨进程锁（本地服务进程写文件，够用；后续要再加）
 * @author ZhangJing
 * @date 2026-01-15 11:01
 * @export
 * @class FileLock
 */
export class FileLock {
    private queues = new Map<string, Promise<any>>();

    /**
     * 对同一个 key（通常是 filePath）串行执行 fn
     */
    async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
        const prev = this.queues.get(key) ?? Promise.resolve();

        let resolveNext!: (v: any) => void;
        let rejectNext!: (e: any) => void;
        const next = new Promise((res, rej) => {
            resolveNext = res;
            rejectNext = rej;
        });

        // 把 next 挂到队列尾部（即使 fn 抛错也要继续链）
        this.queues.set(
            key,
            prev.then(() => next).catch(() => next)
        );

        // 等待前一个结束，再执行当前
        await prev.catch(() => undefined);

        try {
            const result = await fn();
            resolveNext(null);
            return result;
        } catch (e) {
            rejectNext(e);
            throw e;
        } finally {
            // 队列尾部是 next 才清理，避免并发清理误删
            if (this.queues.get(key) === (prev.then(() => next).catch(() => next) as any)) {
                this.queues.delete(key);
            }
        }
    }
}
