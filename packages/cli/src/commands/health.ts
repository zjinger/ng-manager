export async function isHealthy(port: number): Promise<boolean> {
    try {
        const r = await fetch(`http://127.0.0.1:${port}/health`);
        if (!r.ok) return false;
        const data: any = await r.json();
        return data?.ok === true && data?.data?.name === "ngm-server";
    } catch {
        return false;
    }
}
