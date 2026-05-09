import type { ConfigSchema } from "./config-schema";
import type { ConfigWarning } from "./config-error";

export interface ConfigDocument<TViewModel = unknown, TRaw = unknown> {
  id: string;
  type: string;
  title: string;
  projectRoot: string;
  filePath: string;

  raw: TRaw;
  viewModel: TViewModel;
  schema: ConfigSchema;

  readonly?: boolean;
  warnings?: ConfigWarning[];
  metadata?: Record<string, unknown>;
}
