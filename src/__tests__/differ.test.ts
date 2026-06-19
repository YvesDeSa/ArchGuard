import { generateDiff } from '../core/differ';
import { OpenApiSnapshot } from '../types/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSnapshot(
  paths: OpenApiSnapshot['spec']['paths'] = {},
  schemas: Record<string, object> = {},
  version = '2024-01-01T00-00-00'
): OpenApiSnapshot {
  return {
    version,
    capturedAt: new Date().toISOString(),
    projectName: 'test-api',
    spec: {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths,
      components: { schemas: schemas as any },
    },
  };
}

// ─── generateDiff: no changes ─────────────────────────────────────────────────

describe('generateDiff — no changes', () => {
  it('returns zero changes when snapshots are identical', () => {
    const snap = makeSnapshot({
      '/users': { get: { summary: 'List users', tags: ['Users'], responses: { '200': { description: 'OK' } } } },
    });

    const report = generateDiff(snap, snap);

    expect(report.summary.totalChanges).toBe(0);
    expect(report.summary.breakingChanges).toBe(0);
    expect(report.changes).toHaveLength(0);
  });
});

// ─── generateDiff: added endpoints ───────────────────────────────────────────

describe('generateDiff — added endpoints', () => {
  it('detects a new route as non-breaking', () => {
    const from = makeSnapshot({});
    const to = makeSnapshot({
      '/products': {
        get: { summary: 'List products', tags: ['Products'], responses: { '200': { description: 'OK' } } },
      },
    });

    const report = generateDiff(from, to);

    expect(report.summary.addedEndpoints).toBe(1);
    expect(report.summary.breakingChanges).toBe(0);

    const change = report.changes[0];
    expect(change.type).toBe('added');
    expect(change.severity).toBe('non-breaking');
    expect(change.category).toBe('endpoint');
    expect(change.path).toBe('/products');
    expect(change.method).toBe('GET');
  });

  it('detects multiple methods on a new route individually', () => {
    const from = makeSnapshot({});
    const to = makeSnapshot({
      '/items': {
        get: { summary: 'List', responses: {} },
        post: { summary: 'Create', responses: {} },
      },
    });

    const report = generateDiff(from, to);
    expect(report.summary.addedEndpoints).toBe(2);
  });
});

// ─── generateDiff: removed endpoints ─────────────────────────────────────────

describe('generateDiff — removed endpoints', () => {
  it('marks a removed route as breaking', () => {
    const from = makeSnapshot({
      '/legacy': {
        delete: { summary: 'Delete all', tags: ['Legacy'], responses: { '204': { description: 'No content' } } },
      },
    });
    const to = makeSnapshot({});

    const report = generateDiff(from, to);

    expect(report.summary.removedEndpoints).toBe(1);
    expect(report.summary.breakingChanges).toBe(1);

    const change = report.changes[0];
    expect(change.type).toBe('removed');
    expect(change.severity).toBe('breaking');
    expect(change.method).toBe('DELETE');
    expect(change.frontendImpact).toMatch(/Remove all calls/);
  });
});

// ─── generateDiff: modified endpoints ────────────────────────────────────────

describe('generateDiff — modified endpoints', () => {
  it('detects a summary change as informational', () => {
    const from = makeSnapshot({
      '/users': { get: { summary: 'Old summary', responses: {} } },
    });
    const to = makeSnapshot({
      '/users': { get: { summary: 'New summary', responses: {} } },
    });

    const report = generateDiff(from, to);

    const change = report.changes.find(
      (c) => c.category === 'endpoint' && c.severity === 'informational'
    );
    expect(change).toBeDefined();
    expect(change!.description).toContain('Old summary');
    expect(change!.description).toContain('New summary');
  });

  it('detects endpoint deprecation as non-breaking', () => {
    const from = makeSnapshot({
      '/v1/users': { get: { summary: 'Get users', deprecated: false, responses: {} } },
    });
    const to = makeSnapshot({
      '/v1/users': { get: { summary: 'Get users', deprecated: true, responses: {} } },
    });

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.description === 'Endpoint deprecated');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('non-breaking');
    expect(change!.frontendImpact).toMatch(/Plan to remove/);
  });

  it('detects response schema change as non-breaking', () => {
    const from = makeSnapshot({
      '/users': {
        get: {
          summary: 'Get users',
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array' } } } } },
        },
      },
    });
    const to = makeSnapshot({
      '/users': {
        get: {
          summary: 'Get users',
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
      },
    });

    const report = generateDiff(from, to);
    const change = report.changes.find((c) => c.category === 'response');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('non-breaking');
  });
});

