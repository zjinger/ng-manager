import type {
  ApiCollectionEntityDto,
  ApiEnvironmentEntityDto,
  ApiHistoryEntityDto,
  ApiRequestEntityDto,
  SendResultDto,
} from "@yinuo-ngm/protocol";
import type {
  ApiCollectionEntity,
  ApiEnvironmentEntity,
  ApiHistoryEntity,
  ApiRequestEntity,
  SendResult,
} from "@yinuo-ngm/api";

export function toApiRequestEntityDto(entity: ApiRequestEntity): ApiRequestEntityDto {
  return {
    id: entity.id,
    name: entity.name,
    method: entity.method,
    url: entity.url,
    query: entity.query ?? [],
    pathParams: entity.pathParams ?? [],
    headers: entity.headers ?? [],
    body: entity.body,
    auth: entity.auth,
    options: entity.options,
    collectionId: entity.collectionId,
    order: entity.order,
    tags: entity.tags,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toApiEnvironmentEntityDto(entity: ApiEnvironmentEntity): ApiEnvironmentEntityDto {
  return {
    id: entity.id,
    name: entity.name,
    scope: entity.scope,
    projectId: entity.projectId,
    baseUrl: entity.baseUrl,
    variables: entity.variables ?? [],
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toApiCollectionEntityDto(entity: ApiCollectionEntity): ApiCollectionEntityDto {
  return {
    id: entity.id,
    name: entity.name,
    kind: entity.kind,
    scope: entity.scope,
    projectId: entity.projectId,
    nodes: entity.nodes ?? [],
    parentId: entity.parentId,
    order: entity.order,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toApiHistoryEntityDto(entity: ApiHistoryEntity): ApiHistoryEntityDto {
  return {
    id: entity.id,
    projectId: entity.projectId,
    collectionId: entity.collectionId,
    requestSnapshot: toApiRequestEntityDto(entity.requestSnapshot),
    resolved: {
      url: entity.resolved.url,
      headers: entity.resolved.headers,
    },
    response: entity.response,
    error: entity.error,
    metrics: entity.metrics,
    createdAt: entity.createdAt,
  };
}

export function toSendResultDto(result: SendResult): SendResultDto {
  return {
    historyId: result.historyId,
    response: result.response,
    error: result.error,
    metrics: result.metrics,
    curl: result.curl,
    responseSetCookies: result.responseSetCookies,
  };
}
