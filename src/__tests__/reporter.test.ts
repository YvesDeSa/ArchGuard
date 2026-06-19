import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateMarkdownReport, saveReport } from '../core/reporter';
import { DiffReport, ArchGuardConfig } from '../types/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'archguard-reporter-test-'));
}

function makeConfig(historyPath: string): ArchGuardConfig {
  return {
    projectName: 'test-api',
    historyPath,
    snapshotPath: './.archguard',
    notify: { breakingChangesOnly: false },
    git: { autoCommit: false, commitMessage: 'chore: test' },
  };
}

function makeReport(overrides: Partial<DiffReport> = {}): DiffReport {
  return {
    projectName: 'test-api',
    generatedAt: '2024-06-19T10:00:00.000Z',
    fromVersion: 'v1',
    toVersion: 'v2',
    fromSnapshot: 'snapshot-v1.json',
    toSnapshot: 'snapshot-v2.json',
    summary: {
      totalChanges: 0,
      breakingChanges: 0,
      addedEndpoints: 0,
      removedEndpoints: 0,
      modifiedEndpoints: 0,
      addedSchemas: 0,
      removedSchemas: 0,
      modifiedSchemas: 0,
    },
    changes: [],
    ...overrides,
  };
}

// ─── generateMarkdownReport — header ─────────────────────────────────────────

describe('generateMarkdownReport — header', () => {
  it('includes the project name', () => {
    const report = makeReport();
    const md = generateMarkdownReport(report, makeConfig('./history'));
    expect(md).toContain('test-api');
  });

  it('includes from and to snapshot filenames', () => {
    const report = makeReport();
    const md = generateMarkdownReport(report, makeConfig('./history'));
    expect(md).toContain('snapshot-v1.json');
    expect(md).toContain('snapshot-v2.json');
  });

  it('renders the ArchGuard shield emoji in the title', () => {
    const md = generateMarkdownReport(makeReport(), makeConfig('./history'));
    expect(md).toContain('🛡');
  });
});

// ─── generateMarkdownReport — no changes ─────────────────────────────────────

describe('generateMarkdownReport — no changes', () => {
  it('shows no-changes message when changes array is empty', () => {
    const report = makeReport({ changes: [] });
    const md = generateMarkdownReport(report, makeConfig('./history'));
    expect(md).toContain('No Changes Detected');
  });
});

// ─── generateMarkdownReport — breaking changes warning ───────────────────────

describe('generateMarkdownReport — breaking changes', () => {
  it('shows a warning block when there are breaking changes', () => {
    const report = makeReport({
      summary: {
        totalChanges: 1,
        breakingChanges: 1,
        addedEndpoints: 0,
        removedEndpoints: 1,
        modifiedEndpoints: 0,
        addedSchemas: 0,
        removedSchemas: 0,
        modifiedSchemas: 0,
      },
      changes: [
        {
          type: 'removed',
          severity: 'breaking',
          category: 'endpoint',
          path: '/users',
          method: 'GET',
          description: '[Users] Endpoint removed: List users',
          before: undefined,
          after: undefined,
          frontendImpact: '⚠️ Remove all calls to this endpoint from your codebase.',
        },
      ],
    });

    const md = generateMarkdownReport(report, makeConfig('./history'));

    expect(md).toContain('WARNING');
    expect(md).toContain('1 breaking change');
    expect(md).toContain('🔴');
  });

  it('does NOT show warning when there are 0 breaking changes', () => {
    const report = makeReport({
      summary: {
        totalChanges: 1,
        breakingChanges: 0,
        addedEndpoints: 1,
        removedEndpoints: 0,
        modifiedEndpoints: 0,
        addedSchemas: 0,
        removedSchemas: 0,
        modifiedSchemas: 0,
      },
      changes: [
        {
          type: 'added',
          severity: 'non-breaking',
          category: 'endpoint',
          path: '/products',
          method: 'GET',
          description: '[Products] Endpoint added: List products',
          before: undefined,
          after: { summary: 'List products' },
          frontendImpact: 'New endpoint available.',
        },
      ],
    });

    const md = generateMarkdownReport(report, makeConfig('./history'));
    expect(md).not.toContain('WARNING');
  });
});

// ─── generateMarkdownReport — change sections ─────────────────────────────────

