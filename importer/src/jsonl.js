import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

/**
 * JSONL: one complete JSON value per line, newline-terminated.
 * See https://jsonltools.com/what-is-jsonl
 */

/**
 * Append-only JSONL writer. Records are flushed as they arrive so a run that is
 * interrupted still leaves every row it had already written on disk.
 */
export class JsonlWriter {
  /**
   * @param {string} file
   * @param {{append?: boolean}} [options]
   */
  constructor(file, options = {}) {
    this.file = file;
    this.append = options.append ?? false;
    this.count = 0;
    this._stream = null;
    this._opening = null;
  }

  /**
   * Open the output stream exactly once.
   *
   * The promise is memoised rather than guarded by `if (this._stream)`: writes
   * arrive concurrently, and a plain check lets several callers past before any
   * of them has assigned the stream. Each would then create its own stream with
   * flag 'w', truncating the file and orphaning every write made to the streams
   * that lost the race.
   */
  _open() {
    if (!this._opening) {
      this._opening = (async () => {
        await mkdir(path.dirname(this.file), { recursive: true });
        this._stream = createWriteStream(this.file, {
          flags: this.append ? 'a' : 'w',
          encoding: 'utf8',
        });
      })();
    }
    return this._opening;
  }

  /**
   * @param {object} record
   */
  async write(record) {
    await this._open();
    this.count += 1;
    const line = `${JSON.stringify(record)}\n`;
    if (!this._stream.write(line)) {
      await new Promise((resolve) => this._stream.once('drain', resolve));
    }
  }

  /**
   * @param {Iterable<object>} records
   */
  async writeAll(records) {
    for (const record of records) await this.write(record);
  }

  async close() {
    if (this._opening) await this._opening;
    if (!this._stream) return;
    const stream = this._stream;
    this._stream = null;
    await new Promise((resolve, reject) => {
      stream.end((error) => (error ? reject(error) : resolve()));
    });
  }
}

/**
 * Write a whole array as JSONL in one call.
 *
 * @param {string} file
 * @param {Iterable<object>} records
 */
export async function writeJsonl(file, records) {
  const writer = new JsonlWriter(file);
  await writer.writeAll(records);
  await writer.close();
  return writer.count;
}

/**
 * Read a JSONL file into an array, skipping blank lines.
 *
 * Malformed lines are reported with their line number rather than throwing an
 * opaque parse error, since a truncated final line is the usual cause.
 *
 * @param {string} file
 * @returns {Promise<object[]>}
 */
export async function readJsonl(file) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const records = [];
  const lines = text.split('\n');
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch (error) {
      throw new Error(`${file}:${index + 1} is not valid JSON: ${error.message}`);
    }
  }
  return records;
}

/**
 * Stream a JSONL file one record at a time, for files too large to hold in memory.
 *
 * @param {string} file
 * @returns {AsyncGenerator<object>}
 */
export async function* streamJsonl(file) {
  const input = createReadStream(file, { encoding: 'utf8' });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) yield JSON.parse(trimmed);
  }
}
