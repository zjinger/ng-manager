import { silentSpawn } from "@yinuo-ngm/process";

export class NpmDriver {
    constructor(private opts: { timeoutMs?: number } = {}) { }

    run(cwd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
        const timeoutMs = this.opts.timeoutMs ?? 60_000;

        return new Promise((resolve, reject) => {
            const p = silentSpawn("npm", args, { cwd, shell: true, hideWindow: true });

            let stdout = "";
            let stderr = "";

            const timer = setTimeout(() => {
                p.kill("SIGKILL");
                reject(new Error(`npm timeout: npm ${args.join(" ")}`));
            }, timeoutMs);

            p.stdout!.on("data", (d) => (stdout += d.toString()));
            p.stderr!.on("data", (d) => (stderr += d.toString()));

            p.on("error", (e) => {
                clearTimeout(timer);
                reject(e);
            });

            p.on("close", (code) => {
                clearTimeout(timer);
                resolve({ code: code ?? -1, stdout, stderr });
            });
        });
    }
}
