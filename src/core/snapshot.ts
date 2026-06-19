import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { ArchGuardConfig, OpenApiSnapshot, OpenApiSpec } from '../types/index';
import { resolveDir } from '../utils/config';
import { logger } from '../utils/logger';

export async function captureSnapshot(config: ArchGuardConfig): Promise<OpenApiSnapshot> {
  const spec = await fetchOpenApiSpec(config);
  const now = new Date();
  const version = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const snapshot: OpenApiSnapshot = {
    version,
    capturedAt: now.toISOString(),
    projectName: config.projectName,
    spec,
  };

  return snapshot;
}

async function fetchOpenApiSpec(config: ArchGuardConfig): Promise<OpenApiSpec> {
  if (config.swaggerUrl) {
    try {
      logger.info(`Fetching OpenAPI spec from ${config.swaggerUrl}`);
      return await fetchFromUrl(config.swaggerUrl);
    } catch (err) {
      logger.warn(`Could not fetch from URL: ${(err as Error).message}`);
      logger.info('Falling back to file-based discovery...');
    }
  }

  return discoverFromFileSystem(config);
}

function fetchFromUrl(url: string): Promise<OpenApiSpec> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as OpenApiSpec);
        } catch {
          reject(new Error('Invalid JSON response from Swagger endpoint'));
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out after 10 seconds'));
    });
  });
}

function discoverFromFileSystem(config: ArchGuardConfig): OpenApiSpec {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'swagger.json'),
    path.join(cwd, 'openapi.json'),
    path.join(cwd, 'api-spec.json'),
    path.join(cwd, 'docs', 'swagger.json'),
    path.join(cwd, 'docs', 'openapi.json'),
    path.join(cwd, 'public', 'swagger.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      logger.info(`Found spec file at ${candidate}`);
      const raw = fs.readFileSync(candidate, 'utf-8');
      return JSON.parse(raw) as OpenApiSpec;
    }
  }

  logger.warn('No OpenAPI spec found. Creating placeholder snapshot.');
  logger.dim('Run your NestJS app and ensure Swagger is enabled, or set swaggerUrl in archguard.config.json');

  return {
    openapi: '3.0.0',
    info: {
      title: config.projectName,
      version: '0.0.1',
      description: 'Auto-captured by ArchGuard',
    },
    paths: {},
    components: { schemas: {} },
  };
}

export function saveSnapshot(snapshot: OpenApiSnapshot, config: ArchGuardConfig): string {
  const snapshotDir = resolveDir(config.snapshotPath);
  fs.mkdirSync(snapshotDir, { recursive: true });

  const filename = `snapshot-${snapshot.version}.json`;
  const filepath = path.join(snapshotDir, filename);
  const latestPath = path.join(snapshotDir, 'snapshot-latest.json');

  fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(latestPath, JSON.stringify(snapshot, null, 2));

  return filepath;
}

export function loadLatestSnapshot(config: ArchGuardConfig): OpenApiSnapshot | null {
  const snapshotDir = resolveDir(config.snapshotPath);
  const latestPath = path.join(snapshotDir, 'snapshot-latest.json');

  if (!fs.existsSync(latestPath)) {
    return null;
  }

  const raw = fs.readFileSync(latestPath, 'utf-8');
  return JSON.parse(raw) as OpenApiSnapshot;
}

export function listSnapshots(config: ArchGuardConfig): string[] {
  const snapshotDir = resolveDir(config.snapshotPath);

  if (!fs.existsSync(snapshotDir)) {
    return [];
  }

  return fs
    .readdirSync(snapshotDir)
    .filter((f) => f.startsWith('snapshot-') && f !== 'snapshot-latest.json')
    .sort()
    .reverse();
}
