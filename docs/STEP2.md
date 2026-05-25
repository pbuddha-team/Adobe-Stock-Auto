# Pixelbuddha Adobe Auto Step 2

Step 2 turns a downloaded `BatchDDMMYY` folder into final Adobe-auto listing folders.

The source batch is created by Step 1. Step 2 must not modify source product folders. It only copies processed files into a single batch-level output folder:

```text
BatchDDMMYY/Adobe/
```

Each final listing folder inside `BatchDDMMYY/Adobe/` must contain:

```text
Listing Name.PSDT
Thumbnail.jpg
```

`Preview1.jpg` generation and ZIP packing are Step 3 operations and are intentionally out of scope for Step 2.

## Automation Reports

Automation logs and batch reports should live in Dropbox under:

```text
/Pixelbuddha/Products/Adobe Stock Automation
```

Use one full automation report file per batch. The standard filename pattern is:

```text
BatchDDMMYY-automation-report.json
```

The report must be written locally first at:

```text
BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json
```

A later automation step uploads or syncs that same file to the Dropbox folder. This preserves a local audit trail even if Dropbox upload fails. Each process step should update its own section rather than creating separate report files.

Top-level report sections:

- `step1`
- `step2`
- `preview1`
- `step3`
- `uploadSync`
- `errors`

The top-level `errors` array is a quick hard-failure summary across all steps. Only failures that require action should appear there. Step sections may keep detailed warnings, but warnings should not be duplicated into top-level `errors`.

Any actionable failure should appear in the top-level `errors` array with its step name, product/listing when applicable, output path when known, and message.

The `preview1` section should include:

- Batch name.
- Product/listing name.
- Source folder used.
- Final output folder.
- `Preview1.jpg` path.
- `Thumbnail.jpg` path.
- Numbered source images used in the grid.
- Thumbnail source image.
- Selection note, such as images selected/skipped from a larger source set or rhythm ordering changes.
- Warnings/errors.

The `step3` section should include:

- Listing folder path.
- ZIP path.
- Files included in the ZIP.
- Hard failures, if a listing is missing required files.

## Global Rules

- Create `BatchDDMMYY/Adobe/` before processing products.
- Leave all source folders intact for manual inspection.
- Copy files into the final output folder; do not move source files.
- Every source PSD used for an output listing must be checked for `300 PPI`.
- If a source PSD is not `300 PPI`, stop that listing with an error.
- Final PSD files use the `.PSDT` extension.
- Final folder names do not contain spaces.
- Final PSDT file names do contain spaces.
- If an output name collides with an existing final folder, create a creative title variation automatically.
- Naming should preserve the strongest key phrase in the source product name.
- Use copywriter-style judgment for title variations. The variation should read like a real product listing, not a mechanical label.

Example:

```text
Source product: Copy Scan Photo Effect
Key phrase: Scan Photo Effect

Good variations:
Classic Copy Scan Photo Effect
Grain Copy Scan Photo Effect
High Contrast Copy Scan Photo Effect
Washed Copy Scan Photo Effect
```

## Thumbnail Routine

Every final listing folder must get a `Thumbnail.jpg` at exactly:

```text
2048 x 1424
```

Use this routine:

1. Look for an image that is already exactly `2048 x 1424`.
2. If found, copy it as `Thumbnail.jpg`.
3. If no exact image exists, look for the closest candidate by filename:
   - `1.jpg`
   - `adobe.jpg`
   - `thumbnail.jpg`
4. Only use a fallback candidate if its aspect ratio matches `2048 x 1424`.
5. Resize the fallback candidate by stretching to exactly `2048 x 1424`.
6. If no exact image and no valid fallback candidate exists, return an error.

## Scenario Detection

Classify each product folder using this priority:

1. Scenario 2: product `Adobe` folder contains multiple complete listing folders, each with its own PSD.
2. Scenario 3: horizontal and vertical template PSDs, while product `Adobe` folders are preview/thumbnail sources.
3. Scenario 1: one target PSD in the product-titled folder.

Ignore helper PSDs in preview-source, texture, cover, and other support folders unless the active scenario explicitly uses them.

## Scenario 1: Single Target PSD

Scenario 1 applies when there is no usable Adobe listing structure.

This includes:

- No product-level `Adobe` folder.
- Empty product-level `Adobe` folder.
- Product-level `Adobe` folder contains JPG images only and no listing PSDs.

Use the single target PSD in the product-titled folder, even if the PSD filename is not ideal.

Examples:

```text
E3950 - Pencil Sketch Photo Effect/
  Pencil Sketch Photo Effect/
    Horisontal.psd

E3885 - Retro Papers Overlay Kit/
  Retro Papers Overlay Kit/
    Template.psd
  Adobe/
    adobe.jpg
    1.jpg
    2.jpg
    3.jpg
    4.jpg
```

