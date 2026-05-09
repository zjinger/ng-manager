import type { ConfigDocument } from "./config-document";
import type {
  ConfigDetectContext,
  ConfigDetectResult,
  ConfigPreviewContext,
  ConfigReadContext,
  ConfigSchemaContext,
  ConfigWriteContext
} from "./config-detect";
import type { ConfigPreviewResult, ConfigWriteResult } from "./config-patch";
import type { ConfigSchema } from "./config-schema";

export interface ConfigProvider {
  type: string;
  title: string;
  description?: string;

  detect(ctx: ConfigDetectContext): Promise<ConfigDetectResult>;
  read(ctx: ConfigReadContext): Promise<ConfigDocument>;
  getSchema(ctx: ConfigSchemaContext): Promise<ConfigSchema>;
  preview?(ctx: ConfigPreviewContext): Promise<ConfigPreviewResult>;
  write(ctx: ConfigWriteContext): Promise<ConfigWriteResult>;
}
