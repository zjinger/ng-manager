/**
 * 限制并发执行的函数数量（类似 p-limit）
 * @param concurrency 
 * @returns 
 */
export function createLimiter(concurrency: number) {
    let active = 0;
    const queue: Array<() => void> = [];

    const next = () => {
        active--;
        const run = queue.shift();
        if (run) run();
    };

    return function limit<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const run = () => {
                active++;
                fn()
                    .then(resolve, reject)
                    .finally(next);
            };

            if (active < concurrency) run();
            else queue.push(run);
        });
    };
}
