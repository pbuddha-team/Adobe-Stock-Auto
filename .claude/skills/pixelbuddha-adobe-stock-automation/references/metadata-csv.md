# Step 4 Metadata and CSV

Use this reference when creating or editing Adobe Stock metadata CSV files for Pixelbuddha template batches. It is based on Adobe's current contributor guidance, the team-provided AI metadata research, and one prior Pixelbuddha template metadata CSV example.

Official sources:

- Adobe HelpX: `https://helpx.adobe.com/stock/contributor/help/artist-hub-migration/maximize-metadata-to-get-discovered.html`
- Adobe Stock Metadata Guide PDF: `https://stock.adobe.com/pages/artisthub/pdf/2023-adobe-stock-metadata-guide.pdf`
- Team research source of truth: `references/adobe-stock-metadata-guidelines-ai.md`
- Adobe Stock template metadata workbook: `assets/AdobeStockTemplates_MetadataForm_Portal_6-2023.xlsx`

## CSV Shape

The observed template CSV uses comma-separated values with quoted cells when needed. Preserve this exact column order:

```text
Filename
Title
Template Category
Keywords
Template Size
Colorspace
Number of Pages or Options
Disclaimers
```

The first row is the header. The second row is an instruction row:

```text
,,Refer to Instructions for the correct number to use for each category, (5-49 maximum),,(USE DROPDOWN),,"(USE DROPDOWN—If no photos used, leave blank)"
```

Keep the instruction row unless the user explicitly asks to remove it. Data rows begin after the instruction row.

Observed prior-batch defaults:

- `Colorspace`: `RGB`
- `Disclaimers`: `Photos or design elements shown in the preview are for display only and are not included in the downloaded file`
- `Number of Pages or Options`: observed values include `1 design option`, `2 design options`, `3 design options`, and `4 design options`.
- `Template Size`: written as `4500 x 3000 pixels` or `3000 x 4500 pixels`.

Template category codes come from page 2 / `Instructions` sheet of the Adobe Stock template metadata workbook. Do not infer category numbers from old CSV rows when the workbook table applies.

## Template Category Codes

Use the official category list from the workbook's `Instructions` sheet, rows 5-30:

```text
11  Infographics
12  Social Media
13  Brochures and Catalogs
14  Business Cards
15  Calendars and Planners
16  Collages and Moodboards
17  Digital Magazines
18  Digital Presentations and Proposals
19  Flyers and Posters
20  Stationery
21  Frame Mockups
22  Image Effects
23  Invitations and Cards
24  Label and Sticker Sets
25  Logo and Icon Sets
27  Menus
28  Mobile Mockups
29  Mobile UI/UX
32  Pattern and Texture Sets
33  Print Design Mockups
34  Print Magazines
35  Print Presentations and Proposals
36  Resumes
37  Screen Mockups
39  Text Effects
41  Web Banners
42  Web UI/UX
```

Category selection policy:

- `photo effect` / image effect products use `22 Image Effects`.
- `text effect` / typography effect products use `39 Text Effects`.
- `mockup` is not one category; choose the specific official mockup category:
  - physical frame/wall art frames: `21 Frame Mockups`
  - mobile device/app presentation: `28 Mobile Mockups`
  - print/object/packaging/product presentation, including most physical product mockups: `33 Print Design Mockups`
  - desktop, laptop, monitor, website, app screen, or UI display mockups: `37 Screen Mockups`
- `graphics template` is not one category; choose the closest official category by actual output/use case, such as `12 Social Media`, `16 Collages and Moodboards`, `19 Flyers and Posters`, `25 Logo and Icon Sets`, `32 Pattern and Texture Sets`, or another exact category from the table.
- If one product could fit multiple categories, prefer the category that best describes the delivered editable template, not just the preview context.
- If the category remains ambiguous after inspecting product title, output files, and previews, record a row-level warning and ask for a decision before final CSV export.

## Row Mapping

Every CSV data row should first map to a final listing folder in:

```text
BatchDDMMYY/Adobe/ListingFolderName/
```

Use exactly one metadata row per final listing ZIP. If one source product creates several final listing folders, each final listing folder gets its own row and its own final ZIP filename. Do not create alternate rows for secondary use cases unless there is a separate final listing package.

