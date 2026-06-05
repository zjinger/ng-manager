# @yinuo-ngm/sl-hub-v2-mcp

Deprecated migration package.

ng-manager now uses the unified MCP server in `@yinuo-ngm/mcp-server`. Start it through the CLI:

```bash
ngm mcp
```

Do not configure this package as the recommended Agent entrypoint for new Hub V2 work. Keep it only for migration compatibility while Hub V2 tools are moved into `packages/mcp-server`.
