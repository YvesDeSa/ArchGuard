import simpleGit from 'simple-git';
import { ArchGuardConfig } from '../types/index';
import { logger } from '../utils/logger';
import { resolveDir } from '../utils/config';

export async function commitChanges(
  config: ArchGuardConfig,
  filePaths: string[]
): Promise<void> {
  if (!config.git.autoCommit) {
    logger.dim('Git auto-commit is disabled. Skipping...');
    return;
  }

  const cwd = process.cwd();
  const git = simpleGit(cwd);

  try {
    const status = await git.status();
    if (!status.isClean()) {
      logger.info('Auto-committing architecture history...');

      const historyDir = resolveDir(config.historyPath);
      const snapshotDir = resolveDir(config.snapshotPath);

      await git.add(historyDir);
      await git.add(snapshotDir);

      for (const fp of filePaths) {
        if (fp) await git.add(fp);
      }

      await git.commit(config.git.commitMessage);
      logger.success('Changes committed to git repository.');
    } else {
      logger.dim('No changes to commit.');
    }
  } catch (err) {
    logger.warn(`Git commit failed: ${(err as Error).message}`);
    logger.dim('Ensure you are inside a git repository and have commit permissions.');
  }
}

export async function isGitRepo(cwd: string = process.cwd()): Promise<boolean> {
  try {
    const git = simpleGit(cwd);
    await git.status();
    return true;
  } catch {
    return false;
  }
}