// ─── generateDiff: parameter changes ─────────────────────────────────────────

describe('generateDiff — parameter changes', () => {
  it('marks a new REQUIRED query parameter as breaking', () => {
    const from = makeSnapshot({
      '/search': { get: { summary: 'Search', parameters: [], responses: {} } },
    });
    const to = makeSnapshot({
      '/search': {
        get: {
          summary: 'Search',
          parameters: [{ name: 'q', in: 'query', required: true }],
          responses: {},
        },
      },
    });

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'parameter' && c.type === 'added');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('breaking');
    expect(change!.description).toContain('REQUIRED');
    expect(change!.frontendImpact).toMatch(/Must now include/);
  });

  it('marks a new OPTIONAL query parameter as non-breaking', () => {
    const from = makeSnapshot({
      '/users': { get: { summary: 'List', parameters: [], responses: {} } },
    });
    const to = makeSnapshot({
      '/users': {
        get: {
          summary: 'List',
          parameters: [{ name: 'page', in: 'query', required: false }],
          responses: {},
        },
      },
    });

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'parameter' && c.type === 'added');
    expect(change!.severity).toBe('non-breaking');
    expect(change!.description).toContain('optional');
  });

  it('marks a removed parameter as breaking', () => {
    const from = makeSnapshot({
      '/orders': {
        get: {
          summary: 'Orders',
          parameters: [{ name: 'status', in: 'query', required: false }],
          responses: {},
        },
      },
    });
    const to = makeSnapshot({
      '/orders': { get: { summary: 'Orders', parameters: [], responses: {} } },
    });

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'parameter' && c.type === 'removed');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('breaking');
    expect(change!.frontendImpact).toMatch(/Remove/);
  });

  it('marks a parameter becoming required as breaking', () => {
    const from = makeSnapshot({
      '/items': {
        get: {
          summary: 'Items',
          parameters: [{ name: 'filter', in: 'query', required: false }],
          responses: {},
        },
      },
    });
    const to = makeSnapshot({
      '/items': {
        get: {
          summary: 'Items',
          parameters: [{ name: 'filter', in: 'query', required: true }],
          responses: {},
        },
      },
    });

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'parameter' && c.type === 'modified');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('breaking');
  });
});

// ─── generateDiff: request body changes ──────────────────────────────────────

describe('generateDiff — request body changes', () => {
  it('marks request body removal as breaking', () => {
    const body = {
      required: true,
      content: { 'application/json': { schema: { type: 'object' } } },
    };

    const from = makeSnapshot({
      '/auth/login': { post: { summary: 'Login', requestBody: body, responses: {} } },
    });
    const to = makeSnapshot({
      '/auth/login': { post: { summary: 'Login', responses: {} } },
    });

    const report = generateDiff(from, to);
    const change = report.changes.find((c) => c.category === 'request-body');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('breaking');
  });

  it('marks request body addition as non-breaking', () => {
    const body = {
      required: false,
      content: { 'application/json': { schema: { type: 'object' } } },
    };

    const from = makeSnapshot({
      '/reports': { post: { summary: 'Create report', responses: {} } },
    });
    const to = makeSnapshot({
      '/reports': { post: { summary: 'Create report', requestBody: body, responses: {} } },
    });

    const report = generateDiff(from, to);
    const change = report.changes.find((c) => c.category === 'request-body');
    expect(change!.severity).toBe('non-breaking');
  });
});

// ─── generateDiff: schema changes ────────────────────────────────────────────

