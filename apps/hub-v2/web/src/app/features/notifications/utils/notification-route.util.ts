import type { NotificationCategory, NotificationItem } from '../models/notification.model';

export interface NotificationRouteTarget {
  path: string[] | null;
  query?: Record<string, string>;
}

type ParsedRoute = {
  path: string;
  query: Record<string, string>;
};

const ISSUE_CATEGORIES: NotificationCategory[] = ['issue_todo', 'issue_mention', 'issue_activity'];
const RD_CATEGORIES: NotificationCategory[] = ['rd_todo', 'rd_activity'];
const CONTENT_CATEGORIES: NotificationCategory[] = ['announcement', 'document', 'release'];

export function buildNotificationRouteTarget(item: NotificationItem): NotificationRouteTarget {
  if (item.category === 'project_member') {
    return { path: null };
  }

  const parsed = parseRoute(item.route);
  const entityId = resolveEntityId(parsed);

  if (ISSUE_CATEGORIES.includes(item.category) && entityId) {
    return withQuery(['/issues', entityId], omitDetailQuery(parsed.query));
  }

  if (RD_CATEGORIES.includes(item.category) && entityId) {
    return withQuery(['/rd', entityId], omitDetailQuery(parsed.query));
  }

  if (CONTENT_CATEGORIES.includes(item.category)) {
    const query: Record<string, string> = { ...parsed.query };
    query['tab'] = contentTabFromCategory(item.category);
    if (entityId) {
      query['detail'] = entityId;
    }
    return withQuery(['/content'], query);
  }

  const path = normalizePath(parsed.path);
  return withQuery([path], parsed.query);
}

function parseRoute(route: string): ParsedRoute {
  const [rawPath = '', queryString = ''] = (route || '').split('?');
  const query: Record<string, string> = {};
  const params = new URLSearchParams(queryString);
  params.forEach((value, key) => {
    query[key] = value;
  });
  return {
    path: normalizePath(rawPath),
    query,
  };
}

function normalizePath(path: string): string {
  const normalized = (path || '').trim();
  if (!normalized) {
    return '/notifications';
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function resolveEntityId(parsed: ParsedRoute): string | null {
  const detail = parsed.query['detail']?.trim();
  if (detail) {
    return detail;
  }

  const pathParts = parsed.path.split('/').filter(Boolean);
  if (pathParts.length === 2 && (pathParts[0] === 'issues' || pathParts[0] === 'rd')) {
    return pathParts[1] || null;
  }

  return null;
}

function omitDetailQuery(query: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = { ...query };
  delete next['detail'];
  return next;
}

function withQuery(path: string[], query: Record<string, string>): NotificationRouteTarget {
  if (Object.keys(query).length === 0) {
    return { path };
  }
  return { path, query };
}

function contentTabFromCategory(category: NotificationCategory): string {
  if (category === 'announcement') {
    return 'announcements';
  }
  if (category === 'document') {
    return 'documents';
  }
  if (category === 'release') {
    return 'releases';
  }
  return 'announcements';
}
