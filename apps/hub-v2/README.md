# hub-v2

`apps/hub-v2` is the next-generation implementation of the ng-manager hub.

Subdirectories:

- `server/`: Fastify + TypeScript backend
- `web/`: Angular + ng-zorro admin web
- `docs/`: implementation and design documents

## Version & Upgrade Notes

- Product version file: [`VERSION`](./VERSION)
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)

Common commands:

- Show version: `npm run version:show`
- Set version: `npm run version:set -- 2.0.1`
- Bump version: `npm run version:bump -- patch|minor|major`
- Generate upgrade notes (auto from recent commits): `npm run release:notes`
