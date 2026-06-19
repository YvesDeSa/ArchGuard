# 🛡 ArchGuard

<div align="center">

**Contract & Architecture Evolution Manager for NestJS**

*Automated API diffing, breaking-change detection, and living documentation — built for teams that move fast without breaking things.*

[![npm version](https://img.shields.io/npm/v/@archguard/cli?color=%230070f3&style=flat-square)](https://www.npmjs.com/package/@archguard/cli)
[![license](https://img.shields.io/npm/l/@archguard/cli?color=%2322c55e&style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/@archguard/cli?color=%23f59e0b&style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 📚 Table of Contents

1. [Features](#-features)
2. [Installation](#-installation)
3. [Quick Start](#-quick-start)
4. [Configuration](#️-configuration)
5. [CLI Commands](#-cli-commands)
6. [CI/CD Integration](#-cicd-integration)
7. [Roadmap](#-roadmap)
8. [Contributing](#-contributing)
9. [License](#-license)

---

## ✨ Features

- 🔍 **Automatic API Snapshotting** — Captures your OpenAPI/Swagger spec at any point in time
- 🔴 **Breaking-Change Detection** — Immediately flags removed endpoints, deleted required fields, and changed parameter types
- 🟡 **Non-Breaking Change Tracking** — Tracks added endpoints, optional parameters, and response expansions
- 📄 **Markdown Diff Reports** — Beautiful, readable reports committed directly into your git history
- 📚 **Living Architecture Index** — An auto-maintained `INDEX.md` with every diff ever generated
- 🤝 **NestJS-First** — Designed for the NestJS + Swagger ecosystem; works with any OpenAPI 3.x spec
- 🤖 **GitHub Actions Integration** — Posts diff reports as PR comments and blocks merges on breaking changes
- 🔗 **Git Auto-Commit** — Optionally auto-commits snapshots and reports so your architecture history is always versioned
- 📦 **Library Mode** — Use ArchGuard programmatically in your own scripts or tooling

---

## 📦 Installation

### Global (recommended for CLI use)

```bash
npm install -g @archguard/cli
```

### Local (per-project)

```bash
npm install --save-dev @archguard/cli
```

### Use without installing (npx)

```bash
npx @archguard/cli init
```

---

## 🚀 Quick Start

**Three commands to get started:**

```bash
# 1. Initialize ArchGuard in your project
archguard init

# 2. Capture a baseline snapshot (with your NestJS app running)
archguard snapshot

# 3. After making API changes, generate a diff report
archguard diff
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

---

## ⚙️ Configuration

ArchGuard is configured via `archguard.config.json` in your project root (created by `archguard init`).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectName` | `string` | `"my-api"` | Display name for your project |
| `historyPath` | `string` | `"./docs/architecture/history"` | Directory where diff reports are stored |
| `snapshotPath` | `string` | `"./.archguard"` | Directory where snapshots are stored |
| `swaggerUrl` | `string` | `"http://localhost:3000/api-json"` | URL to fetch the OpenAPI JSON spec |
| `swaggerEntryPoint` | `string` | `"./src/main.ts"` | *(Future)* Path to NestJS entry for static extraction |
| `notify.breakingChangesOnly` | `boolean` | `false` | When `true`, only emit warnings for breaking changes |
| `git.autoCommit` | `boolean` | `false` | Automatically commit snapshots and reports |
| `git.commitMessage` | `string` | `"chore(docs): update architecture history [skip ci]"` | Commit message template |

**Example `archguard.config.json`:**

```json
{
  "projectName": "payments-api",
  "historyPath": "./docs/architecture/history",
  "snapshotPath": "./.archguard",
  "swaggerUrl": "http://localhost:3000/api-json",
  "notify": {
    "breakingChangesOnly": true
  },
  "git": {
    "autoCommit": true,
    "commitMessage": "chore(docs): update architecture history [skip ci]"
  }
}
```

---

## 💻 CLI Commands

| Command | Description | Key Options |
|---------|-------------|-------------|
| `archguard init` | Initialize ArchGuard in the current directory | `--force` — overwrite existing config |
| `archguard snapshot` | Capture the current OpenAPI spec as a snapshot | `--url <url>` — override the Swagger URL |
| `archguard diff` | Compare the latest snapshot with the current spec | `--url`, `--no-commit` |
| `archguard history` | List all stored snapshots and diff reports | `--snapshots`, `--reports` |

### `archguard init`

```bash
archguard init [--force]
```

Creates:
- `archguard.config.json`
- `.archguard/` (snapshot storage)
- `docs/architecture/history/` (report storage)
- Updates `.gitignore` with ArchGuard entries

### `archguard snapshot`

```bash
archguard snapshot [--url http://localhost:3000/api-json]
```

Fetches your OpenAPI spec and saves it as a timestamped JSON snapshot. Always overwrites `snapshot-latest.json` for diff comparison.

### `archguard diff`

```bash
archguard diff [--url <url>] [--no-commit]
```

1. Loads `snapshot-latest.json` as the baseline
2. Fetches the current spec
3. Runs the diff engine (endpoints + schemas + parameters)
4. Generates a Markdown report with before/after details
5. Saves the report and updates `INDEX.md`
6. Optionally auto-commits to git

### `archguard history`

```bash
archguard history [--snapshots] [--reports]
```

Lists all snapshots in `.archguard/` and all diff reports in `docs/architecture/history/`.

---

## 🤖 CI/CD Integration

### GitHub Actions

Add the workflow file to your repository at `.github/workflows/archguard.yml`:

```yaml
name: ArchGuard API Contract Check

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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

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
          key: archguard-snapshot-${{ github.base_ref }}

      - name: Run API diff (PRs only)
        if: github.event_name == 'pull_request'
        run: npx @archguard/cli diff --no-commit

      - name: Fail on breaking changes
        run: |
          if grep -q "Breaking Changes | \*\*[1-9]" docs/architecture/history/diff-latest.md; then
            echo "🔴 Breaking changes detected!"
            exit 1
          fi
```

**What it does:**
- 📸 Saves snapshots on every `main` push (cached between runs)
- 🔍 Runs a full diff on every Pull Request
- 💬 Posts the Markdown report as a PR comment (auto-updates on re-push)
- 🚫 **Blocks the merge** if breaking changes are detected

---

## 🗺 Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| **Phase 1** | Core CLI (init, snapshot, diff, history) | ✅ Complete |
| **Phase 2** | GitHub Actions CI/CD integration + PR comments | ✅ Complete |
| **Phase 3** | Static spec extraction from NestJS decorators (no running server needed) | 🔨 In Progress |
| **Phase 4** | Frontend SDK type generation from diff (TypeScript interfaces auto-updated) | 📋 Planned |
| **Phase 5** | Web dashboard — visual architecture timeline with searchable history | 📋 Planned |

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/your-name/archguard-cli.git`
3. **Install** dependencies: `npm install`
4. **Create** a feature branch: `git checkout -b feat/my-feature`
5. **Develop** with live TypeScript: `npm run dev`
6. **Test** your changes: `npm test`
7. **Build**: `npm run build`
8. **Submit** a Pull Request

### Development Setup

```bash
# Clone the repo
git clone https://github.com/archguard/cli.git
cd cli

# Install dependencies
npm install

# Run the CLI locally (ts-node, no build needed)
npm run dev -- init
npm run dev -- snapshot
npm run dev -- diff

# Build the TypeScript
npm run build
```

### Project Structure

```
src/
├── bin/
│   └── archguard.ts       # CLI entry point (Commander)
├── commands/
│   ├── init.ts            # archguard init
│   ├── snapshot.ts        # archguard snapshot
│   ├── diff.ts            # archguard diff
│   └── history.ts         # archguard history
├── core/
│   ├── snapshot.ts        # Snapshot capture & persistence
│   ├── differ.ts          # OpenAPI diff engine
│   ├── reporter.ts        # Markdown report generator
│   └── git-integration.ts # simple-git auto-commit
├── utils/
│   ├── config.ts          # Config loading & path resolution
│   └── logger.ts          # Chalk-powered logger
├── types/
│   └── index.ts           # All TypeScript interfaces
└── index.ts               # Public library API
```

---

## 📄 License

MIT © [ArchGuard Contributors](https://github.com/archguard)

---

<div align="center">

Made with ❤️ for the NestJS community

*If ArchGuard saved you from a breaking change, give it a ⭐*

</div>