Scenario 1 output:

```text
BatchDDMMYY/Adobe/ProductNameWithoutSpaces/
  Product Name With Spaces.PSDT
  Thumbnail.jpg
```

Thumbnail source priority:

1. Product `Adobe` folder, if it exists and contains images.
2. `Preview files/adobe.jpg`.
3. `Preview files/1.jpg`.

The global thumbnail routine still applies: prefer an exact `2048 x 1424` image, otherwise resize a valid fallback candidate.

## Scenario 2: Multiple Complete Adobe Listing Folders

Scenario 2 applies when the product-level `Adobe` folder contains multiple inner folders, and each inner folder is a complete listing package.

Each inner folder contains:

- One PSD source for that listing.
- One thumbnail source image, ideally already `2048 x 1424`.
- Additional images for Step 3 `Preview1.jpg`.

Example shape:

```text
Product/
  Adobe/
    1/
      Some Listing.psd
      2048x1424.jpg
      1.jpg
      2.jpg
      3.jpg
    2/
      Another Listing.psd
      adobe.jpg
      1.jpg
      2.jpg
```

Processing rule:

1. Treat each inner folder as one final listing.
2. Find the PSD inside that same folder.
3. Check the PSD is `300 PPI`.
4. Create a final listing folder in `BatchDDMMYY/Adobe/`.
5. Copy the PSD as `.PSDT`.
6. Create `Thumbnail.jpg` from an image inside the same inner folder.

Scenario 2 naming:

- One listing uses the exact source product name.
- It does not matter which listing receives the exact source product name.
- Other listings get creative variations.
- Variations must preserve the key phrase of the source product.
- If inner folder names are useful, they may guide the title.
- If inner folder names are vague, infer title variations from PSD names and visual content.

## Scenario 3: Horizontal and Vertical Templates

Scenario 3 applies when the product includes horizontal and vertical template versions, and the product `Adobe` subfolders are preview/thumbnail sources rather than complete PSD listing folders.

The defining signal is PSD files with orientation indicators such as:

```text
Horizontal.psd
Vertical.psd
name_h.psd
name_v.psd
name_H.psd
name_V.psd
Portrait.psd
```

The horizontal and vertical PSDs are the source templates. Product-level `Adobe` subfolders are preview and thumbnail sources, not PSD sources.

Example:

```text
E3974 - Damaged Scanner Effect/
  Damaged Scanner Effect/
    Horizontal.psd
    Vertical.psd
  Adobe/
    1/
      2048x1424.jpg
      1.jpg
      2.jpg
      3.jpg
    2/
      2048x1424.jpg
      1.jpg
      2.jpg
```

Scenario 3 output naming:

- Horizontal/default listing uses the full original product name.
- Vertical listing must include `Vertical` or `Portrait` in the final name.

Example:

```text
BatchDDMMYY/Adobe/DamagedScannerEffect/
  Damaged Scanner Effect.PSDT
  Thumbnail.jpg

BatchDDMMYY/Adobe/VerticalDamagedScannerEffect/
  Vertical Damaged Scanner Effect.PSDT
  Thumbnail.jpg
```

Matching preview folders to orientations:

- If folders are named clearly, use the folder names.
- If folders are vague, such as `1` and `2`, infer orientation from visual content.
- If final listing folders already contain distinct `Thumbnail.jpg` files, later preview steps may match a source preview folder to the final listing by comparing the source thumbnail image to the existing final `Thumbnail.jpg`.
- Use labels and layout clues such as `poster`, `portrait`, `vertical`, `cover`, wide compositions, and portrait compositions.
- If still ambiguous, use best visual judgment.
- Do not create extra metadata unless it prevents a real source-to-listing ambiguity. The goal is simply that the correct source images are used for the correct final listing.

For each orientation listing:

1. Check the matching PSD is `300 PPI`.
2. Copy the PSD to the final output folder as `.PSDT`.
3. Use the matching preview folder to create `Thumbnail.jpg`.
4. Apply the global thumbnail routine.

## Errors

Return an error for a listing when:

- The selected PSD is not `300 PPI`.
- No PSD can be identified for the active scenario.
- A required thumbnail cannot be found or produced.
- A fallback thumbnail candidate has the wrong aspect ratio.

Do not delete or rewrite source files while handling errors.

## Preview1 Companion Grid

After Step 2 creates final listing folders, generate a companion `Preview1.jpg` for each final listing folder.

Each final listing folder should then contain:

```text
Listing Name.PSDT
Thumbnail.jpg
Preview1.jpg
```

`Preview1.jpg` format:

