export interface ConfigSchema {
  groups: ConfigGroup[];
}

export interface ConfigGroup {
  key: string;
  title: string;
  description?: string;
  defaultExpanded?: boolean;
  jsonPath?: string;
  fields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "multi-text"
    | "json"
    | "path"
    | "table"
    | "readonly";

  path: string;
  description?: string;
  placeholder?: string;
  readonly?: boolean;

  options?: Array<{
    label: string;
    value: string | number | boolean;
  }>;

  metadata?: Record<string, unknown>;
}
