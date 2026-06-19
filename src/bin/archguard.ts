#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from '../commands/init';
import { runSnapshot } from '../commands/snapshot';
import { runDiff } from '../commands/diff';
import { runHistory } from '../commands/history';

const program = new Command();

program
  .name('archguard')
  .description('🛡 Contract & Architecture Evolution Manager for NestJS')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize ArchGuard in the current project')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    await runInit(options);
  });

program
  .command('snapshot')
  .description('Capture a snapshot of the current OpenAPI/Swagger contract')
  .option('-u, --url <url>', 'Swagger JSON endpoint URL (overrides config)')
  .option('-c, --config <path>', 'Path to archguard.config.json')
  .action(async (options) => {
    await runSnapshot(options);
  });

program
  .command('diff')
  .description('Compare current API state with the last snapshot and generate a diff report')
  .option('-u, --url <url>', 'Swagger JSON endpoint URL (overrides config)')
  .option('--from <snapshot>', 'Snapshot file to compare from (default: latest)')
  .option('-o, --output <path>', 'Custom output path for the report')
  .option('--no-commit', 'Disable git auto-commit for this run')
  .action(async (options) => {
    await runDiff(options);
  });

program
  .command('history')
  .description('List all snapshots and diff reports')
  .option('--snapshots', 'Show only snapshots')
  .option('--reports', 'Show only reports')
  .action(async (options) => {
    await runHistory(options);
  });

program.parse(process.argv);
