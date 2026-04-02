import type { RequestContext } from "../../shared/context/request-context";
import type { ProjectAccessContract } from "../project/project-access.contract";
import { SearchRepo } from "./search.repo";
import type { SearchEntityType, SearchQueryInput, SearchResult } from "./search.types";

export class SearchService {
  constructor(
    private readonly repo: SearchRepo,
    private readonly projectAccess: ProjectAccessContract
  ) {}

  async search(input: SearchQueryInput, ctx: RequestContext): Promise<SearchResult> {
    const keyword = input.q.trim();
    if (keyword.length < 2) {
      return {
        items: [],
        total: 0
      };
    }

    const projectIds = await this.projectAccess.listAccessibleProjectIds(ctx);
    const isAdmin = ctx.roles.includes("admin");
    const globalProjectNullPublishedOnly = !isAdmin;

    const matchExpression = this.buildMatchExpression(keyword);
    if (!matchExpression) {
      return {
        items: [],
        total: 0
      };
    }

    const repoResult = this.repo.search({
      matchExpression,
      projectIds,
      includeGlobalProjectNull: true,
      globalProjectNullPublishedOnly,
      types: input.types,
      limit: input.limit
    });

    const items = repoResult.items.map((row) => ({
      type: row.entityType,
      id: row.entityId,
      projectId: row.projectId,
      title: row.title,
      snippet: row.snippet,
      updatedAt: row.updatedAt,
      score: row.score,
      url: this.buildEntityUrl(row.entityType, row.entityId)
    }));

    return {
      items,
      total: repoResult.total
    };
  }

  private buildMatchExpression(keyword: string): string {
    const tokens = this.extractSearchTokens(keyword);
    if (tokens.length === 0) {
      return "";
    }
    return tokens.map((token) => `"${this.escapeMatchToken(token)}"*`).join(" AND ");
  }

  private extractSearchTokens(keyword: string): string[] {
    const matches = keyword.match(/[\p{L}\p{N}_-]+/gu) ?? [];
    const tokens = matches
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return Array.from(new Set(tokens));
  }

  private escapeMatchToken(token: string): string {
    return token.replace(/"/g, "\"\"");
  }

  private buildEntityUrl(type: SearchEntityType, entityId: string): string {
    if (type === "issue") {
      return `/issues/${entityId}`;
    }
    if (type === "rd") {
      return `/rd/${entityId}`;
    }
    if (type === "document") {
      return `/content?tab=documents&detail=${encodeURIComponent(entityId)}`;
    }
    return `/content?tab=releases&detail=${encodeURIComponent(entityId)}`;
  }
}