Step 4 determines the final title and the portal-facing ZIP filename. The `Filename` cell should be the ZIP filename expected by the portal. In the prior CSV, filenames are compact marketing names with no spaces, an en dash between name and use-case phrase, and `(PSD).zip` at the end, for example:

```text
DamagedScannerPhotoEffect–MonochromeforPoster&SocialMedia(PSD).zip
```

This intentionally does not have to match Step 2/Step 3 working folder names such as:

```text
DamagedScannerEffect/
VerticalDamagedScannerEffect/
```

Do not package ZIPs before this mapping is final. Final ZIP packaging should use the Step 4 `Filename` values, not the temporary listing folder names.

Store the completed metadata CSV beside the listing folders by default:

```text
BatchDDMMYY/Adobe/BatchDDMMYY-metadata.csv
```

Record this path in `BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json` under `stages.step4MetadataCsv.csv`.

## Adobe Metadata Rules

Apply these rules for generated titles, filenames, and keywords:

- Write metadata in one language per submission.
- Make titles concise, natural, factual, and searchable.
- Adobe allows up to 200 title characters, but use 70-90 characters as the normal working range so titles include useful search terms without becoming bloated.
- If a word is important enough for the title, include it in the keywords, preferably in the first 10.
- Order keywords by importance. The first 10 keywords carry the most search weight.
- Enforce Adobe's 49-keyword maximum strictly. The target range is 15-35 strong, relevant keywords; exceed 35 only when every extra keyword is specific, accurate, and useful.
- Use accurate, literal descriptors first. Add conceptual/use-case terms only when relevant.
- Do not keyword spam or bulk-apply metadata without adjusting each asset.
- Avoid brand names, trademarks, product names, people names, offensive terms, camera specs, and file-size information.
- Avoid irrelevant background objects and unnecessary synonym stuffing.
- Avoid copying identical titles and keyword orders across similar files; diversify per listing.
- For localized content, include city/country keywords when truly relevant.
- Pixelbuddha scope is Adobe Stock template PSDT submissions, not stock photo submissions. Do not add stock-photo people-presence keywords such as `no people` or `nobody` by default.
- Generative-AI flags, fictional people/property flags, model releases, and property releases are out of scope for the entire Pixelbuddha automation. Do not add AI labels, release notes, or `generative AI` terms to CSV metadata, titles, or keywords.

## Pixelbuddha Metadata Pattern

The prior CSV uses repeatable template-product metadata, not literal photo-scene metadata. Treat it as historical reference, not as a target density rule. Pixelbuddha submits template PSDT files in official template categories, so metadata should prioritize editable product type and buyer use cases:

Photo-effect rows commonly start keywords with:

```text
photo effect, poster design or album cover, cover art, music art, social media, branding, advertising, print design, high resolution
```

Text-effect rows commonly start with:

```text
text effect, typography effect, text style, editable text, easy edit, layered, high resolution, logo, branding, poster design
```

Rows then add distinctive effect phrases derived from the product name and visuals, for example:

```text
bad scan photo effect, grainy print photo effect, b&w print photo effect
urban spray text effect, aerosol text effect, graffiti smudge text effect
```

Rows usually end with reusable template/mechanics terms:

```text
psd, Photoshop, mockup, mock up, product, scene, showcase, photography, insert, image, place, psdt, smart object, layered, customizable, editable, customize, edit, 4500 x 3000 px, rgb
```

Do not blindly copy this tail. The current policy is Adobe-aligned: keep the first 10 highly relevant, target 15-35 strong keywords, and never exceed 49. Remove duplicate, near-duplicate, unsupported, or low-value mechanics terms first.

Keyword de-duplication policy:

- Use one spelling for near-duplicates by default. Prefer `mockup` over `mock up`.
- Use `psd` when a broad format keyword is useful; add `psdt` only when the specific template format is important for the row.
- Prefer buyer-action terms like `editable`, `customizable`, and `smart object`; do not also add low-value variants such as `edit` or `customize` unless they describe a distinct supported feature.
- Keep both terms only when search intent is meaningfully different and both are accurate for the file.