- Filename is exactly `Preview1.jpg`.
- Canvas width is always `2048px`.
- Maximum canvas height is `6000px`.
- Background color is `#ffffff`.
- Gutter is `10px`.
- JPEG quality is `60`.
- Ignore `fp.jpg` and `t.jpg` for the grid.
- Use numbered JPG files only. Natural numeric order is the starting point, but the script may reorder images to improve visual sequencing.
- Use no more than 6 numbered images for this grid.
- The first 6 numbered images are the starting pool, but the script may skip weak or repetitive images in favor of stronger later numbered images.
- If the composed grid would exceed `6000px` height, automatically remove lower-priority images from the end of the selected grid until it fits. Log the removed images in the selection note.

Source priority:

1. Scan the product-level `Adobe` folder first.
2. If usable numbered JPGs are found in `Adobe`, use them for `Preview1.jpg`.
3. If the product-level `Adobe` folder has nested variant folders, generate a separate `Preview1.jpg` for each matched final listing folder.
4. If no usable Adobe JPGs exist, fall back to `Preview files`.

Default grid schema:

```text
2 images: 1-1
3 images: 1-1-1
4 images: 1-1-1-1
5 images: 1-2-1-1
6 images: 1-2-1-2
```

`1` means one full-width image row. `2` means two images in one row. These schemas are defaults, not rigid locks.

## Preview1 Visual Sequencing

The numeric order is the default, but it is not absolute. The script should apply common visual sequencing rules directly; do not require a separate ordering config file. Before finalizing `Preview1.jpg`, check the rhythm of the grid:

- The first feature image must always be full-width.
- Avoid placing two visually similar low-contrast or pale rows back to back when a stronger contrast/demo image is available.
- Place a dark, black-background, comparison, before/after, or workflow-demonstration slide immediately after the cover when it improves scanning.
- Before/after and comparison slides default to full-width.
- Use a before/after or comparison slide in a two-column row only when both halves remain clearly readable at half-width and the slide is not the primary proof/demo image.
- Only use the two-column row for images that remain understandable at smaller size.
- For 5 or 6 usable images, the final grid may be `1-2-1-1`, `1-1-2-1`, or `1-2-1-2`, depending on readability and visual rhythm.
- Choose the two-column row positions after preserving the full-width feature image and any full-width proof/comparison slides.

The script should use lightweight automatic image signals where helpful:

- Average brightness.
- Contrast.
- Amount of very dark area.

If the first two slides are both pale or visually similar, and a clearly darker/demo-like slide appears later in the selected set, move that darker slide near the top unless it violates the full-width feature/proof rules. Keep this heuristic predictable; use script-level exceptions only when simple image stats are not enough.

When more than 6 numbered preview images are available, select the strongest 6 for the grid rather than blindly taking the first 6. Prefer variety across:

- Cover/feature image.
- Main proof/demo/comparison image.
- Detail or texture image.
- Usage/mockup examples.
- Additional visually distinct examples.

Skip laterally similar, weak, or redundant images when a later numbered image adds clearer variety or contrast.

Example:

```text
PencilSketchPhotoEffect
Default numeric order: 1, 2, 3
Preferred order:      1, 3, 2
```

Reason: `1.jpg` and `2.jpg` are both pale full-width sketch previews, while `3.jpg` is a darker comparison/demo slide. Placing `3.jpg` second gives the grid stronger contrast and makes the product story easier to scan.

## Undefined Or Manual Decisions

These parts still require visual judgment or future rules:

- Detecting before/after slides automatically. For now, decide manually when a slide should stay full-width.
- Deciding which image pair is safe for the two-column row in a 5-image grid.
- Choosing creative title variations when a product produces multiple listing folders.
- Matching vague variant folders such as `1` and `2` to horizontal, vertical, portrait, or other output names when thumbnails are not already present or cannot be matched by image identity.
- Handling products with more than 6 strong numbered preview images still requires visual judgment. The script may skip weak/repetitive images, and it may remove lower-priority images to keep `Preview1.jpg` under `6000px`, but close calls should be checked manually.

## Step 3 Final ZIP Packing

After `Preview1.jpg` files are created, ZIP each final listing folder inside:

```text
BatchDDMMYY/Adobe/
```

Each final listing folder must contain exactly one `.PSDT` file plus:

```text
Thumbnail.jpg
Preview1.jpg
```

Create one ZIP per final listing folder:

```text
BatchDDMMYY/Adobe/ListingFolderName.zip
```

The ZIP archive should include the listing folder itself, not just loose files. Example archive contents:

```text
ListingFolderName/
  Listing Name.PSDT
  Thumbnail.jpg
  Preview1.jpg
```

ZIP rules:

- Do not modify source product folders.
- Exclude `.DS_Store`.
- Do not include batch reports inside listing ZIPs.
- Do not include other ZIP files inside listing ZIPs.
- If a listing folder is missing `.PSDT`, `Thumbnail.jpg`, or `Preview1.jpg`, treat it as a hard failure and do not create that ZIP.
- Update the local full batch report at `BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json`.
