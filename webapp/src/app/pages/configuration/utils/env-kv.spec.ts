import { buildEnvKeyValueDiffs, parseEnvKeyValues } from './env-kv';

describe('env-kv', () => {
  it('parses Angular environment object literals with nested values', () => {
    const entries = parseEnvKeyValues(`
      export const environment = {
        production: false,
        apiBaseUrl: 'http://localhost:3000/api',
        featureFlags: {
          newDashboard: true,
          betaEditor: false,
        },
        sentryDsn: 'https://xxx@sentry.io/123',
      };
    `);

    expect(entries.map((entry) => [entry.key, entry.value])).toEqual([
      ['production', 'false'],
      ['apiBaseUrl', 'http://localhost:3000/api'],
      ['featureFlags.newDashboard', 'true'],
      ['featureFlags.betaEditor', 'false'],
      ['sentryDsn', 'https://xxx@sentry.io/123'],
    ]);
    expect(entries.find((entry) => entry.key === 'sentryDsn')?.sensitive).toBeTrue();
  });

  it('builds key-level diffs for environment raw text', () => {
    const diffs = buildEnvKeyValueDiffs(
      'export const environment = { production: true, apiBaseUrl: "/api" };',
      'export const environment = { production: false, apiBaseUrl: "/api" };',
    );

    expect(diffs).toEqual([
      {
        key: 'production',
        before: 'true',
        after: 'false',
        op: 'set',
        sensitive: false,
      },
    ]);
  });

  it('parses dotenv files', () => {
    expect(parseEnvKeyValues('NODE_ENV=development\nAPI_BASE_URL=http://localhost:3000')).toEqual([
      { key: 'NODE_ENV', value: 'development', sensitive: false, line: 1, commented: false },
      { key: 'API_BASE_URL', value: 'http://localhost:3000', sensitive: false, line: 2, commented: false },
    ]);
  });
});
