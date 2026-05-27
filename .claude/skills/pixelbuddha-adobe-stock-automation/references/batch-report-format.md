# Canonical Batch Report Format

Use one report file as the source of truth for each Adobe Stock automation batch:

```text
BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json
```

Do not leave separate step reports in the top-level `Adobe/` folder. If an older step-specific report exists, merge its useful data into the canonical report, move the original file to `Adobe/_legacy_reports/`, and add its path to `legacyReportsAbsorbed`.

## Top-Level Shape

```json
{
  "reportVersion": "1.0",
  "reportType": "pixelbuddha-adobe-stock-batch",
  "batch": "BatchDDMMYY",
  "status": "completed",
  "updatedAt": "2026-05-26T14:00:00Z",
  "dropboxFolder": "/Pixelbuddha/Products/Adobe Stock Automation",
  "paths": {},
  "summary": {},
  "stages": {},
  "artifacts": {},
  "warnings": [],
  "errors": [],
  "legacyReportsAbsorbed": []
}
```

`status` values:

- `completed`: all required finalization checks passed.
- `partial`: some stages are complete but the batch is not finalized.
- `failed`: at least one required stage has unresolved errors.
- `blocked`: automation stopped because user input, missing credentials, or missing source files are required.

## Required Top-Level Fields

`paths` should contain:

```json
{
  "batchRoot": "BatchDDMMYY",
  "adobeRoot": "Adobe",
  "metadataCsv": "Adobe/BatchDDMMYY-metadata.csv",
  "canonicalReport": "Adobe/BatchDDMMYY-automation-report.json"
}
```

`summary` should contain:

```json
{
  "sourceProducts": 0,
  "finalListings": 0,
  "metadataRows": 0,
  "finalZips": 0,
  "warnings": 0,
  "errors": 0
}
```

`artifacts` should contain generated deliverables:

```json
{
  "metadataCsv": "Adobe/BatchDDMMYY-metadata.csv",
  "finalZips": [
    "Adobe/FinalListingName.zip"
  ],
  "legacyReports": [
    "Adobe/_legacy_reports/BatchDDMMYY-preview1-report.json"
  ]
}
```

## Stage Keys

Use these exact keys under `stages`:

```text
step1FetchDropboxBatch
step2PrepareListingFolders
step3BuildPreview1
step4MetadataCsv
step4ListingAlignment
finalPackaging
validation
uploadSync
```

If a stage did not run or old data is unavailable, keep the stage object and set `status` to `not_recorded` with a short `note`.

## Stage Guidelines

`step1FetchDropboxBatch` records Dropbox queue selection, downloaded product folders, skipped large PSDs, and credential/config checks. Do not write secrets.

`step2PrepareListingFolders` records source product to initial listing folder mapping, selected PSD/PSDT, PPI validation, thumbnail source, and any scenario selection.

`step3BuildPreview1` records preview source folders, selected grid images, thumbnail source, generated `Preview1.jpg`, generated `Thumbnail.jpg`, selection notes, warnings, and errors.

`step4MetadataCsv` records CSV path, header, instruction row, row count, final row metadata, parsed PSDT dimensions/colorspace, option-count signals, keyword count, warnings, and errors.

`step4ListingAlignment` records folder renames from Step 2/3 working names to approved CSV `Filename` stems, and PSDT renames from working product names to approved Step 4 titles.

`finalPackaging` records one ZIP per metadata row, ZIP byte size, expected contents, actual contents, warnings, and errors.

`validation` records final audit checks and whether they passed.

`uploadSync` records upload destinations and file IDs/links only when upload/sync is in scope.

## Listing Row Audit Shape

Use this row shape wherever a stage audits a final listing:

```json
{
  "sourceProduct": "E3974 - Damaged Scanner Effect",
  "listingFolder": "Adobe/DamagedScannerPhotoEffectforPosterandSocialMediaDesign",
  "psdt": "Adobe/DamagedScannerPhotoEffectforPosterandSocialMediaDesign/Damaged scanner photo effect for poster and social media design.PSDT",
  "preview1": "Adobe/DamagedScannerPhotoEffectforPosterandSocialMediaDesign/Preview1.jpg",
  "thumbnail": "Adobe/DamagedScannerPhotoEffectforPosterandSocialMediaDesign/Thumbnail.jpg",
  "metadata": {
    "filename": "DamagedScannerPhotoEffectforPosterandSocialMediaDesign.zip",
    "title": "Damaged scanner photo effect for poster and social media design",
    "templateCategory": "22",
    "keywordCount": 30,
    "templateSize": "4500 x 3000 pixels",
    "colorspace": "RGB",
    "numberOfPagesOrOptions": "3 design options",
    "disclaimers": "Photos or design elements shown in the preview are for display only and are not included in the downloaded file"
  },
  "optionSignals": [],
  "warnings": [],
  "errors": []
}
```

## Final Validation Checks

Before setting `status` to `completed`, validate:

- CSV parses as UTF-8 BOM-aware CSV.
- CSV header and instruction row are present.
- Every CSV `Filename` stem has a matching final listing folder.
- Every final listing folder contains exactly one PSDT named from the CSV `Title`.
- Every final listing folder contains `Preview1.jpg` and `Thumbnail.jpg`.
- Every CSV `Filename` has a final ZIP archive.
- Every final ZIP contains exactly the listing folder, titled PSDT, `Preview1.jpg`, and `Thumbnail.jpg`.
- Top-level `errors` is empty.

## Legacy Report Handling

When unifying old reports:

1. Parse every report with a JSON parser.
2. Preserve useful provenance inside the relevant canonical stage.
3. Remove stale sections that describe superseded behavior, such as pre-metadata ZIP packaging.
4. Move old standalone reports to `Adobe/_legacy_reports/`.
5. Add moved paths to both `legacyReportsAbsorbed` and `artifacts.legacyReports`.
6. Keep only `BatchDDMMYY-automation-report.json` as a top-level report file in `Adobe/`.
