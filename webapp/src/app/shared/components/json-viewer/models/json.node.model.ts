export type JsonValueType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null';

export interface JsonNode {
  key?: string;

  type: JsonValueType;

  value?: any;

  path: string;

  children?: JsonNode[];
}