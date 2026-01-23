/**
 * @description 文件级串行执行锁（同一 key 的操作按顺序执行）
 *  重要设计约束：
 * - 队列中用于“占位/串行”的 Promise **只能 resolve，绝不能 reject**
 * - 业务错误必须仅通过 fn() 的 throw / return 向外传播
 * - 如果队列 Promise 被 reject，而又没有被 await/consume，
 *   在 Node.js 20+（尤其 22）中会触发 unhandledRejection，
 *   最终导致进程级异常甚至服务崩溃
 *
 * 本锁的职责仅是：
 * - 保证同一 key（如同一文件）的读-改-写串行执行
 * - 不参与、不包装、不传播任何业务错误
 *
 *  后续维护注意：
 * - 不要在这里 reject Promise
 * - 不要在 finally 中 throw
 * - 锁释放失败只允许记录日志，不得影响业务异常传播
 * - 不做跨进程锁（本地服务进程写文件，够用；后续要再加）
 * 
 * @author ZhangJing
 * @date 2026-01-15 11:01
 * @export
 * @class FileLock
 */
export class FileLock {
    private queues = new Map<string, Promise<void>>();

    async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
        const prev = this.queues.get(key) ?? Promise.resolve();

        let release!: () => void;
        const next = new Promise<void>((res) => (release = res));

        const tail = prev.finally(() => next);
        // 将 next 挂到队列尾部；无论 prev 成功/失败，都要继续串行
        this.queues.set(key, tail);

        // 等待前一个结束（这里不需要 catch，因为 prev 永远 resolve 了）
        // await prev;
        // 不让上一次 fn 的失败影响后续队列执行
        await prev.catch(() => void 0);

        try {
            return await fn();
        } finally {
            // 永远释放队列（resolve next），不要 reject
            release();
            // 清理：如果当前 key 的尾巴仍然是我们挂上去的那条链，则删除
            // 注意：这里不要重新构造 finally 链进行比较（会是新 Promise），直接比较引用
            if (this.queues.get(key) === tail) {
                this.queues.delete(key);
            }
        }
    }
}
