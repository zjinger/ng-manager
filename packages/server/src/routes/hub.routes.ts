import { AppError } from "@yinuo-ngm/core";
import type { FastifyInstance } from "fastify";

type FeedbackCategory = "bug" | "suggestion" | "feature" | "other";

type SubmitFeedbackBody = {
    projectKey?: string;
    category?: FeedbackCategory;
    title?: string;
    content?: string;
    contact?: string;
    clientName?: string;
    clientVersion?: string;
    osInfo?: string;
};

const DEFAULT_HUB_PUBLIC_BASE_URL = "http://192.168.1.31:7070/api/public";

function normalizeText(value: unknown, maxLen: number, fieldName: string) {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") {
        throw new AppError("BAD_REQUEST", `${fieldName} must be string`);
    }
    const text = value.trim();
    if (text.length > maxLen) {
        throw new AppError("BAD_REQUEST", `${fieldName} length must <= ${maxLen}`);
    }
    return text;
}

function validateBody(input: unknown): Required<Pick<SubmitFeedbackBody, "category" | "title" | "content">> & SubmitFeedbackBody {
    if (!input || typeof input !== "object") {
        throw new AppError("BAD_REQUEST", "invalid feedback payload");
    }

    const body = input as SubmitFeedbackBody;
    const category = body.category;
    const title = normalizeText(body.title, 120, "title");
    const content = normalizeText(body.content, 5000, "content");
    const projectKey = normalizeText(body.projectKey, 80, "projectKey");
    const contact = normalizeText(body.contact, 120, "contact");
    const clientName = normalizeText(body.clientName, 120, "clientName");
    const clientVersion = normalizeText(body.clientVersion, 60, "clientVersion");
    const osInfo = normalizeText(body.osInfo, 200, "osInfo");

    if (!category || !["bug", "suggestion", "feature", "other"].includes(category)) {
        throw new AppError("BAD_REQUEST", "invalid feedback category");
    }
    if (!title) {
        throw new AppError("BAD_REQUEST", "feedback title is required");
    }
    if (!content) {
        throw new AppError("BAD_REQUEST", "feedback content is required");
    }

    return {
        category,
        title,
        content,
        projectKey,
        contact,
        clientName,
        clientVersion,
        osInfo,
    };
}

function resolveClientIp(req: any): string | undefined {
    const xForwardedFor = req.headers?.["x-forwarded-for"];
    if (typeof xForwardedFor === "string" && xForwardedFor.trim()) {
        return xForwardedFor.split(",")[0]?.trim() || undefined;
    }
    return req.ip || req.socket?.remoteAddress || undefined;
}

export default async function hubRoutes(app: FastifyInstance) {
    app.post("/feedback", async (req) => {
        const body = validateBody(req.body);
        const baseUrl = (process.env.NGM_HUB_PUBLIC_BASE_URL || DEFAULT_HUB_PUBLIC_BASE_URL).replace(/\/+$/, "");
        const targetUrl = `${baseUrl}/feedbacks`;

        let response: Response;
        try {
            response = await fetch(targetUrl, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    source: "web",
                    category: body.category,
                    title: body.title,
                    content: body.content,
                    projectKey: body.projectKey,
                    contact: body.contact,
                    clientName: body.clientName,
                    clientVersion: body.clientVersion,
                    osInfo: body.osInfo,
                    clientIp: resolveClientIp(req),
                }),
            });
        } catch (error: any) {
            throw new AppError("UNKNOWN_ERROR", "failed to connect hub service", { cause: error?.message || String(error), targetUrl });
        }

        let payload: any = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok) {
            const message = payload?.message || `hub response error (${response.status})`;
            throw new AppError("UNKNOWN_ERROR", message, { status: response.status, payload });
        }

        if (payload?.code !== "OK") {
            throw new AppError("UNKNOWN_ERROR", payload?.message || "hub feedback submit failed", { payload });
        }

        return payload?.data ?? payload;
    });
}
