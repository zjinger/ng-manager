import { CoreError, CoreErrorCodes } from "@yinuo-ngm/core";
import type { FastifyInstance } from "fastify";
import Parser from "rss-parser";

type CacheEntry = { expireAt: number; payload: any };
const cache = new Map<string, CacheEntry>();

const parser = new Parser({
    timeout: 15000, // 15s
});
export default async function rssRoutes(app: FastifyInstance) {
    app.get("/preview", async (req) => {
        const q = req.query as { url?: string; limit?: string; force?: string; cacheSec?: string };
        const url = (q.url ?? "").trim();
        if (!url) {
            //  return reply.code(400).send({ ok: false, message: "url required" });
            throw new CoreError(CoreErrorCodes.INVALID_RSS_URL, "url required", { query: q });
        }
        // limit between 1 and 100, default 20
        const limit = Math.min(Math.max(parseInt(q.limit ?? "20", 10) || 20, 1), 100);
        // force fetch, default false
        const force = (q.force ?? "0") === "1";
        // cache duration between 30 and 3600 seconds, default 2400
        const cacheSec = Math.min(Math.max(parseInt(q.cacheSec ?? "2400", 10) || 2400, 30), 3600);
        const key = `${url}|${limit}`;
        const now = Date.now();
        if (!force) {
            const hit = cache.get(key);
            if (hit && hit.expireAt > now) return hit.payload;
        }
        try {
            const feed = await parser.parseURL(url);
            const items = (feed.items ?? []).slice(0, limit).map((it) => ({
                title: it.title ?? "",
                link: (it.link ?? it.guid ?? "").toString(),
                pubDate: it.isoDate ?? (it.pubDate ? new Date(it.pubDate).toISOString() : undefined),
                author: (it.creator ?? it.author ?? "")?.toString() || undefined,
                summary: (it.contentSnippet ?? it.content ?? "")?.toString() || undefined,
            }));
            const payload = {
                title: feed.title,
                description: feed.description,
                link: feed.link,
                items,
                fetchedAt: new Date().toISOString(),
            };
            cache.set(key, { expireAt: now + cacheSec * 1000, payload });
            return payload;
        } catch (e: any) {
            // return reply.code(500).send({
            //     ok: false,
            //     message: "RSS_FETCH_FAILED",
            //     detail: e?.message || String(e),
            // });
            throw new CoreError(CoreErrorCodes.RSS_FETCH_FAILED, e?.message || String(e), { url });
        }
    });
}
