import { JsonNode } from '../models/json.node.model';

/**
 * 建立 json 树
 * @param value  
 * @param key 
 * @param path 
 * @returns 
 */
export function buildJsonTree(value: any, key?: string, path = 'root'): JsonNode {
  if (value === null) {
    return {
      key,
      type: 'null',
      value: null,
      path,
    };
  }

  if (Array.isArray(value)) {
    return {
      key,
      type: 'array',
      path,
      children: value.map((item, index) => buildJsonTree(item, String(index), `${path}[${index}]`)),
    };
  }

  if (typeof value === 'object') {
    return {
      key,
      type: 'object',
      path,
      children: Object.entries(value).map(([k, v]) => buildJsonTree(v, k, `${path}.${k}`)),
    };
  }

  return {
    key,
    type: typeof value as any,
    value,
    path,
  };
}
