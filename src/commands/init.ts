import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { ArchGuardConfig } from '../types/index';

export async function runInit(options: { force?: boolean } = {}): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'archguard.config.json');

  logger.title('ArchGuard Init');

  if (fs.existsSync(configPath) && !options.force) {
    logger.warn('archguard.config.json already exists. Use --force to overwrite.');
    return;
  }

  const config: ArchGuardConfig = {
    projectName: path.basename(cwd),
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

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  logger.success('Created archguard.config.json');

  const dirs = [
    path.join(cwd, '.archguard'),
    path.join(cwd, 'docs', 'architecture', 'history'),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.gitkeep'), '');
    logger.success(`Created ${path.relative(cwd, dir)}/`);
  }

  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('# ArchGuard')) {
      fs.appendFileSync(
        gitignorePath,
        '\n# ArchGuard\n# Uncomment to ignore snapshots:\n# .archguard/\n'
      );
      logger.success('Updated .gitignore with ArchGuard entries');
    }
  }

  console.log();
  logger.success('ArchGuard initialized successfully!');
  logger.dim('Next steps:');
  logger.dim('  1. Edit archguard.config.json with your project settings');
  logger.dim('  2. Start your NestJS app with Swagger enabled');
  logger.dim('  3. Run: npx archguard snapshot');
  logger.dim('  4. Make API changes, then run: npx archguard diff');
  console.log();
}
