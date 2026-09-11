import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { JsonlWriter, readJsonl, streamJsonl, writeJsonl } from '../src/jsonl.js';

let dir;

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'wg-jsonl-'));
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('JSONL round-trip', () => {
  it('writes one JSON value per line and reads it back', async () => {
    const file = path.join(dir, 'basic.jsonl');
    const records = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    assert.equal(await writeJsonl(file, records), 2);
    assert.deepEqual(await readJsonl(file), records);
  });

  it('creates missing parent directories', async () => {
    const file = path.join(dir, 'nested/deeper/out.jsonl');
    await writeJsonl(file, [{ ok: true }]);
    assert.deepEqual(await readJsonl(file), [{ ok: true }]);
  });

  it('returns an empty array for a file that does not exist', async () => {
    assert.deepEqual(await readJsonl(path.join(dir, 'nope.jsonl')), []);
  });

  it('reports the line number of malformed JSON', async () => {
    const file = path.join(dir, 'broken.jsonl');
    await writeJsonl(file, [{ a: 1 }]);
    const { appendFile } = await import('node:fs/promises');
    await appendFile(file, '{not json}\n');
    await assert.rejects(() => readJsonl(file), /broken\.jsonl:2 is not valid JSON/);
  });

  it('escapes newlines inside values so each record stays on one line', async () => {
    const file = path.join(dir, 'multiline.jsonl');
    await writeJsonl(file, [{ notes: 'line one\nline two' }, { notes: 'plain' }]);
    const { readFile } = await import('node:fs/promises');
    const text = await readFile(file, 'utf8');
    assert.equal(text.trimEnd().split('\n').length, 2);
    assert.deepEqual(await readJsonl(file), [
      { notes: 'line one\nline two' },
      { notes: 'plain' },
    ]);
  });

  it('streams records one at a time', async () => {
    const file = path.join(dir, 'stream.jsonl');
    await writeJsonl(file, [{ i: 0 }, { i: 1 }, { i: 2 }]);
    const seen = [];
    for await (const record of streamJsonl(file)) seen.push(record.i);
    assert.deepEqual(seen, [0, 1, 2]);
  });
});

describe('JsonlWriter under concurrency', () => {
  it('keeps every record when writes are issued in parallel', async () => {
    const file = path.join(dir, 'concurrent.jsonl');
    const writer = new JsonlWriter(file);
    const total = 200;
    await Promise.all(
      Array.from({ length: total }, async (_, i) => {
        await new Promise((resolve) => setImmediate(resolve));
        await writer.write({ i });
      }),
    );
    await writer.close();

    const records = await readJsonl(file);
    assert.equal(records.length, total, 'no records may be lost');
    assert.equal(writer.count, total);
    assert.deepEqual(
      records.map((record) => record.i).sort((a, b) => a - b),
      Array.from({ length: total }, (_, i) => i),
    );
  });

  it('appends instead of truncating when append is set', async () => {
    const file = path.join(dir, 'append.jsonl');
    const first = new JsonlWriter(file);
    await first.write({ n: 1 });
    await first.close();

    const second = new JsonlWriter(file, { append: true });
    await second.write({ n: 2 });
    await second.close();

    assert.deepEqual(await readJsonl(file), [{ n: 1 }, { n: 2 }]);
  });

  it('closes cleanly when nothing was ever written', async () => {
    const writer = new JsonlWriter(path.join(dir, 'empty.jsonl'));
    await writer.close();
    assert.equal(writer.count, 0);
  });
});
