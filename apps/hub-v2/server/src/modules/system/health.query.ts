import type { AppConfig } from "../../shared/env/env";
import type { HealthView } from "./health.contract";

export class HealthQueryService {
  constructor(private readonly config: AppConfig) {}

  getHealth(): HealthView {
    return {
      name: "ngm-hub-v2",
      status: "ok",
      timestamp: new Date().toISOString(),
      nodeEnv: this.config.nodeEnv
    };
  }
}
