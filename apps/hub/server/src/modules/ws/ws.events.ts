import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { HubWsEvent, HubWsEventType } from "./ws.types";

function buildEvent<T>(
    type: HubWsEventType,
    payload: T,
    projectId?: string | null
): HubWsEvent<T> {
    return {
        id: randomUUID(),
        type,
        projectId: projectId ?? null,
        createdAt: new Date().toISOString(),
        payload,
    };
}

export class HubWsEvents {
    constructor(private readonly fastify: FastifyInstance) { }

    announcementPublished(input: {
        id: string;
        title: string;
        level?: string;
        projectId?: string | null;
    }) {
        const event = buildEvent(
            "announcement.published",
            {
                id: input.id,
                title: input.title,
                level: input.level ?? "info",
            },
            input.projectId
        );

        this.dispatch(event);
    }

    announcementUpdated(input: {
        id: string;
        title: string;
        level?: string;
        projectId?: string | null;
    }) {
        const event = buildEvent(
            "announcement.updated",
            {
                id: input.id,
                title: input.title,
                level: input.level ?? "info",
            },
            input.projectId
        );

        this.dispatch(event);
    }

    docPublished(input: {
        id: string;
        title: string;
        projectId?: string | null;
    }) {
        const event = buildEvent(
            "doc.published",
            {
                id: input.id,
                title: input.title,
            },
            input.projectId
        );

        this.dispatch(event);
    }

    docUpdated(input: {
        id: string;
        title: string;
        projectId?: string | null;
    }) {
        const event = buildEvent(
            "doc.updated",
            {
                id: input.id,
                title: input.title,
            },
            input.projectId
        );

        this.dispatch(event);
    }

    releaseCreated(input: {
        id: string;
        version: string;
        channel: string;
        projectId?: string | null;
    }) {
        const event = buildEvent(
            "release.created",
            {
                id: input.id,
                version: input.version,
                channel: input.channel,
            },
            input.projectId
        );

        this.dispatch(event);
    }

    broadcast(input: {
        title: string;
        content: string;
        level?: string;
        projectId?: string | null;
    }) {
        const event = buildEvent(
            "broadcast",
            {
                title: input.title,
                content: input.content,
                level: input.level ?? "info",
            },
            input.projectId
        );

        this.dispatch(event);
    }

    private dispatch(event: HubWsEvent) {
        if (event.projectId) {
            this.fastify.wsManager.broadcastToProject(event.projectId, event);
        } else {
            this.fastify.wsManager.broadcast(event);
        }
    }
}