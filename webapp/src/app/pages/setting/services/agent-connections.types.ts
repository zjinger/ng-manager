export interface HubV2AgentConnectionSummary {
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
}

export interface HubV2AgentConnectionListResponse {
  items: HubV2AgentConnectionSummary[];
  defaultProject?: string;
  configPath: string;
}

export interface CreateHubV2AgentConnectionRequest {
  name: string;
  baseUrl: string;
  projectKey: string;
  projectName?: string;
  projectToken?: string;
  personalToken?: string;
  isDefault?: boolean;
}

export interface UpdateHubV2AgentConnectionRequest {
  baseUrl?: string;
  projectKey?: string;
  projectName?: string | null;
  projectToken?: string | null;
  personalToken?: string | null;
  isDefault?: boolean;
}
