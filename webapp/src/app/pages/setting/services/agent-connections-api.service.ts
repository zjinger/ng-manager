import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@core/api';
import type {
  CreateHubV2AgentConnectionRequest,
  HubV2AgentConnectionListResponse,
  McpCheckResult,
  McpDoctorResult,
  TestConnectionResult,
  UpdateHubV2AgentConnectionRequest,
} from './agent-connections.types';

@Injectable({ providedIn: 'root' })
export class AgentConnectionsApiService {
  private api = inject(ApiClient);

  listHubV2AgentConnections() {
    return this.api.get<HubV2AgentConnectionListResponse>(
      '/api/agent-connections/hub-v2'
    );
  }

  createHubV2AgentConnection(input: CreateHubV2AgentConnectionRequest) {
    return this.api.post<HubV2AgentConnectionListResponse>(
      '/api/agent-connections/hub-v2',
      input
    );
  }

  updateHubV2AgentConnection(name: string, input: UpdateHubV2AgentConnectionRequest) {
    return this.api.put<HubV2AgentConnectionListResponse>(
      `/api/agent-connections/hub-v2/${encodeURIComponent(name)}`,
      input
    );
  }

  deleteHubV2AgentConnection(name: string) {
    return this.api.delete<HubV2AgentConnectionListResponse>(
      `/api/agent-connections/hub-v2/${encodeURIComponent(name)}`
    );
  }

  setDefaultHubV2AgentConnection(name: string) {
    return this.api.post<HubV2AgentConnectionListResponse>(
      `/api/agent-connections/hub-v2/${encodeURIComponent(name)}/set-default`
    );
  }

  testHubV2AgentConnection(name: string) {
    return this.api.post<TestConnectionResult>(
      `/api/agent-connections/hub-v2/${encodeURIComponent(name)}/test`
    );
  }

  checkMcpServer() {
    return this.api.post<McpCheckResult>(
      '/api/agent-connections/mcp-check'
    );
  }

  runMcpDoctor() {
    return this.api.post<McpDoctorResult>(
      '/api/agent-connections/mcp-doctor'
    );
  }
}
