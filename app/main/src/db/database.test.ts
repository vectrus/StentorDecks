import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDatabase, getSchemaVersion, openDatabase } from './database';

describe('database migrations', () => {
  let dir: string;

  afterEach(() => {
    closeDatabase();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('applies migration 001 and reports schema_version 1', () => {
    // Native addon is built for Electron ABI; skip under plain Node if mismatched.
    try {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stentor-db-'));
      const { recovered } = openDatabase(dir);
      expect(recovered).toBe(false);
      expect(getSchemaVersion()).toBe(1);
      expect(fs.existsSync(path.join(dir, 'stentordeck.sqlite'))).toBe(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NODE_MODULE_VERSION')) {
        console.warn('[db.test] skip — better-sqlite3 ABI is for Electron, not this Node');
        return;
      }
      throw err;
    }
  });
});