describe('generateDiff — schema changes', () => {
  it('detects a new schema as informational', () => {
    const from = makeSnapshot({}, {});
    const to = makeSnapshot(
      {},
      { UserDto: { type: 'object', properties: { id: { type: 'string' } } } }
    );

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'schema' && c.type === 'added');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('informational');
    expect(change!.path).toBe('#/components/schemas/UserDto');
  });

  it('marks a removed schema as breaking', () => {
    const from = makeSnapshot(
      {},
      { LegacyDto: { type: 'object' } }
    );
    const to = makeSnapshot({}, {});

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'schema' && c.type === 'removed');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('breaking');
    expect(change!.frontendImpact).toMatch(/no longer exists/);
  });

  it('marks a schema with new required fields as breaking', () => {
    const from = makeSnapshot(
      {},
      {
        CreateUserDto: {
          type: 'object',
          properties: { name: { type: 'string' }, email: { type: 'string' } },
          required: ['name'],
        },
      }
    );
    const to = makeSnapshot(
      {},
      {
        CreateUserDto: {
          type: 'object',
          properties: { name: { type: 'string' }, email: { type: 'string' } },
          required: ['name', 'email'], // email agora é required
        },
      }
    );

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'schema' && c.type === 'modified');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('breaking');
  });

  it('marks a schema with removed properties as breaking', () => {
    const from = makeSnapshot(
      {},
      {
        ProductDto: {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' }, price: { type: 'number' } },
        },
      }
    );
    const to = makeSnapshot(
      {},
      {
        ProductDto: {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' } }, // price removido
        },
      }
    );

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'schema' && c.type === 'modified');
    expect(change!.severity).toBe('breaking');
  });

  it('marks a schema with only optional field addition as non-breaking', () => {
    const from = makeSnapshot(
      {},
      {
        OrderDto: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      }
    );
    const to = makeSnapshot(
      {},
      {
        OrderDto: {
          type: 'object',
          properties: { id: { type: 'string' }, notes: { type: 'string' } }, // campo opcional adicionado
          required: ['id'],
        },
      }
    );

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'schema' && c.type === 'modified');
    expect(change!.severity).toBe('non-breaking');
  });
});

// ─── generateDiff: API info changes ──────────────────────────────────────────

describe('generateDiff — API info changes', () => {
  it('detects API version bump as informational', () => {
    const from = makeSnapshot({});
    from.spec.info.version = '1.0.0';

    const to = makeSnapshot({});
    to.spec.info.version = '2.0.0';

    const report = generateDiff(from, to);

    const change = report.changes.find((c) => c.category === 'info');
    expect(change).toBeDefined();
    expect(change!.severity).toBe('informational');
    expect(change!.description).toContain('1.0.0');
    expect(change!.description).toContain('2.0.0');
  });
});

// ─── generateDiff: summary counters ──────────────────────────────────────────

describe('generateDiff — summary correctness', () => {
  it('counts all categories correctly in a mixed diff', () => {
    const from = makeSnapshot(
      {
        '/removed': { get: { summary: 'Gone', responses: {} } },
        '/modified': { get: { summary: 'Old', responses: {} } },
      },
      { OldSchema: { type: 'object' } }
    );

    const to = makeSnapshot(
      {
        '/added': { post: { summary: 'New', responses: {} } },
        '/modified': { get: { summary: 'New', responses: {} } },
      },
      { NewSchema: { type: 'object' } }
    );

    const report = generateDiff(from, to);
    const s = report.summary;

    expect(s.addedEndpoints).toBe(1);
    expect(s.removedEndpoints).toBe(1);
    // '/modified' has a summary change (informational, not "modified endpoint" per counter)
    expect(s.addedSchemas).toBe(1);
    expect(s.removedSchemas).toBe(1);
    expect(s.breakingChanges).toBeGreaterThanOrEqual(2); // removed endpoint + removed schema
  });

  it('report metadata is correct', () => {
    const from = { ...makeSnapshot({}), version: 'v1' };
    const to = { ...makeSnapshot({}), version: 'v2' };

    const report = generateDiff(from, to);

    expect(report.fromVersion).toBe('v1');
    expect(report.toVersion).toBe('v2');
    expect(report.fromSnapshot).toBe('snapshot-v1.json');
    expect(report.toSnapshot).toBe('snapshot-v2.json');
    expect(report.projectName).toBe('test-api');
  });
});
