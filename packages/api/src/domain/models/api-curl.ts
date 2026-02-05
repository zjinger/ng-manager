export type ApiCurlStyle = 'bash' | 'powershell' | 'cmd';

export interface ApiCurlEntity {
    bash: string;
    powershell: string;
    cmd: string;
}