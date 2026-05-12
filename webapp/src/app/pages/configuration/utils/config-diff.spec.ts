import { ConfigPatch, ConfigSchema } from '../models';
import { buildConfigDiffItems, getByPointer } from './config-diff';

describe('config-diff', () => {
  it('reads JSON pointer paths with escaped segments', () => {
    const value = {
      'a/b': {
        '~key': 1,
      },
    };

    expect(getByPointer(value, '/a~1b/~0key')).toBe(1);
  });

  it('matches nested patch paths to nearest schema field', () => {
    const schema: ConfigSchema = {
      groups: [
        {
          key: 'package',
          title: 'Package',
          fields: [
            {
              key: 'dependencies',
              label: 'Dependencies',
              type: 'json',
              path: '/dependencies',
            },
          ],
        },
      ],
    };
    const patches: ConfigPatch[] = [{ op: 'set', path: '/dependencies/rxjs', value: '^7.8.0' }];

    const [item] = buildConfigDiffItems({
      before: { dependencies: { rxjs: '^7.5.0' } },
      after: { dependencies: { rxjs: '^7.8.0' } },
      patches,
      schema,
    });

    expect(item.label).toBe('Dependencies');
    expect(item.groupTitle).toBe('Package');
    expect(item.before).toBe('^7.5.0');
    expect(item.after).toBe('^7.8.0');
  });

  it('handles remove patches without throwing', () => {
    const [item] = buildConfigDiffItems({
      before: { scripts: { test: 'ng test' } },
      after: { scripts: {} },
      patches: [{ op: 'remove', path: '/scripts/test' }],
    });

    expect(item.op).toBe('remove');
    expect(item.before).toBe('ng test');
    expect(item.after).toBeUndefined();
  });
});
