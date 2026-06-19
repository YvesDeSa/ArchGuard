import ora from 'ora';
import { loadConfig } from '../utils/config';
import { captureSnapshot, loadLatestSnapshot, saveSnapshot } from '../core/snapshot';
import { generateDiff } from '../core/differ';
import { generateMarkdownReport, saveReport } from '../core/reporter';
import { commitChanges } from '../core/git-integration';
import { logger } from '../utils/logger';
import { DiffReport } from '../types/index';

export async function runDiff(
  options: { url?: string; from?: string; output?: string; noCommit?: boolean } = {}
): Promise<void> {
  logger.title('ArchGuard Diff');

  const config = loadConfig();

  if (options.url) {
    config.swaggerUrl = options.url;
  }

  if (options.noCommit) {
    config.git.autoCommit = false;
  }

  const spinner = ora('Loading previous snapshot...').start();
  const previousSnapshot = loadLatestSnapshot(config);

  if (!previousSnapshot) {
    spinner.fail('No previous snapshot found');
    logger.warn('Run `archguard snapshot` first to capture a baseline.');
    process.exit(1);
  }

  spinner.text = 'Capturing current API state...';
  const currentSnapshot = await captureSnapshot(config);
  spinner.succeed('Current snapshot captured');

  const diffSpinner = ora('Analyzing differences...').start();
  const report = generateDiff(previousSnapshot, currentSnapshot);
  diffSpinner.succeed(`Analysis complete — ${report.summary.totalChanges} change(s) detected`);

  printDiffSummary(report);

  if (report.summary.totalChanges === 0) {
    logger.success('No changes detected. API contract is identical.');
    return;
  }

  const saveSpinner = ora('Saving diff report...').start();
  const markdown = generateMarkdownReport(report, config);
  const reportPath = saveReport(markdown, report, config);
  saveSnapshot(currentSnapshot, config);
  saveSpinner.succeed(`Report saved: ${reportPath}`);

  if (config.git.autoCommit) {
    const gitSpinner = ora('Committing to git...').start();
    await commitChanges(config, [reportPath]);
    gitSpinner.succeed('Committed to git');
  }

  logger.success('Diff completed! Check the report for details.');
  logger.dim(`Report: ${reportPath}`);
}

function printDiffSummary(report: DiffReport): void {
  const s = report.summary;
  console.log();
  logger.divider();
  console.log(`  📊 Changes: ${s.totalChanges} | 🔴 Breaking: ${s.breakingChanges}`);
  console.log(`  ➕ Added: ${s.addedEndpoints} endpoints | ➖ Removed: ${s.removedEndpoints} | 🔄 Modified: ${s.modifiedEndpoints}`);
  console.log(`  📐 Schemas: +${s.addedSchemas} ~${s.modifiedSchemas} -${s.removedSchemas}`);
  logger.divider();
  console.log();
}
