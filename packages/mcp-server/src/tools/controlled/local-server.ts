import type { LocalServerAvailability, LocalServerClient, ToolContext } from "../../context/tool-context";

export async function localServerAvailability(context: ToolContext): Promise<LocalServerAvailability> {
  if (!context.services.localServer) {
    return { available: false, reason: "local server client is not configured" };
  }
  return context.services.localServer.availability();
}

export async function requireLocalServer(context: ToolContext): Promise<{ server?: LocalServerClient; availability: LocalServerAvailability }> {
  const availability = await localServerAvailability(context);
  return {
    server: availability.available ? context.services.localServer : undefined,
    availability,
  };
}
