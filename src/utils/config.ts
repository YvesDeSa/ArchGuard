import * as fs from 'fs';
import * as path from 'path';
import { ArchGuardConfig } from '../types/index';

const DEFAULT_CONFIG: ArchGuardConfig = {
  projectName: 'my-api',
  historyPath: './docs/architecture/history',
  snapshotPath: './.archguard',
  swaggerUrl: 'http://localhost:3000/api-json',
  notify: {
    breakingChangesOnly: false,
  },
  git: {
    autoCommit: false,
    commitMessage: 'chore(docs): update architecture history [skip ci]',
  },
};

export function loadConfig(cwd: string = process.cwd()): ArchGuardConfig {
  const configPath = path.join(cwd, 'archguard.config.json');

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(raw) as Partial<ArchGuardConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      notify: { ...DEFAULT_CONFIG.notify, ...userConfig.notify },
      git: { ...DEFAULT_CONFIG.git, ...userConfig.git },
    };
  } catch (err) {
    throw new Error(`Failed to parse archguard.config.json: ${(err as Error).message}`);
  }
}

export function saveConfig(config: ArchGuardConfig, cwd: string = process.cwd()): void {
  const configPath = path.join(cwd, 'archguard.config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function resolveDir(basePath: string, cwd: string = process.cwd()): string {
  if (path.isAbsolute(basePath)) return basePath;
  return path.resolve(cwd, basePath);
}
