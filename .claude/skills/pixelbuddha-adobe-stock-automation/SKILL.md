---
name: pixelbuddha-adobe-stock-automation
description: "End-to-end Pixelbuddha Adobe Stock automation for a fresh employee environment in Codex, Claude Code, or any compatible filesystem/shell AI agent including DeepSeek-powered agents: choose English or Russian, verify local tools, fetch Dropbox Adobe-auto product batches from /Products/auto.json, prepare final PSDT/Thumbnail listing folders, generate Preview1 grids, create metadata CSV rows, determine final portal filenames, package ZIP listings, and maintain canonical batch reports. Use when the user asks to run, install, document, debug, or extend Pixelbuddha Adobe Stock automation."
---

# Pixelbuddha Adobe Stock Automation

Use this skill for Pixelbuddha Adobe Stock batch work. The workflow starts from a clean employee machine, downloads product folders from Dropbox, creates Adobe Stock-ready listing folders, builds preview grids, creates metadata CSV rows, determines final portal filenames, and keeps an auditable batch report. For Step 4 metadata and CSV work, read `references/metadata-csv.md` before generating or editing metadata rows.

## Agent Compatibility

This skill is model-provider agnostic. It does not require OpenAI, Anthropic, Claude, Codex, or DeepSeek APIs. A compatible AI agent only needs:

- Ability to read this `SKILL.md` and the referenced Markdown files.
- Filesystem access to the cloned repository or installed skill folder.
- Shell access for the bundled Python and Node.js scripts.
- Ability to ask the employee before installing software, changing credentials, or making destructive file changes.

Use deterministic scripts for Dropbox fetching, Preview1/Thumbnail generation, and final ZIP packaging. Do not replace those scripts with ad hoc model reasoning. For DeepSeek-powered or other generic agents, load this file as the primary instruction document, then follow the same commands and references. Claude Code and Codex installation paths are convenience options, not workflow requirements.

## Start Gently

At the beginning of a new employee setup or first run, ask one short question before doing anything else:

```text
Would you like to continue in English or Russian?
```

After the user answers, continue in that language unless they switch. Assume the employee may be unfamiliar with terminals, package managers, Git, Python, or Node. Explain each step plainly, keep commands copy-pasteable, and say what success should look like. Do not dump a long checklist all at once; guide the setup in small confirmed steps.

## User-Facing Checkpoints

Use short, concrete status messages. The employee should always know whether a step is read-only, writes files, downloads data, or packages final deliverables.

Recommended messages:

- Before setup checks: `I will check the required tools now. This only reads version information and does not change files.`
- Before installing tools: `This machine is missing [tool]. I need approval before installing it.`
- Before editing `.env`: `Credentials must stay local. I will not ask you to paste secrets into chat.`
- Before Dropbox dry run: `This validates Dropbox access and selected products without downloading files.`
- Before live Dropbox fetch: `This will download the selected product folders into BatchDDMMYY.`
- Before generating previews: `This will create or update Preview1.jpg and Thumbnail.jpg inside final listing folders.`
- Before Step 4 metadata: `This will determine final listing titles, CSV filenames, and metadata rows.`
- Before final packaging: `This will create the final ZIP files that must match the CSV Filename column.`
- On completion: `Finalization passed: metadata CSV, renamed listing folders, titled PSDT files, Preview1.jpg, Thumbnail.jpg, final ZIPs, and the canonical report are aligned.`

## Fresh Environment Setup

Before touching a batch, verify local tools. If the employee is on a fresh machine or any required tool is missing, use `references/environment-setup.md` and walk them through installing the missing pieces for their OS.

```sh
node --version
python3 --version
git --version
rg --version
python3 -c "import PIL; print(PIL.__version__)"
```

Requirements:

- Node.js 18+ with built-in `fetch`; Node 22 is known good.
- Python 3.10+; Python 3.12 is known good.
- Python package `Pillow` for image work in `build-preview-listings.py`.
- Git and ripgrep for repository inspection.
- Dropbox credentials in `.env` or shell environment.

If `Pillow` is missing, install it only after approval if network access or global writes are needed:

```sh
python3 -m pip install --user Pillow
```

If Node, Python, Git, or ripgrep is missing, ask before installing system packages. On macOS, Homebrew installations may be appropriate. On Windows, prefer PowerShell with `winget` when available. Do not assume the package manager exists and do not install silently.

