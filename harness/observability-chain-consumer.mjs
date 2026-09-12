import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { Linter } from 'eslint';

const sourceRoot = process.env.NEXT_LOGGERS_SOURCE;
assert.ok(sourceRoot, 'NEXT_LOGGERS_SOURCE must point at an exact checked-out source tree');

const eslintModule = await import(pathToFileURL(`${sourceRoot}/dist/eslint-plugin.js`).href);
const baseModule = await import(pathToFileURL(`${sourceRoot}/dist/base-logger.js`).href);
const eslintPlugin = eslintModule.default;
const { createLogger } = baseModule;

function lint(code) {
  const linter = new Linter();
  return linter.verify(
    code,
    [
      {
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        plugins: { 'next-loggers': eslintPlugin },
        rules: { 'next-loggers/require-observability-chain': 'error' },
      },
    ],
    { filename: 'external-consumer.mjs' },
  );
}

test('external consumer accepts the complete static observability chain', () => {
  const messages = lint(`
    import { createLogger } from '@oresoftware/next-loggers';
    const log = createLogger();
    const routineId = 'ores-routine-V1StGXR8_Z5jdHi6B-myT';
    log.info('accepted')
      .addTraceId('ores-trace-cW7Kq3_nR9fX2mP8AzL4H')
      .addRoutineId(routineId)
      .send();
  `);
  assert.deepEqual(messages, []);
});

test('external consumer rejects missing send/trace/routine with one rule finding', () => {
  const messages = lint(`
    import { logger } from '@oresoftware/next-loggers';
    logger.error('incomplete');
  `);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].ruleId, 'next-loggers/require-observability-chain');
  assert.match(messages[0].message, /send/);
  assert.match(messages[0].message, /ores-trace/);
  assert.match(messages[0].message, /routineId/);
});

test('external consumer honors eslint one-line suppression', () => {
  const messages = lint(`
    import { logger } from '@oresoftware/next-loggers';
    // eslint-disable-next-line next-loggers/require-observability-chain -- third-party bridge
    logger.warn('intentionally exempt');
  `);
  assert.deepEqual(messages, []);
});

test('runtime record preserves stable trace and routine markers', async () => {
  const records = [];
  const logger = createLogger({
    console: false,
    transports: { write: (record) => records.push(record) },
  });
  const routineId = 'ores-routine-V1StGXR8_Z5jdHi6B-myT';
  await logger
    .info('runtime contract')
    .addTraceId('ores-trace-cW7Kq3_nR9fX2mP8AzL4H')
    .addRoutineId(routineId)
    .send();
  assert.equal(records.length, 1);
  assert.equal(records[0].traceId, 'ores-trace-cW7Kq3_nR9fX2mP8AzL4H');
  assert.equal(records[0].routineId, routineId);
});
