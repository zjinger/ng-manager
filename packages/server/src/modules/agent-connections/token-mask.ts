export function maskToken(token?: string | null): string | undefined {
  if (!token) {
    return undefined;
  }
  if (token.length <= 8) {
    return "****";
  }
  return `${token.slice(0, 4)}****${token.slice(-4)}`;
}
