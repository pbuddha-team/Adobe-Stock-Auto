---
name: pixelbuddha-adobe-auto-step1
description: Fetch Pixelbuddha Adobe-auto products from Dropbox using /Products/auto.json, create a local BatchDDMMYY folder, and skip PSD files over the configured size limit. Use when the user asks to run Step 1, fetch today's Adobe-auto products, create a product batch, or prepare Dropbox products for later local processing.
---

# Pixelbuddha Adobe Auto Step 1

Use this skill when the user asks to fetch today's Adobe-auto products, run Step 1, create a batch, or prepare products from Dropbox for later processing.

## Workflow

1. Work from the project folder where the user wants the batch created.
2. Never print Dropbox secrets from `.env` or shell environment.
3. Validate new-machine setup with:
   ```sh
   node scripts/dropbox-products.mjs step1 --dry-run
   ```
4. Run Step 1 with:
   ```sh
   node scripts/dropbox-products.mjs step1
   ```
5. For a specific date/backfill, use:
   ```sh
   node scripts/dropbox-products.mjs step1 --date 2026-05-18
   ```
   `DDMMYY` also works, for example `--date 180526`.
6. Report the selected products, skipped PSDs, final `BatchDDMMYY` folder path, and local log path.

## Expected Project Files

The project should contain:

```text
scripts/dropbox-products.mjs
.env
```

Credentials must be local only. Required shared credentials/config:

```text
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
DROPBOX_REFRESH_TOKEN=
DROPBOX_AUTO_JSON_PATH=/Products/auto.json
DROPBOX_MAX_PSD_MB=500
STEP1_LOG_PATH=step1-log.json
```

## Behavior

- Read Dropbox `/Products/auto.json`.
- Select records matching today's local date, or the explicit `--date` value.
- Treat selected records as the Adobe-auto queue.
- Download each product folder into `./BatchDDMMYY`.
- Skip `.psd` files over `DROPBOX_MAX_PSD_MB` and continue with the remaining files/products.
- Append a per-run JSON record to `./step1-log.json` after real runs. Dry runs do not write logs.
- Later steps should consume local `BatchDDMMYY` contents instead of re-reading Dropbox unless fresh metadata or uploads are explicitly needed.
