export type HubV2ProjectRecord = {
  name?: string;
  baseUrl?: string;
  projectKey?: string;
  projectName?: string;
  projectToken?: string;
  personalToken?: string;
  source?: string;
  [key: string]: unknown;
};

export type HubV2Record = {
  defaultProject?: string;
  projects?: Record<string, HubV2ProjectRecord>;
  [key: string]: unknown;
};

export type AgentConnectionsRootRecord = {
  version?: number;
  hubV2?: HubV2Record;
  [key: string]: unknown;
};

export type HubV2ConnectionListItem = {
  name: string;
  baseUrl: string;
  projectKey: string;
  projectName?: string;
  hasProjectToken: boolean;
  hasPersonalToken: boolean;
  projectTokenPreview?: string;
  personalTokenPreview?: string;
  isDefault: boolean;
  source?: string;
};

export type ListHubV2ConnectionsResult = {
  items: HubV2ConnectionListItem[];
  defaultProject?: string;
  configPath: string;
};

export type CreateHubV2ConnectionInput = {
  name: string;
  baseUrl: string;
  projectKey: string;
  projectName?: string;
  projectToken?: string | null;
  personalToken?: string | null;
  isDefault?: boolean;
};

export type UpdateHubV2ConnectionInput = {
  baseUrl?: string;
  projectKey?: string;
  projectName?: string;
  projectToken?: string | null;
  personalToken?: string | null;
  isDefault?: boolean;
};

export type AgentConnectionsRoutesOptions = {
  dataDir?: string;
};
