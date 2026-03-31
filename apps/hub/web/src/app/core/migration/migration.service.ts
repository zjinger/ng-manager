import { Injectable } from '@angular/core';
import { HUB_MIGRATION_CONFIG, HubMigrationConfig } from './migration.config';

@Injectable({
    providedIn: 'root'
})
export class MigrationService {
    private readonly ackKey = 'hub_v2_migration_ack';

    readonly config: HubMigrationConfig = HUB_MIGRATION_CONFIG;

    get enabled(): boolean {
        return this.config.enabled;
    }

    get showBanner(): boolean {
        return this.config.enabled && this.config.showBanner;
    }

    buildV2Url(path?: string): string {
        const base = this.config.v2BaseUrl.replace(/\/+$/, '');

        if (!path) {
            return base;
        }

        return `${base}/${path.replace(/^\/+/, '')}`;
    }

    redirectToV2(path?: string): void {
        window.location.href = this.buildV2Url(path);
    }

    replaceToV2(path?: string): void {
        window.location.replace(this.buildV2Url(path));
    }

    hasAcknowledged(): boolean {
        return localStorage.getItem(this.ackKey) === '1';
    }

    acknowledge(): void {
        localStorage.setItem(this.ackKey, '1');
    }

    clearAcknowledge(): void {
        localStorage.removeItem(this.ackKey);
    }
}