<div align="center">

# 🛡 ArchGuard

**Contract & Architecture Evolution Manager for NestJS**

*Automated API diffing, breaking-change detection, and living documentation —  
built for teams that move fast without breaking things.*

[![npm version](https://img.shields.io/npm/v/archguard-cli?color=%230070f3&style=flat-square)](https://www.npmjs.com/package/archguard-cli)
[![npm downloads](https://img.shields.io/npm/dm/archguard-cli?color=%2322c55e&style=flat-square)](https://www.npmjs.com/package/archguard-cli)
[![license](https://img.shields.io/npm/l/archguard-cli?color=%23f59e0b&style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/archguard-cli?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![tests](https://img.shields.io/badge/tests-47%20passing-brightgreen?style=flat-square)](./src/__tests__)

</div>

---

## 📚 Table of Contents

1. [Why ArchGuard?](#-why-archguard)
2. [Features](#-features)
3. [Installation](#-installation)
4. [NestJS Setup](#-nestjs-setup)
5. [Quick Start](#-quick-start)
6. [Configuration](#️-configuration)
7. [CLI Commands](#-cli-commands)
8. [Diff Report Example](#-diff-report-example)
9. [CI/CD Integration](#-cicd-integration)
10. [Programmatic Usage](#-programmatic-usage)
11. [Roadmap](#-roadmap)
12. [Contributing](#-contributing)
13. [License](#-license)

---

## 💡 Why ArchGuard?

| Problem | Without ArchGuard | With ArchGuard |
|---------|-------------------|----------------|
| API contract changes | Discovered by broken Frontend | Caught instantly, before merge |
| Documentation drift | Swagger is always outdated | Auto-generated from live spec |
| Change history | "Who changed this route?" 🤷 | Git-tracked diff reports forever |
| Breaking changes in PR | Found in code review (maybe) | Blocked at CI, flagged automatically |

---

## ✨ Features

- 🔍 **Automatic API Snapshotting** — Captures your OpenAPI/Swagger spec at any point in time
- 🔴 **Breaking-Change Detection** — Flags removed endpoints, deleted required fields, changed parameter types
- 🟡 **Non-Breaking Change Tracking** — Tracks added endpoints, optional parameters, response expansions
- 📄 **Markdown Diff Reports** — Beautiful, readable reports committed directly into your git history
- 📚 **Living Architecture Index** — Auto-maintained `INDEX.md` with every diff ever generated
- 🤝 **NestJS-First** — Designed for the NestJS + `@nestjs/swagger` ecosystem; works with any OpenAPI 3.x spec
- 🤖 **GitHub Actions Integration** — Posts diff reports as PR comments, blocks merges on breaking changes
- 🔗 **Git Auto-Commit** — Optionally auto-commits snapshots and reports so your architecture history is always versioned
- 📦 **Library Mode** — Use ArchGuard programmatically in your own scripts or tooling

---

## 📦 Installation

### As a dev dependency in your NestJS project (recommended)

```bash
npm install --save-dev archguard-cli
```

Then add scripts to your `package.json`:

```json
{
  "scripts": {
    "arch:init":     "archguard init",
    "arch:snapshot": "archguard snapshot",
    "arch:diff":     "archguard diff",
    "arch:history":  "archguard history"
  }
}
```

### Global install (use anywhere)

```bash
npm install -g archguard-cli
```

### Without installing (npx)

```bash
npx archguard-cli init
npx archguard-cli snapshot
npx archguard-cli diff
```

---

## 🏗 NestJS Setup

ArchGuard reads your live OpenAPI spec. Make sure Swagger is enabled in your NestJS app:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('My API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  // ↑ This exposes the JSON spec at: http://localhost:3000/api-json

  await app.listen(3000);
}
bootstrap();
```

> ArchGuard fetches `http://localhost:3000/api-json` by default.  
> You can override this in `archguard.config.json` or via `--url`.

---

## 🚀 Quick Start

```bash
# 1. Initialize ArchGuard in your NestJS project
npx archguard-cli init

# 2. Start your NestJS app
npm run start:dev

# 3. Capture the current API as a baseline snapshot
npx archguard-cli snapshot

# 4. Make changes to your API (add a route, change a DTO, remove a param...)

# 5. Generate a diff report
npx archguard-cli diff
```

**Expected output for `archguard diff`:**

```
🛡  ArchGuard Diff

✔ Current snapshot captured
✔ Analysis complete — 3 change(s) detected

────────────────────────────────────────────────────────────
  📊 Changes: 3 | 🔴 Breaking: 1
  ➕ Added: 1 endpoints | ➖ Removed: 1 | 🔄 Modified: 1
  📐 Schemas: +0 ~1 -0
────────────────────────────────────────────────────────────

✔ Report saved: ./docs/architecture/history/diff-2024-01-15T10-30-00-to-2024-01-15T14-45-00.md
✔ Diff completed! Check the report for details.
```

The generated report appears at `./docs/architecture/history/diff-latest.md` — ready to commit and share with your Frontend team.

---

## ⚙️ Configuration

ArchGuard is configured via `archguard.config.json` in your project root (created automatically by `archguard init`).

```json
{
  "projectName": "payments-api",
  "historyPath": "./docs/architecture/history",
  "snapshotPath": "./.archguard",
  "swaggerUrl": "http://localhost:3000/api-json",
  "notify": {
    "breakingChangesOnly": false
  },
  "git": {
    "autoCommit": true,
    "commitMessage": "chore(docs): update architecture history [skip ci]"
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectName` | `string` | folder name | Display name for your project |
| `historyPath` | `string` | `"./docs/architecture/history"` | Where diff reports are stored |
| `snapshotPath` | `string` | `"./.archguard"` | Where snapshots are stored |
| `swaggerUrl` | `string` | `"http://localhost:3000/api-json"` | URL to fetch the OpenAPI JSON spec |
| `notify.breakingChangesOnly` | `boolean` | `false` | Only flag breaking changes |
| `git.autoCommit` | `boolean` | `false` | Auto-commit snapshots and reports |
| `git.commitMessage` | `string` | `"chore(docs): ..."` | Commit message template |

---

## 💻 CLI Commands

| Command | Description | Options |
|---------|-------------|---------|
| `archguard init` | Initialize ArchGuard in the current directory | `--force` overwrite existing config |
| `archguard snapshot` | Capture the current OpenAPI spec | `--url <url>` override Swagger URL |
| `archguard diff` | Compare latest snapshot with current spec | `--url <url>`, `--no-commit` |
| `archguard history` | List stored snapshots and diff reports | `--snapshots`, `--reports` |

### `archguard init`

Creates:
- `archguard.config.json` — project configuration
- `.archguard/` — snapshot storage (add to `.gitignore` if desired)
- `docs/architecture/history/` — diff report history (commit this!)
- Appends ArchGuard entries to `.gitignore`

### `archguard snapshot`

```bash
archguard snapshot [--url http://localhost:3000/api-json]
```

Fetches your OpenAPI spec and saves a timestamped JSON snapshot. Always writes `snapshot-latest.json` as the baseline for the next diff.

### `archguard diff`

```bash
archguard diff [--url <url>] [--no-commit]
```

1. Loads `snapshot-latest.json` as baseline
2. Fetches the current spec from your running app
3. Runs the diff engine (endpoints + schemas + parameters + responses)
4. Classifies each change as **breaking**, **non-breaking**, or **informational**
5. Generates a Markdown report with Before/After details
6. Updates `INDEX.md` and optionally auto-commits to git

### `archguard history`

```bash
archguard history [--snapshots] [--reports]
```

Lists all snapshots and diff reports with timestamps.

---

## 📋 Diff Report Example

Generated reports look like this:

```markdown
# 🛡 ArchGuard Diff Report

**Project:** payments-api  
**From:** `snapshot-2024-01-14T10-00-00.json`  
**To:** `snapshot-2024-01-15T14-30-00.json`

## 📊 Summary

| Metric | Count |
|--------|-------|
| 🔴 Breaking Changes | **2** |
| Total Changes | 5 |
| ➕ Added Endpoints | 1 |
| ➖ Removed Endpoints | 1 |
| 🔄 Modified Endpoints | 0 |
| Modified Schemas | 2 |

> ⚠️ **WARNING:** 2 breaking change(s) require immediate Frontend attention.

## 🔌 Endpoint Changes

### ➖ 🔴 `DELETE /v1/users/{id}`

**Severity:** BREAKING  
**Change:** [Users] Endpoint removed: Delete user  
**Frontend Impact:** ⚠️ Remove all calls to this endpoint from your codebase.

---

### ➕ 🟢 `POST /v2/users/{id}/deactivate`

**Severity:** NON-BREAKING  
**Change:** [Users] Endpoint added: Deactivate user  
**Frontend Impact:** New endpoint available — implement integration if needed.
```

---

## 🤖 CI/CD Integration

### GitHub Actions

Copy `.github/workflows/archguard.yml` to your NestJS repository:

```yaml
name: 🛡 ArchGuard API Contract Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  api-contract-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start NestJS app
        run: |
          npm run start:prod &
          timeout 60 bash -c 'until curl -sf http://localhost:3000/api-json; do sleep 2; done'

      - name: Restore snapshot cache
        uses: actions/cache@v4
        with:
          path: .archguard/
          key: archguard-snapshot-${{ github.base_ref || github.ref_name }}

      - name: Run ArchGuard diff
        if: github.event_name == 'pull_request'
        run: npx archguard-cli diff --no-commit

      - name: Comment PR with diff
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const file = 'docs/architecture/history/diff-latest.md';
            if (!fs.existsSync(file)) return;
            const body = fs.readFileSync(file, 'utf-8').slice(0, 65000);
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🛡 ArchGuard API Diff\n\n${body}`
            });

      - name: Block merge on breaking changes
        if: github.event_name == 'pull_request'
        run: |
          if grep -q "Breaking Changes | \*\*[1-9]" docs/architecture/history/diff-latest.md 2>/dev/null; then
            echo "🔴 Breaking API changes detected! Fix before merging."
            exit 1
          fi

      - name: Save snapshot on main push
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: npx archguard-cli snapshot
```

---

## 🔧 Programmatic Usage

Use ArchGuard as a library in your own scripts:

```typescript
import {
  captureSnapshot,
  loadLatestSnapshot,
  saveSnapshot,
  generateDiff,
  generateMarkdownReport,
  saveReport,
  loadConfig,
} from 'archguard-cli';

const config = loadConfig(); // reads archguard.config.json

// Capture current state
const current = await captureSnapshot(config);

// Load previous state
const previous = loadLatestSnapshot(config);

if (previous) {
  // Generate diff
  const report = generateDiff(previous, current);

  console.log(`Breaking changes: ${report.summary.breakingChanges}`);

  // Generate and save Markdown report
  const markdown = generateMarkdownReport(report, config);
  saveReport(markdown, report, config);
}

// Save current as new baseline
saveSnapshot(current, config);
```

---

## 🗺 Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| **Phase 1** | Core CLI — init, snapshot, diff, history | ✅ Done |
| **Phase 2** | GitHub Actions CI/CD + PR comments | ✅ Done |
| **Phase 3** | 47 unit tests + Jest coverage | ✅ Done |
| **Phase 4** | Static extraction from NestJS decorators (no running server) | 🔨 In Progress |
| **Phase 5** | Frontend SDK type generation from diff | 📋 Planned |
| **Phase 6** | Web dashboard — visual architecture timeline | 📋 Planned |

---

## 🤝 Contributing

Contributions are welcome!

```bash
# 1. Fork and clone
git clone https://github.com/YvesDeSa/ArchGuard.git
cd ArchGuard

# 2. Install dependencies
npm install

# 3. Run tests
npm test

# 4. Develop with live TypeScript (no build step)
npm run dev -- snapshot --url http://localhost:3000/api-json

# 5. Build
npm run build
```

### Project Structure

```
src/
├── bin/
│   └── archguard.ts       # CLI entry point (Commander.js)
├── commands/
│   ├── init.ts            # archguard init
│   ├── snapshot.ts        # archguard snapshot
│   ├── diff.ts            # archguard diff
│   └── history.ts         # archguard history
├── core/
│   ├── snapshot.ts        # Snapshot capture & persistence
│   ├── differ.ts          # OpenAPI diff engine (breaking change detection)
│   ├── reporter.ts        # Markdown report generator
│   └── git-integration.ts # simple-git auto-commit
├── utils/
│   ├── config.ts          # Config loader & path resolution
│   └── logger.ts          # Chalk-powered logger
├── types/
│   └── index.ts           # All TypeScript interfaces
├── __tests__/
│   ├── differ.test.ts     # 35 diff engine tests
│   ├── snapshot.test.ts   # Snapshot I/O tests
│   └── reporter.test.ts   # Report generation tests
└── index.ts               # Public library API
```

---

## 📄 License

MIT © [Yves De Sá](https://github.com/YvesDeSa)

---

<div align="center">

Made with ❤️ for the NestJS community

**[NPM](https://www.npmjs.com/package/archguard-cli) · [Issues](https://github.com/YvesDeSa/ArchGuard/issues) · [Changelog](./docs/architecture/history/INDEX.md)**

*If ArchGuard saved you from a breaking change, give it a ⭐*

</div>
