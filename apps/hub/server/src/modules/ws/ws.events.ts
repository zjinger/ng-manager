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

    issueCreated(input: {
        id: string;
        issueNo: string;
        title: string;
        status: string;
        assigneeId?: string | null;
        assigneeName?: string | null;
        projectId: string;
        userIds: string[];
    }) {
        const event = buildEvent(
            "issue.created",
            {
                id: input.id,
                issueNo: input.issueNo,
                title: input.title,
                status: input.status,
                assigneeId: input.assigneeId ?? null,
                assigneeName: input.assigneeName ?? null,
            },
            input.projectId
        );

        this.dispatch(event, input.userIds);
    }

    issueUpdated(input: {
        id: string;
        issueNo: string;
        title: string;
        status: string;
        action: string;
        assigneeId?: string | null;
        assigneeName?: string | null;
        projectId: string;
        userIds: string[];
    }) {
        const event = buildEvent(
            "issue.updated",
            {
                id: input.id,
                issueNo: input.issueNo,
                title: input.title,
                status: input.status,
                action: input.action,
                assigneeId: input.assigneeId ?? null,
                assigneeName: input.assigneeName ?? null,
            },
            input.projectId
        );

        this.dispatch(event, input.userIds);
    }

    rdCreated(input: {
        id: string;
        rdNo: string;
        title: string;
        status: string;
        projectId: string;
    }) {
        const event = buildEvent(
            "rd.created",
            {
                id: input.id,
                rdNo: input.rdNo,
                title: input.title,
                status: input.status,
            },
            input.projectId
        );

        this.dispatch(event);
    }

    rdUpdated(input: {
        id: string;
        rdNo: string;
        title: string;
        status: string;
        action: string;
        projectId: string;
    }) {
        const event = buildEvent(
            "rd.updated",
            {
                id: input.id,
                rdNo: input.rdNo,
                title: input.title,
                status: input.status,
                action: input.action,
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

    private dispatch(event: HubWsEvent, userIds?: string[]) {
        const normalizedUserIds = Array.from(
            new Set((userIds || []).map((item) => String(item).trim()).filter(Boolean))
        );

        if (normalizedUserIds.length > 0) {
            this.fastify.wsManager.broadcastToUsers(normalizedUserIds, event);
            return;
        }

        if (event.projectId) {
            this.fastify.wsManager.broadcastToProject(event.projectId, event);
        } else {
            this.fastify.wsManager.broadcast(event);
        }
    }
}
