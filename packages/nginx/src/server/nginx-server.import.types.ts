import type { CreateNginxServerRequest } from '../types/nginx.types';

export interface NginxImportIssue {
  level: 'error' | 'warning';
  message: string;
  field?: 'name' | 'domains' | 'listen';
}

export interface NginxImportParseCandidate {
  request?: CreateNginxServerRequest;
  error?: string;
}

export interface NginxImportAnalyzeCandidate {
  request?: CreateNginxServerRequest;
  issues?: NginxImportIssue[];
  error?: string;
}

