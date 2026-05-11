import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import type { ConfigPatch } from "../types/config-patch";

export function validateJsonPointerPatches(patches: ConfigPatch[]): void {
  for (const patch of patches) {
    if (!patch.path.startsWith("/") && patch.path !== "") {
      throw new CoreError(
        CoreErrorCodes.CONFIG_PATCH_INVALID,
        `Invalid config patch path: ${patch.path}`,
        { patch }
      );
    }
  }
}