## Script Location

Prefer project-level scripts when present:

```text
scripts/dropbox-products.mjs
scripts/build-preview-listings.py
scripts/zip-final-listings.py
```

This skill also bundles copies under:

```text
skills/pixelbuddha-adobe-stock-automation/scripts/
```

When running inside an employee's cloned automation repo, use the repo scripts so local updates win. If the user only installed the skill and no project scripts exist, run the bundled scripts from the skill folder.

## Environment

Never print Dropbox secrets. Required shared credentials/config:

```text
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
DROPBOX_REFRESH_TOKEN=
DROPBOX_AUTO_JSON_PATH=/Products/auto.json
DROPBOX_MAX_PSD_MB=500
STEP1_LOG_PATH=step1-log.json
```

Optional:

```text
DROPBOX_ACCESS_TOKEN=
DROPBOX_BATCH_ROOT=.
DROPBOX_PRODUCTS_ROOT=/Pixelbuddha/Products
DROPBOX_SELECT_USER=
DROPBOX_PATH_ROOT_NAMESPACE_ID=
DROPBOX_SHARED_LINK_VISIBILITY=
```

Required Dropbox scopes:

```text
files.metadata.read
files.content.read
sharing.read
sharing.write
```

Use `DROPBOX_REFRESH_TOKEN` for normal work. `DROPBOX_ACCESS_TOKEN` is only a temporary fallback.

## Batch Shape

Step 1 creates a local batch folder:

```text
BatchDDMMYY/
  Product folders...
```

Steps 2 and 3 write final listing output under:

```text
BatchDDMMYY/Adobe/
  ListingFolderName/
    Listing Name.PSDT
    Thumbnail.jpg
    Preview1.jpg
  BatchDDMMYY-automation-report.json
```

Do not ZIP listing folders in Step 3. Final ZIP names are decided in Step 4 after metadata titles and CSV `Filename` values are finalized.

Source product folders must stay intact. Copy files into `BatchDDMMYY/Adobe/`; do not move, rewrite, or delete source files.

## Reporting

Use one canonical full-batch report per batch:

```text
BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json
```

The Dropbox destination for synced reports is:

```text
/Pixelbuddha/Products/Adobe Stock Automation
```

Do not create separate step report files in normal operation. If a legacy or temporary step report exists, absorb its useful data into the canonical report, move the old file under `BatchDDMMYY/Adobe/_legacy_reports/`, and reference it in `legacyReportsAbsorbed`.

Canonical top-level report keys:

- `reportVersion`
- `reportType`
- `batch`
- `status`
- `updatedAt`
- `dropboxFolder`
- `paths`
- `summary`
- `stages`
- `artifacts`
- `warnings`
- `errors`
- `legacyReportsAbsorbed`

Canonical `stages` keys:

- `step1FetchDropboxBatch`
- `step2PrepareListingFolders`
- `step3BuildPreview1`
- `step4MetadataCsv`
- `step4ListingAlignment`
- `finalPackaging`
- `validation`
- `uploadSync`

Each process step updates only its own object under `stages`. The top-level `errors` array is only for unresolved actionable failures. The top-level `warnings` array is for non-blocking issues worth auditing later. Detailed per-listing warnings and errors should also remain near the relevant row/result.

For the full schema and required validation checks, use `references/batch-report-format.md`.

## Step 1: Fetch Dropbox Batch

Validate setup without downloading:

```sh
node scripts/dropbox-products.mjs step1 --dry-run
```

Run today's Adobe-auto queue:

```sh
node scripts/dropbox-products.mjs step1
```

Run a specific date:

```sh
node scripts/dropbox-products.mjs step1 --date 2026-05-18
node scripts/dropbox-products.mjs step1 --date 180526
```

Behavior:

- Read `/Products/auto.json` via Dropbox API.
- Select records matching today's local date or explicit `--date`.
- Treat selected records as the Adobe-auto queue.
- Download each product folder into `./BatchDDMMYY`.
- Skip `.psd` files over `DROPBOX_MAX_PSD_MB`.
- Detect standalone AI markers such as `(AI)` or `(A.I.)` in selected Dropbox product folder titles/paths and write the result to each Step 1 log product entry as `aiMarker`.
- Append real-run records to `step1-log.json`; dry runs do not write logs.

Report back selected products, skipped PSDs, final batch folder, and log path. Later steps should consume the local batch unless fresh Dropbox metadata or uploads are explicitly needed.

