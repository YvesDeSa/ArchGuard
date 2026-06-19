import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { saveSnapshot, loadLatestSnapshot, listSnapshots } from '../core/snapshot';
import { OpenApiSnapshot, ArchGuardConfig } from '../types/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'archguard-test-'));
}

function makeConfig(snapshotPath: string): ArchGuardConfig {
  return {
    projectName: 'test-api',
    historyPath: './docs/history',
    snapshotPath,
    swaggerUrl: undefined,
    notify: { breakingChangesOnly: false },
    git: { autoCommit: false, commitMessage: 'chore: test' },
  };
}

function makeSnapshot(version = 'v1'): OpenApiSnapshot {
  return {
    version,
    capturedAt: new Date().toISOString(),
    projectName: 'test-api',
    spec: {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/users': {
          get: { summary: 'List users', responses: { '200': { description: 'OK' } } },
        },
      },
      components: { schemas: {} },
    },
  };
}

// ─── saveSnapshot ─────────────────────────────────────────────────────────────

describe('saveSnapshot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the snapshot directory if it does not exist', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    const config = makeConfig(snapshotDir);
    const snapshot = makeSnapshot('v1');

    saveSnapshot(snapshot, config);

    expect(fs.existsSync(snapshotDir)).toBe(true);
  });

  it('writes snapshot-<version>.json file', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    const config = makeConfig(snapshotDir);
    const snapshot = makeSnapshot('2024-01-01T00-00-00');

    saveSnapshot(snapshot, config);

    const expectedFile = path.join(snapshotDir, 'snapshot-2024-01-01T00-00-00.json');
    expect(fs.existsSync(expectedFile)).toBe(true);

    const content = JSON.parse(fs.readFileSync(expectedFile, 'utf-8')) as OpenApiSnapshot;
    expect(content.version).toBe('2024-01-01T00-00-00');
    expect(content.projectName).toBe('test-api');
  });

  it('always writes snapshot-latest.json', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    const config = makeConfig(snapshotDir);
    const snapshot = makeSnapshot('v1');

    saveSnapshot(snapshot, config);

    const latestFile = path.join(snapshotDir, 'snapshot-latest.json');
    expect(fs.existsSync(latestFile)).toBe(true);
  });

  it('snapshot-latest.json is overwritten on subsequent saves', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    const config = makeConfig(snapshotDir);

    saveSnapshot(makeSnapshot('v1'), config);
    saveSnapshot(makeSnapshot('v2'), config);

    const latestFile = path.join(snapshotDir, 'snapshot-latest.json');
    const content = JSON.parse(fs.readFileSync(latestFile, 'utf-8')) as OpenApiSnapshot;
    expect(content.version).toBe('v2');
  });

  it('returns the correct filepath', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    const config = makeConfig(snapshotDir);
    const snapshot = makeSnapshot('test-version');

    const result = saveSnapshot(snapshot, config);

    expect(result).toBe(path.join(snapshotDir, 'snapshot-test-version.json'));
  });
});

// ─── loadLatestSnapshot ───────────────────────────────────────────────────────

describe('loadLatestSnapshot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no snapshot exists', () => {
    const config = makeConfig(path.join(tmpDir, '.archguard'));
    const result = loadLatestSnapshot(config);
    expect(result).toBeNull();
  });

  it('returns the latest saved snapshot', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    const config = makeConfig(snapshotDir);
    const snapshot = makeSnapshot('v3');

    saveSnapshot(snapshot, config);

    const loaded = loadLatestSnapshot(config);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe('v3');
    expect(loaded!.spec.paths['/users']).toBeDefined();
  });

  it('loaded snapshot is deeply equal to saved snapshot', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    const config = makeConfig(snapshotDir);
    const snapshot = makeSnapshot('v1');

    saveSnapshot(snapshot, config);
    const loaded = loadLatestSnapshot(config);

    expect(loaded).toEqual(snapshot);
  });
});

// ─── listSnapshots ────────────────────────────────────────────────────────────

describe('listSnapshots', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when directory does not exist', () => {
    const config = makeConfig(path.join(tmpDir, 'nonexistent'));
    const result = listSnapshots(config);
    expect(result).toEqual([]);
  });

  it('returns empty array when no snapshots saved yet', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    fs.mkdirSync(snapshotDir, { recursive: true });
    const config = makeConfig(snapshotDir);

    const result = listSnapshots(config);
    expect(result).toEqual([]);
  });

  it('returns snapshot files excluding snapshot-latest.json', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    const config = makeConfig(snapshotDir);

    saveSnapshot(makeSnapshot('2024-01-01T00-00-00'), config);
    saveSnapshot(makeSnapshot('2024-01-02T00-00-00'), config);

    const list = listSnapshots(config);

    expect(list).not.toContain('snapshot-latest.json');
    expect(list.some((f) => f.includes('2024-01-01'))).toBe(true);
    expect(list.some((f) => f.includes('2024-01-02'))).toBe(true);
  });

  it('returns list in reverse chronological order (latest first)', () => {
    const snapshotDir = path.join(tmpDir, '.archguard');
    const config = makeConfig(snapshotDir);

    saveSnapshot(makeSnapshot('2024-01-01T00-00-00'), config);
    saveSnapshot(makeSnapshot('2024-01-03T00-00-00'), config);
    saveSnapshot(makeSnapshot('2024-01-02T00-00-00'), config);

    const list = listSnapshots(config);

    expect(list[0]).toContain('2024-01-03');
    expect(list[1]).toContain('2024-01-02');
    expect(list[2]).toContain('2024-01-01');
  });
});