## Title Policy

Write titles from scratch for Step 4. Do not preserve the prior CSV's en-dash/ampersand/`(PSD)` pattern as house style. Use Adobe-aligned, natural titles based on the initial product title and the actual final listing.

The initial product title is the primary source for:

- Product category: `mockup`, `photo effect`, `text effect`, `graphics template`, `overlay`, or another explicit template class.
- Core product phrase: the strongest buyer-search phrase in the original name.
- Distinctive style/effect/material words.
- Variant intent when present, such as horizontal, vertical, poster, album cover, social media, logo, branding, or typography.

Title composition:

```text
[Specific style/effect/material] + [template category] + [main buyer use case or context]
```

Examples:

```text
Damaged scanner photo effect for poster and social media design
Pencil sketch photo effect for portrait artwork and print design
Retro paper overlay graphics template for collage and branding
Metal water bottle mockup for reusable drinkware branding
Glowing fade text effect for logo and poster typography
```

Title rules:

1. Preserve the strongest phrase from the initial product title unless it is inaccurate.
2. Put the concrete category in the title: `mockup`, `photo effect`, `text effect`, or `graphics template`.
3. Include the key distinctive terms from the product title and preview evidence.
4. Add a commercial/use-case context only when it is supported by the template.
5. Use natural language, not comma-separated keyword lists.
6. Avoid parentheses, decorative separators, brand names, IP names, artist names, character names, camera specs, file-size specs, and style-mimicry phrases such as `in the style of`, `inspired by`, or `influenced by`.
7. Prefer `and` over `&` in titles.
8. Avoid technical format labels like `PSD`, `PSDT`, or `Photoshop` in the title unless the portal specifically requires them later.
9. Keep titles unique across sibling variants. If two listings come from one product, vary the use case or orientation truthfully.
10. Aim for 70-90 characters, but allow shorter titles when they are complete and commercially clear.

Final portal filenames should be derived from approved Step 4 titles, not from Step 2/Step 3 temporary folder names. Filenames may be compact and filesystem-safe, but they should remain traceable to the approved title and row.

After titles and `Filename` values are approved, align the local listing package before final ZIP packaging:

1. Rename the final listing folder to the approved `Filename` stem.
2. Rename the single PSDT inside that folder to the exact approved `Title` plus `.PSDT`.
3. Keep `Thumbnail.jpg` and `Preview1.jpg` inside the renamed folder.
4. Create the final ZIP from the renamed folder, using the exact CSV `Filename`.

Example:

```text
Filename: DamagedScannerPhotoEffectforPosterandSocialMediaDesign.zip
Title: Damaged scanner photo effect for poster and social media design

Adobe/DamagedScannerPhotoEffectforPosterandSocialMediaDesign/
  Damaged scanner photo effect for poster and social media design.PSDT
  Thumbnail.jpg
  Preview1.jpg
```

## Keyword Ordering Process

For each row:

1. Read the initial product title and identify the category: `mockup`, `photo effect`, `text effect`, `graphics template`, `overlay`, etc.
2. Extract title-critical terms from the approved final title.
3. Extract the target use case: `poster design`, `album cover`, `logo`, `branding`, `social media`, etc.
4. Extract the distinctive look from title/source/previews: `damaged scanner`, `pencil sketch`, `retro papers`, `grain`, `monochrome`, etc.
5. Build the first 10 keywords from the title and core buyer intent.
6. Add accurate supporting effect words, style words, and template mechanics.
7. Remove non-relevant terms, duplicate terms, near-duplicate synonyms, and anything unsupported by the asset.
8. Vary order across sibling rows so similar assets do not compete with identical metadata.
9. Validate the final keyword count: target 15-35 strong keywords and never exceed 49.

Recommended top-ten templates:

Photo effect:

```text
photo effect, [primary use case], [secondary use case], [distinctive effect phrase], [style/look], Photoshop, psd, smart object, editable, high resolution
```

Text effect:

```text
text effect, typography effect, text style, [distinctive text effect phrase], logo, branding, poster design, Photoshop, psd, editable
```

## Number of Pages or Options