## Step 2: Prepare Final Listing Folders

Step 2 turns a source `BatchDDMMYY` into final Adobe listing folders. No dedicated Step 2 script is present yet. The agent must perform the file inspection, copying, naming, PPI checks, thumbnail creation, and report updates using the rules below instead of handing the work back to the employee unless a hard ambiguity or source-file error requires a decision.

Global rules:

- Create `BatchDDMMYY/Adobe/` before processing.
- Every final listing folder must contain exactly one `.PSDT` and `Thumbnail.jpg`.
- Check every source PSD used for output is `300 PPI`.
- Normalize Photoshop resolution units before failing a PSD. Some valid `300 PPI` files store raw resolution as `762` with a pixels-per-centimeter unit; treat that as `300 PPI` because `762 / 2.54 = 300`.
- If a source PSD is not `300 PPI`, stop that listing and log an actionable error.
- Final folder names do not contain spaces.
- Final PSDT filenames do contain spaces.
- If output names collide, create a copywriter-style title variation preserving the strongest key phrase.
- Use `.PSDT` extension for final PSD files.

Thumbnail routine:

1. Prefer an image already exactly `2048 x 1424`.
2. If no exact image exists, use `1.jpg` from the active thumbnail/preview source.
3. The fallback `1.jpg` must have `3:2` aspect ratio.
4. Generate `Thumbnail.jpg` by scaling fallback `1.jpg` to `1424px` height and center-cropping left/right to `2048px` width.
5. Do not stretch arbitrary fallback candidates to `2048 x 1424`.
6. If no exact image and no valid `3:2` `1.jpg` exists, stop that listing and log an error.

Scenario detection priority:

1. Scenario 2: product `Adobe` folder contains multiple complete listing folders, each with its own PSD.
2. Scenario 3: horizontal and vertical template PSDs exist while product `Adobe` folders are preview/thumbnail sources.
3. Scenario 1: one target PSD in the product-titled folder.

Ignore helper PSDs in preview-source, texture, cover, and support folders unless the active scenario explicitly uses them.

## Step 2 Scenarios

Scenario 1: single target PSD.

- Applies when there is no usable Adobe listing structure, no product-level `Adobe` folder, an empty `Adobe` folder, or an `Adobe` folder with JPGs only.
- Use the single target PSD in the product-titled folder.
- Thumbnail source priority: product `Adobe` images, then `Preview files/adobe.jpg`, then `Preview files/1.jpg`.

Scenario 2: multiple complete Adobe listing folders.

- Applies when product-level `Adobe` contains multiple inner folders and each inner folder is a complete listing package.
- Treat each inner folder as one final listing.
- Find the PSD and thumbnail source inside that same folder.
- One listing may use the exact source product name; other listings use creative variations.

Scenario 3: horizontal and vertical templates.

- Applies when PSD names include orientation signals like `Horizontal.psd`, `Vertical.psd`, `name_h.psd`, `name_v.psd`, `Portrait.psd`.
- Horizontal/default listing uses the full original product name.
- Vertical listing must include `Vertical` or `Portrait`.
- Match vague preview folders by labels, layout clues, visual content, or existing thumbnail identity.

## Step 3A: Build Preview1

After Step 2 creates final listing folders, generate `Preview1.jpg`:

```sh
python3 scripts/build-preview-listings.py BatchDDMMYY --dry-run
python3 scripts/build-preview-listings.py BatchDDMMYY --report BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json
```

`Preview1.jpg` rules:

- Canvas width: `2048px`.
- Maximum canvas height: `6000px`.
- Background: white.
- Gutter: `10px`.
- JPEG quality: `60`.
- Use numbered JPG files only.
- Ignore `fp.jpg`, `t.jpg`, `thumbnail.jpg`, and `adobe.jpg` for the grid.
- Use no more than 6 numbered images.
- First feature image should stay full-width.
- Keep the first feature image first, then use lightweight image stats to reorder the remaining selected images for adjacent-row contrast and visual rhythm when the first two selected slides are too similar.
- Use predictable overrides only when a known product needs a fixed image order.
- If the grid would exceed `6000px`, remove lower-priority images from the end and log the selection note.

Default grid schemas:

```text
2 images: 1-1
3 images: 1-1-1
4 images: 1-1-1-1
5 images: 1-2-1-1
6 images: 1-2-1-2
```

