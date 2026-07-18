import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type DbHandle = Database.Database;

let db: DbHandle | null = null;

export function getDb(): DbHandle {
  if (!db) throw new Error('Database not opened');
  return db;
}

/**
 * Open or create SQLite in userData. Corruption stance (docs/02):
 * on open failure, move file aside, recreate, return { recovered: true }.
 */
export function openDatabase(userDataPath: string): { db: DbHandle; recovered: boolean } {
  const dbPath = path.join(userDataPath, 'stentordeck.sqlite');
  fs.mkdirSync(userDataPath, { recursive: true });

  let recovered = false;
  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  } catch (err) {
    console.error('[db] open/migrate failed, recreating', err);
    try {
      db?.close();
    } catch {
      /* ignore */
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const aside = `${dbPath}.corrupt-${stamp}`;
    if (fs.existsSync(dbPath)) {
      fs.renameSync(dbPath, aside);
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    recovered = true;
  }

  return { db, recovered };
}

export function closeDatabase(): void {
  db?.close();
  db = null;
}

function migrationsDir(): string {
  const candidates = [
    path.join(__dirname, 'migrations'),
    path.join(process.cwd(), 'app/main/dist/migrations'),
    path.join(process.cwd(), 'app/main/src/db/migrations'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('migrations directory not found');
}

function runMigrations(database: DbHandle): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const row = database.prepare(`SELECT value FROM kv WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined;
  let current = row ? Number.parseInt(row.value, 10) : 0;
  if (Number.isNaN(current)) current = 0;

  const dir = migrationsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+_.*\.sql$/i.test(f))
    .sort();

  for (const file of files) {
    const match = /^(\d+)_/.exec(file);
    if (!match) continue;
    const version = Number.parseInt(match[1]!, 10);
    if (version <= current) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const tx = database.transaction(() => {
      database.exec(sql);
      database
        .prepare(
          `INSERT INTO kv (key, value) VALUES ('schema_version', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        )
        .run(String(version));
    });
    tx();
    current = version;
  }
}

export function getSchemaVersion(): number {
  const row = getDb().prepare(`SELECT value FROM kv WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined;
  return row ? Number.parseInt(row.value, 10) : 0;
}
