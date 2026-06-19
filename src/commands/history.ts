import * as fs from 'fs';
import { loadConfig, resolveDir } from '../utils/config';
import { listSnapshots } from '../core/snapshot';
import { logger } from '../utils/logger';

export async function runHistory(
  options: { snapshots?: boolean; reports?: boolean } = {}
): Promise<void> {
  logger.title('ArchGuard History');

  const config = loadConfig();
  const showAll = !options.snapshots && !options.reports;

  if (showAll || options.snapshots) {
    const snapshots = listSnapshots(config);
    console.log(`\n📸 Snapshots (${snapshots.length}):`);
    if (snapshots.length === 0) {
      logger.dim('  No snapshots yet. Run: archguard snapshot');
    } else {
      snapshots.forEach((s, i) => {
        const prefix = i === 0 ? '  → (latest)' : '  ';
        logger.dim(`${prefix} ${s}`);
      });
    }
  }

  if (showAll || options.reports) {
    const historyDir = resolveDir(config.historyPath);
    const reports = fs.existsSync(historyDir)
      ? fs.readdirSync(historyDir).filter((f) => f.startsWith('diff-') && f.endsWith('.md'))
      : [];

    console.log(`\n📄 Diff Reports (${reports.length}):`);
    if (reports.length === 0) {
      logger.dim('  No reports yet. Run: archguard diff');
    } else {
      reports
        .sort()
        .reverse()
        .forEach((r, i) => {
          const prefix = i === 0 ? '  → (latest)' : '  ';
          logger.dim(`${prefix} ${r}`);
        });
    }
  }

  console.log();
}