The script may use `Adobe` preview images, nested `Adobe` variant folders, or `Preview files` fallback. If final thumbnails already exist, it can match variant source folders to final listings by thumbnail digest.

When matching existing final listing folders, compare exact normalized names only. Normalize by removing the leading product code and non-alphanumeric characters, then comparing lowercase keys. Never use suffix matching: `SweatshirtMockup` and `SunsetSkyTShirtMockup` must not match `TshirtMockup`.

## Final Packaging

Final ZIP packaging happens after Step 4 metadata work, not during Step 3. Step 4 determines final titles and CSV `Filename` values, then aligns the final listing folders and PSDT filenames to that approved mapping. Use `zip-final-listings.py` only after folder alignment is complete.

ZIP rules:

- Create one ZIP per approved metadata row.
- Archive should include the listing folder itself, not loose files.
- Exclude `.DS_Store`.
- Do not include reports inside listing ZIPs.
- Do not include other ZIPs inside listing ZIPs.
- If a listing is missing `.PSDT`, `Thumbnail.jpg`, or `Preview1.jpg`, treat as hard failure and do not create that ZIP.
- Write packaging results under `stages.finalPackaging` in the batch report.

## Current Reference Cases

Observed successful `Batch220526` outputs:

- `DamagedScannerPhotoEffectforPosterandSocialMediaDesign`
- `PencilSketchPhotoEffectforPortraitArtworkandPrintDesign`
- `RetroPaperOverlayGraphicsTemplateforCollageandBrandingDesign`
- `VerticalDamagedScannerPhotoEffectforPosterandCoverDesign`

Observed successful `Batch180526` Step 2 outputs:

- `ClassicCopyScanPhotoEffect`
- `GrainCopyScanPhotoEffect`
- `HighContrastCopyScanPhotoEffect`
- `WashedCopyScanPhotoEffect`
- `MetalWaterBottleMockup`
- `SmearedHalftonePhotoEffect`

These examples encode important naming behavior: source names keep their strongest key phrase, vertical variants include `Vertical`, and multi-listing products use creative title variations rather than mechanical suffixes.

## Step 4: Metadata and CSV Handoff

Before generating or editing Adobe Stock metadata CSV files, read:

```text
references/metadata-csv.md
```

Core rules:

- Inspect any provided CSV/template with a real CSV parser.
- Preserve original column order, delimiter, quoting style, encoding, and line endings where practical.
- Do not invent required columns; infer only from an existing template or ask for the missing schema.
- Treat listing folder names, PSDT filenames, product IDs, and automation reports as authoritative local inputs.
- Determine final portal-facing titles and CSV `Filename` values before packaging ZIPs.
- Rename each final listing folder to the approved CSV `Filename` stem before packaging.
- Rename the single PSDT inside each final listing folder to the approved Step 4 title plus `.PSDT`.
- Generate titles/descriptions/keywords with copywriter judgment, but keep product key phrases intact.
- Check Step 1 `aiMarker` data and source product folder names. If a source product was marked `(AI)` / `(A.I.)`, strip that marker from titles and filenames, then add exact keyword tags `Generative AI` and `Generative` to the CSV row.
- Validate that each CSV row maps to an aligned final listing folder, a same-title PSDT, required preview files, and then to a generated ZIP after final packaging.
- Avoid spreadsheet formula injection in user-controlled text fields by escaping leading `=`, `+`, `-`, and `@` if the target CSV will be opened in spreadsheet software and the platform allows escaping.
- Before writing, create or preserve an audit trail in `BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json` under `stages.step4MetadataCsv` and `stages.step4ListingAlignment`.
- Report every row-level failure with product/listing, CSV row number if known, output path, and message.

## Validation Checklist

Before declaring a batch ready:

```sh
find BatchDDMMYY/Adobe -maxdepth 2 -type f | sort
python3 scripts/build-preview-listings.py BatchDDMMYY --dry-run
```

Check:

- Each listing folder has one `.PSDT`, `Thumbnail.jpg`, and `Preview1.jpg`.
- Each `Thumbnail.jpg` is `2048 x 1424`.
- Each `Preview1.jpg` is `2048px` wide and at most `6000px` tall.
- After Step 4 final packaging, ZIP archives contain the folder and exactly the required files.
- Top-level report `errors` is empty or contains only unresolved actionable failures.
- Source product folders remain unchanged.
