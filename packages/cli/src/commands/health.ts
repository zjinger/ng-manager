
export async function getHealth(port: number, host = "127.0.0.1") {
    const r = await fetch(`http://${host}:${port}/health`);
    if (!r.ok) return null;
    return (await r.json()) as any;
}

export async function isHealthy(port: number, host = "127.0.0.1"): Promise<boolean> {
    try {
        const h = await getHealth(port, host);
        if (!h || !h.ok) return false;
        const { name, pid } = h.data || {};
        return name === "ngm-server" && typeof pid === "number";
    } catch {
        return false;
    }
}
