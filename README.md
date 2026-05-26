# Adobe Stock Auto

Pixelbuddha automation for Adobe Stock product batches. The repo contains the current workflow scripts plus an installable Codex skill that documents the fresh-machine setup, Dropbox fetch, final listing preparation, preview generation, metadata/CSV creation, final naming, packaging, and reporting.

## Codex Skill

Installable Codex skill:

```text
skills/pixelbuddha-adobe-stock-automation/
```

The skill is the best entry point for a freshly installed Codex employee environment. It verifies tools, explains credentials, and gives the agent the exact processing rules.

## Local Setup

Check required tools:

```sh
node --version
python3 --version
git --version
rg --version
python3 -c "import PIL; print(PIL.__version__)"
```

Known-good environment:

- Node.js 22
- Python 3.12
- Pillow 12
- Git and ripgrep

If Pillow is missing:

```sh
python3 -m pip install --user Pillow
```

## Credentials

Copy `.env.example` to `.env` and fill in Dropbox credentials locally. Never commit `.env`.

Required Dropbox scopes:

```text
files.metadata.read
files.content.read
sharing.read
sharing.write
```

## Workflow

Validate Dropbox setup:

```sh
node scripts/dropbox-products.mjs step1 --dry-run
```

Fetch today's Adobe-auto batch:

```sh
node scripts/dropbox-products.mjs step1
```

Fetch a specific date:

```sh
node scripts/dropbox-products.mjs step1 --date 2026-05-18
node scripts/dropbox-products.mjs step1 --date 180526
```

Build Preview1 grids after final listing folders exist:

```sh
python3 scripts/build-preview-listings.py BatchDDMMYY --report BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json
```

Do not ZIP listings immediately after preview generation. Final portal-facing titles and filenames are determined during Step 4 metadata work; Step 4 must also align listing folder names and PSDT names. Final ZIP packaging happens after that mapping is approved.

Package finalized listings:

```sh
python3 scripts/zip-final-listings.py BatchDDMMYY --report BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json
```

## Documentation

Step 2 and Step 3 processing notes live in:

```text
docs/STEP2.md
```

The consolidated corporate skill documentation and authoritative Step 4/reporting references live in:

```text
skills/pixelbuddha-adobe-stock-automation/SKILL.md
skills/pixelbuddha-adobe-stock-automation/references/
```

## Generated Files

Batch folders, production assets, ZIPs, reports, local logs, and credentials are intentionally ignored by git.
