import ora from 'ora';
import { loadConfig } from '../utils/config';
import { captureSnapshot, saveSnapshot, listSnapshots } from '../core/snapshot';
import { logger } from '../utils/logger';

export async function runSnapshot(
  options: { url?: string; config?: string } = {}
): Promise<void> {
  logger.title('ArchGuard Snapshot');

  const config = loadConfig();

  if (options.url) {
    config.swaggerUrl = options.url;
  }

  const spinner = ora('Capturing API snapshot...').start();

  try {
    const snapshot = await captureSnapshot(config);
    spinner.succeed(`Snapshot captured: v${snapshot.version}`);

    const filepath = saveSnapshot(snapshot, config);
    logger.success(`Saved to: ${filepath}`);

    const existing = listSnapshots(config);
    logger.dim(`Total snapshots: ${existing.length}`);

    const pathCount = Object.keys(snapshot.spec.paths || {}).length;
    const schemaCount = Object.keys(snapshot.spec.components?.schemas || {}).length;
    logger.info(`Captured ${pathCount} endpoints, ${schemaCount} schemas`);
  } catch (err) {
    spinner.fail('Snapshot failed');
    logger.error((err as Error).message);
    process.exit(1);
  }
}
