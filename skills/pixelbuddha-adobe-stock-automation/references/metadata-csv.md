# Step 4 Metadata and CSV

Use this reference when creating or editing Adobe Stock metadata CSV files for Pixelbuddha template batches. It is based on Adobe's current contributor guidance plus one prior Pixelbuddha template metadata CSV example.

Official sources:

- Adobe HelpX: `https://helpx.adobe.com/stock/contributor/help/artist-hub-migration/maximize-metadata-to-get-discovered.html`
- Adobe Stock Metadata Guide PDF: `https://stock.adobe.com/pages/artisthub/pdf/2023-adobe-stock-metadata-guide.pdf`

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
- `Template Category` values:
  - `22` for photo-effect style templates in the example CSV.
  - `39` for text-effect/typography style templates in the example CSV.
- `Number of Pages or Options`: observed values include `1 design option`, `2 design options`, `3 design options`, and `4 design options`.
- `Template Size`: written as `4500 x 3000 pixels` or `3000 x 4500 pixels` in the prior CSV.

Treat category code mappings as inferred from the example until Adobe's official category table or a team-owned mapping is provided.

## Row Mapping

Every CSV data row should map to a final ZIP in:

```text
BatchDDMMYY/Adobe/ListingFolderName.zip
```

The `Filename` cell should be the ZIP filename expected by the portal. In the prior CSV, filenames are compact marketing names with no spaces, an en dash between name and use-case phrase, and `(PSD).zip` at the end, for example:

```text
DamagedScannerPhotoEffect–MonochromeforPoster&SocialMedia(PSD).zip
```

This does not exactly match current Step 3 ZIP filenames, which are simple folder names such as:

```text
DamagedScannerEffect.zip
VerticalDamagedScannerEffect.zip
```

Before generating CSV rows, resolve whether Step 4 should rename ZIPs, use current ZIP names, or create portal-facing duplicate ZIP names.

## Adobe Metadata Rules

Apply these rules unless a team house-style decision overrides them:

- Write metadata in one language per submission.
- Make titles concise, natural, factual, and searchable.
- Adobe suggests titles around 70 characters; longer titles may be shortened during submission.
- If a word is important enough for the title, include it in the keywords, preferably in the first 10.
- Order keywords by importance. The first 10 keywords carry the most search weight.
- Adobe allows up to 49 keywords; their public guidance says 15-35 strong keywords are often enough.
- Use accurate, literal descriptors first. Add conceptual/use-case terms only when relevant.
- Do not keyword spam or bulk-apply metadata without adjusting each asset.
- Avoid brand names, trademarks, product names, people names, offensive terms, camera specs, and file-size information.
- Avoid irrelevant background objects and unnecessary synonym stuffing.
- Avoid copying identical titles and keyword orders across similar files; diversify per listing.
- For localized content, include city/country keywords when truly relevant.
- For people or demographic metadata, use only factual information from releases and never guess.
- If no people appear in image-like content, Adobe suggests `no people` or `nobody`; confirm whether Pixelbuddha template previews should use these.

## Pixelbuddha Metadata Pattern

The prior CSV uses repeatable template-product metadata, not literal photo-scene metadata. It prioritizes product type and buyer use cases:

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

Avoid blindly copying this tail if the keyword cap must be strictly enforced; prioritize top-ten relevance and remove duplicate or low-value terms first.

## Title Pattern

Prior CSV title pattern:

```text
Product Type – Distinctive Attribute for Use Case & Use Case (PSD)
```

Examples:

```text
Damaged Scanner Photo Effect – Monochrome for Poster & Social Media (PSD)
Fade Text Effect – Glowing Typography for Logo, Poster & Branding (PSD)
```

When adapting current Step 2 titles:

1. Preserve the strongest product phrase.
2. Add a factual distinctive effect/material/style word when available.
3. Add one or two buyer use cases if they genuinely match the template preview.
4. Add orientation/use-case differences for variants, such as `Poster`, `Album Cover`, or `Social Media`.
5. Keep the title near 70 characters unless the team confirms the previous longer style should remain.

## Keyword Ordering Process

For each row:

1. Extract the main product class: `photo effect`, `text effect`, `mockup`, `overlay`, etc.
2. Extract the target use case: `poster design`, `album cover`, `logo`, `branding`, `social media`, etc.
3. Extract the distinctive look from title/source/previews: `damaged scanner`, `pencil sketch`, `retro papers`, `grain`, `monochrome`, etc.
4. Build the first 10 keywords from the title and core buyer intent.
5. Add accurate supporting effect words, style words, and template mechanics.
6. Remove non-relevant terms, duplicate terms, near-duplicate synonyms, and anything unsupported by the asset.
7. Vary order across sibling rows so similar assets do not compete with identical metadata.
8. Validate the final keyword count against the chosen team rule.

Recommended top-ten templates:

Photo effect:

```text
photo effect, [primary use case], [secondary use case], [distinctive effect phrase], [style/look], Photoshop, psd, smart object, editable, high resolution
```

Text effect:

```text
text effect, typography effect, text style, [distinctive text effect phrase], logo, branding, poster design, Photoshop, psd, editable
```

## Validation Checklist

Before saving or uploading:

- CSV parses with a real CSV parser.
- Header row and instruction row are preserved unless intentionally changed.
- Every data row has 8 fields.
- Every `Filename` maps to an existing ZIP or an explicit planned ZIP rename.
- `Title` is non-empty and unique enough across the batch.
- Important title words appear in the first 10 keywords.
- Keyword count follows the agreed rule.
- `Template Category` uses an approved code.
- `Template Size` matches the PSD/template dimensions.
- `Colorspace` is an allowed portal value.
- `Number of Pages or Options` matches actual design options.
- `Disclaimers` is present when preview photos/design elements are not included.
- No row contains brand/trademark names, unsupported end-use guesses, offensive terms, or irrelevant terms.
- CSV quoting is valid after commas, ampersands, en dashes, and parentheses.
- `BatchDDMMYY/Adobe/BatchDDMMYY-automation-report.json` is updated with a `step4` or `metadataCsv` section summarizing generated rows, warnings, and hard errors.

## Open Questions for Q&A

1. Should Step 4 use the current ZIP filenames from Step 3, or should it rename/copy ZIPs to portal-facing filenames like the previous CSV?
2. Should titles keep the prior house style with en dashes, ampersands, and `(PSD)`, even though Adobe's guide advises avoiding hyphens and parentheses in metadata?
3. Is `Template Category` mapping confirmed as `22 = photo effects` and `39 = text effects`, or is there an official category table we should store in the repo?
4. Should we enforce Adobe's 49-keyword maximum strictly? The prior CSV has rows that appear to exceed 49 by comma-separated counting.
5. Do we want Adobe's suggested 15-35 keyword range, or the denser historical Pixelbuddha 40-49 keyword style?
6. Should keywords include both `mockup` and `mock up`, both `psd` and `psdt`, and both `editable` and `edit/customize`, or should we de-duplicate these?
7. Should `no people` or `nobody` be added to template rows when previews contain no people, or is that inappropriate for template products?
8. How should `Number of Pages or Options` be derived: PSD artboards/layers, preview variants, source folders, or manual product knowledge?
9. How should `Template Size` be derived when horizontal and vertical variants exist: from PSD dimensions, Preview1 orientation, or standard template canvas?
10. Are generative-AI flags or releases relevant to any Pixelbuddha previews, or always out of scope?
11. Should metadata rows be generated once per final listing ZIP, or can one product produce multiple CSV rows for alternate use cases?
12. Where should the completed CSV be stored locally and in Dropbox, and should it be included in the automation report upload folder?