describe('generateMarkdownReport — change sections', () => {
  it('renders endpoint section with method and path', () => {
    const report = makeReport({
      summary: { totalChanges: 1, breakingChanges: 0, addedEndpoints: 1, removedEndpoints: 0, modifiedEndpoints: 0, addedSchemas: 0, removedSchemas: 0, modifiedSchemas: 0 },
      changes: [
        {
          type: 'added',
          severity: 'non-breaking',
          category: 'endpoint',
          path: '/orders',
          method: 'POST',
          description: '[Orders] Endpoint added: Create order',
          before: undefined,
          after: { summary: 'Create order' },
          frontendImpact: 'New endpoint.',
        },
      ],
    });

    const md = generateMarkdownReport(report, makeConfig('./history'));
    expect(md).toContain('POST');
    expect(md).toContain('/orders');
    expect(md).toContain('Endpoint Changes');
  });

  it('renders schema section', () => {
    const report = makeReport({
      summary: { totalChanges: 1, breakingChanges: 1, addedEndpoints: 0, removedEndpoints: 0, modifiedEndpoints: 0, addedSchemas: 0, removedSchemas: 1, modifiedSchemas: 0 },
      changes: [
        {
          type: 'removed',
          severity: 'breaking',
          category: 'schema',
          path: '#/components/schemas/LegacyDto',
          description: 'Schema "LegacyDto" removed',
          before: { type: 'object' },
          after: undefined,
          frontendImpact: '⚠️ Remove references to "LegacyDto" type.',
        },
      ],
    });

    const md = generateMarkdownReport(report, makeConfig('./history'));
    expect(md).toContain('Schema Changes');
    expect(md).toContain('LegacyDto');
  });

  it('renders before/after details block', () => {
    const report = makeReport({
      summary: { totalChanges: 1, breakingChanges: 0, addedEndpoints: 0, removedEndpoints: 0, modifiedEndpoints: 0, addedSchemas: 1, removedSchemas: 0, modifiedSchemas: 0 },
      changes: [
        {
          type: 'added',
          severity: 'informational',
          category: 'schema',
          path: '#/components/schemas/NewDto',
          description: 'Schema "NewDto" added',
          before: undefined,
          after: { type: 'object', properties: { id: { type: 'string' } } },
          frontendImpact: 'New type available.',
        },
      ],
    });

    const md = generateMarkdownReport(report, makeConfig('./history'));
    expect(md).toContain('<details>');
    expect(md).toContain('Before / After');
    expect(md).toContain('"type": "object"');
  });
});

// ─── saveReport ───────────────────────────────────────────────────────────────

describe('saveReport', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the history directory if it does not exist', () => {
    const historyDir = path.join(tmpDir, 'docs', 'history');
    const config = makeConfig(historyDir);
    const report = makeReport();

    saveReport('# Test', report, config);

    expect(fs.existsSync(historyDir)).toBe(true);
  });

  it('writes a versioned diff file', () => {
    const historyDir = path.join(tmpDir, 'docs', 'history');
    const config = makeConfig(historyDir);
    const report = makeReport();

    saveReport('# Test Report', report, config);

    const diffFile = path.join(historyDir, 'diff-v1-to-v2.md');
    expect(fs.existsSync(diffFile)).toBe(true);
    expect(fs.readFileSync(diffFile, 'utf-8')).toBe('# Test Report');
  });

  it('always writes diff-latest.md', () => {
    const historyDir = path.join(tmpDir, 'docs', 'history');
    const config = makeConfig(historyDir);

    saveReport('# Latest', makeReport(), config);

    const latestFile = path.join(historyDir, 'diff-latest.md');
    expect(fs.existsSync(latestFile)).toBe(true);
  });

  it('creates INDEX.md with a new entry', () => {
    const historyDir = path.join(tmpDir, 'docs', 'history');
    const config = makeConfig(historyDir);

    saveReport('# Test', makeReport(), config);

    const indexFile = path.join(historyDir, 'INDEX.md');
    expect(fs.existsSync(indexFile)).toBe(true);

    const content = fs.readFileSync(indexFile, 'utf-8');
    expect(content).toContain('diff-v1-to-v2.md');
    expect(content).toContain('ArchGuard History Index');
  });

  it('returns the correct filepath', () => {
    const historyDir = path.join(tmpDir, 'docs', 'history');
    const config = makeConfig(historyDir);

    const result = saveReport('# Test', makeReport(), config);

    expect(result).toBe(path.join(historyDir, 'diff-v1-to-v2.md'));
  });
});
