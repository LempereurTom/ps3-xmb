import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHealthReporter } from '../src/health';

test('held navigation sends only the latest command each second and drains on unload', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const sent: [string, string | number][] = [];
  const health = createHealthReporter((event, value) => sent.push([event, value]));
  for (let i = 0; i < 20; i++) {
    health.report('last_input', 'up');
    t.mock.timers.tick(45);
  }
  health.report('last_input', 'left');
  health.report('library_count', 1000);
  assert.deepEqual(sent, [['library_count', 1000]]);
  t.mock.timers.tick(100);
  assert.deepEqual(sent[1], ['last_input', 'left']);

  health.report('last_input', 'right');
  t.mock.timers.tick(1000);
  health.report('last_input', 'down');
  health.report('last_input', 'confirm');
  health.flushInput();
  health.flushInput();
  t.mock.timers.tick(2000);
  assert.deepEqual(sent.slice(2), [['last_input', 'right'], ['last_input', 'confirm']]);
});