This field is not crucial enough to require manual review. Derive it automatically from PSDT metadata and accept the possibility of occasional error. Write the final value as:

```text
1 design option
2 design options
3 design options
```

Use these additive signals:

- Editable title/content smart object layer: count `1` option when a layer name starts with or contains `Edit`, `Editable`, `Edit Content`, `Edit Contents`, `Your Image Here`, `Your Design Here`, `Your Text Here`, or a similar editable-content/title layer. Prioritize smart-object layers when the parser can detect them. Multiple editable smart-object layers that represent one placement area should still count as one option unless their names clearly identify separate buyer-facing placements.
- `Adjustments` folder/layer group: count `1` option when a top-level or obvious group is named `Adjustments`.
- `Background Color` layer: count `1` option when a layer is named `Background Color`, `BG Color`, or equivalent.
- Numeric option folder: count `N` options when a folder/group contains child layers named only as numbers (`1`, `2`, `3`, ...), and only one of those numbered children is visible. This is the strongest signal for multiple buyer-facing options. Use the numeric count, not `1`.

Counting rule:

1. Detect all signals above from the final PSDT.
2. Sum the option counts.
3. Minimum value is `1`.
4. If a numeric option folder is detected, include its full `N` count plus other distinct additive controls such as editable content, adjustments, or background color.
5. If the parser cannot determine visibility for numeric children, still use the numeric folder count when the group clearly represents options, and add a warning to the Step 4 report.
6. Do not count ordinary layer count, texture count, hidden helper layers, preview-source layers, or repeated internal effect layers unless they match one of the rules above.

Examples:

```text
Edit Content smart object only -> 1 design option
Edit Content + Adjustments -> 2 design options
Edit Content + Adjustments + Background Color -> 3 design options
Edit Content + numeric folder with 4 visible-choice children -> 5 design options
```

Record the detected signals in the Step 4 report so questionable counts can be audited later, but do not block CSV generation solely because this value may be imperfect.

## Template Size

Derive `Template Size` from the final PSDT metadata, not from preview images, thumbnails, source folder names, or Step 3 `Preview1.jpg`.

Read the PSDT canvas width and height from the Photoshop file header and format the CSV value as:

```text
{width} x {height} pixels
```

Examples:

```text
4500 x 3000 pixels
3000 x 4500 pixels
5000 x 5000 pixels
```

For horizontal and vertical variants, each CSV row uses that final listing's own PSDT dimensions. Record the parsed dimensions in the Step 4 report.

## Validation Checklist

Before saving or uploading:

- CSV parses with a real CSV parser.
- Header row and instruction row are preserved unless intentionally changed.
- Every data row has 8 fields.
- Every `Filename` maps to an existing final listing folder and a planned final ZIP path.
- Every final listing folder has been renamed to its approved `Filename` stem.
- The PSDT inside every final listing folder has been renamed to the approved `Title` plus `.PSDT`.
- `Title` is non-empty and unique enough across the batch.
- Important title words appear in the first 10 keywords.
- Keyword count is 15-35 by default and never above 49.
- `Template Category` uses an approved code.
- `Template Size` matches the final PSDT canvas dimensions parsed from metadata.
- `Colorspace` is an allowed portal value.
- `Number of Pages or Options` is derived from PSDT signals and its detected signals are recorded in the Step 4 report.
- `Disclaimers` is present when preview photos/design elements are not included.
- No row contains brand/trademark names, unsupported end-use guesses, offensive terms, or irrelevant terms.
- CSV quoting is valid after commas, ampersands, en dashes, and parentheses.
- `BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json` is updated with `stages.step4MetadataCsv` and `stages.step4ListingAlignment`, including generated rows, warnings, and hard errors.

## CSV Storage and Sync

Default local path:

```text
BatchDDMMYY/Adobe/BatchDDMMYY-metadata.csv
```

Record the CSV under `artifacts.metadataCsv` and `stages.step4MetadataCsv.csv` in the canonical batch report.

Do not upload or sync the CSV by default during metadata generation. If the user explicitly runs an `uploadSync` step, sync the canonical report and metadata CSV together to the configured Dropbox automation folder. Do not upload final ZIPs through the report sync unless the user explicitly asks for ZIP upload.
