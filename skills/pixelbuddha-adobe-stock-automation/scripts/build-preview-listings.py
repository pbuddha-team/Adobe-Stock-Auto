#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from dataclasses import dataclass
from pathlib import Path

from PIL import Image
from PIL import ImageStat


CANVAS_WIDTH = 2048
MAX_CANVAS_HEIGHT = 6000
GUTTER = 10
BACKGROUND = (255, 255, 255)
QUALITY = 60
MAX_GRID_IMAGES = 6
IGNORED_GRID_NAMES = {"fp.jpg", "t.jpg", "thumbnail.jpg", "adobe.jpg"}
GRID_ORDER_OVERRIDES = {
    "PencilSketchPhotoEffect": [1, 3, 2],
}


@dataclass
class ProductResult:
    product: Path
    source: Path | None
    output: Path
    grid_images: list[Path]
    thumbnail_source: Path | None
    errors: list[str]
    warnings: list[str]
    selection_note: str | None = None


def natural_key(path: Path) -> list[int | str]:
    parts = re.split(r"(\d+)", str(path).lower())
    return [int(part) if part.isdigit() else part for part in parts]


def clean_product_name(product_dir: Path) -> str:
    name = re.sub(r"^[A-Z]\d+\s*-\s*", "", product_dir.name).strip()
    return re.sub(r"[^A-Za-z0-9]+", "", name)


def is_jpg(path: Path) -> bool:
    return path.suffix.lower() in {".jpg", ".jpeg"}


def numeric_jpgs(source_dir: Path, recursive: bool) -> list[Path]:
    paths = source_dir.rglob("*") if recursive else source_dir.iterdir()
    files = [
        path
        for path in paths
        if path.is_file()
        and is_jpg(path)
        and path.name.lower() not in IGNORED_GRID_NAMES
        and path.stem.isdigit()
    ]
    return sorted(files, key=natural_key)


def thumbnail_candidates(product_dir: Path, source_dir: Path | None) -> list[Path]:
    candidates: list[Path] = []
    if source_dir:
        candidates.extend(
            [
                source_dir / "Thumbnail.jpg",
                source_dir / "thumbnail.jpg",
                source_dir / "adobe.jpg",
                source_dir / "2048x1424.jpg",
            ]
        )
    preview_dir = product_dir / "Preview files"
    candidates.extend(
        [
            preview_dir / "Thumbnail.jpg",
            preview_dir / "thumbnail.jpg",
            preview_dir / "adobe.jpg",
            preview_dir / "2048x1424.jpg",
            preview_dir / "t.jpg",
        ]
    )
    if source_dir:
        candidates.extend(sorted(source_dir.rglob("Thumbnail.jpg"), key=natural_key))
        candidates.extend(sorted(source_dir.rglob("thumbnail.jpg"), key=natural_key))
        candidates.extend(sorted(source_dir.rglob("adobe.jpg"), key=natural_key))
        candidates.extend(sorted(source_dir.rglob("2048x1424.jpg"), key=natural_key))
    return [path for path in candidates if path.is_file() and is_jpg(path)]


def source_for_product(product_dir: Path) -> tuple[Path | None, list[Path]]:
    adobe_dir = product_dir / "Adobe"
    if adobe_dir.is_dir():
        adobe_images = numeric_jpgs(adobe_dir, recursive=True)
        if adobe_images:
            return adobe_dir, adobe_images

    preview_dir = product_dir / "Preview files"
    if preview_dir.is_dir():
        preview_images = numeric_jpgs(preview_dir, recursive=False)
        if preview_images:
            return preview_dir, preview_images

    return None, []


def thumbnail_digest_map(output_root: Path) -> dict[str, Path]:
    mappings: dict[str, Path] = {}
    if not output_root.is_dir():
        return mappings
    for thumbnail in output_root.glob("*/Thumbnail.jpg"):
        mappings[file_digest(thumbnail)] = thumbnail.parent
    return mappings


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rows_for_count(count: int) -> list[int]:
    if count <= 0:
        return []
    if count == 1:
        return [1]
    if count == 2:
        return [1, 1]
    if count == 3:
        return [1, 1, 1]
    if count == 4:
        return [1, 1, 1, 1]
    if count == 5:
        return [1, 2, 1, 1]
    return [1, 2, 1, 2]


def image_stats(path: Path) -> tuple[float, float, float]:
    with Image.open(path) as image:
        grayscale = image.convert("L").resize((128, 128), Image.Resampling.LANCZOS)
        stat = ImageStat.Stat(grayscale)
        brightness = stat.mean[0]
        contrast = stat.stddev[0]
        histogram = grayscale.histogram()
        dark_pixels = sum(histogram[:50])
        dark_ratio = dark_pixels / (128 * 128)
    return brightness, contrast, dark_ratio


def select_grid_images(images: list[Path]) -> tuple[list[Path], str | None]:
    if len(images) <= MAX_GRID_IMAGES:
        return images, None

    stats = {image: image_stats(image) for image in images}
    selected = [images[0]]
    remaining = images[1:]

    while remaining and len(selected) < MAX_GRID_IMAGES:
        scored = []
        for index, image in enumerate(remaining):
            brightness, contrast, dark_ratio = stats[image]
            variety = min(
                abs(brightness - stats[chosen][0]) * 0.35
                + abs(contrast - stats[chosen][1]) * 0.45
                + abs(dark_ratio - stats[chosen][2]) * 120
                for chosen in selected
            )
            strength = contrast * 0.6 + dark_ratio * 120
            early_bias = max(0, 18 - index * 2)
            scored.append((variety + strength + early_bias, image))

        _, chosen = max(scored, key=lambda item: item[0])
        selected.append(chosen)
        remaining.remove(chosen)

    selected = sorted(selected, key=natural_key)
    selected_names = ", ".join(path.name for path in selected)
    skipped_names = ", ".join(path.name for path in images if path not in selected)
    return selected, (
        f"selected {selected_names} from {len(images)} numbered images; "
        f"skipped {skipped_names}"
    )


def rhythm_ordered_images(images: list[Path]) -> tuple[list[Path], str | None]:
    if len(images) < 3:
        return images, None

    first = images[0]
    second = images[1]
    first_brightness, _, _ = image_stats(first)
    second_brightness, _, second_dark_ratio = image_stats(second)

    # If the first two slides are both pale, bring an obvious darker/demo slide
    # forward so the grid reads with stronger contrast near the top.
    if first_brightness < 145 or second_brightness < 145 or second_dark_ratio > 0.12:
        return images, None

    candidates = []
    for index, image in enumerate(images[2:], start=2):
        brightness, contrast, dark_ratio = image_stats(image)
        if brightness <= second_brightness - 45 or dark_ratio >= 0.20:
            candidates.append((index, brightness, -contrast, image))

    if not candidates:
        return images, None

    index, _, _, image = min(candidates)
    reordered = images[:]
    reordered.pop(index)
    reordered.insert(1, image)
    return reordered, f"moved {image.name} to position 2 for grid contrast"


def ordered_grid_images(images: list[Path], output_dir: Path) -> tuple[list[Path], str | None]:
    images, selection_note = select_grid_images(images)
    order = GRID_ORDER_OVERRIDES.get(output_dir.name)
    if not order:
        images, rhythm_note = rhythm_ordered_images(images)
        note = "; ".join(note for note in [selection_note, rhythm_note] if note)
        return images, note or None

    by_number = {int(path.stem): path for path in images if path.stem.isdigit()}
    ordered = [by_number[number] for number in order if number in by_number]
    ordered.extend(path for path in images if path not in ordered)
    order_note = f"used script ordering override: {', '.join(path.name for path in ordered)}"
    note = "; ".join(note for note in [selection_note, order_note] if note)
    return ordered[: len(images)], note or None


def fit_to_box(image: Image.Image, width: int, height: int) -> Image.Image:
    image = image.convert("RGB")
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    return image


def grid_height_for_images(images: list[Image.Image]) -> int:
    rows = rows_for_count(len(images))

    row_images: list[list[Image.Image]] = []
    index = 0
    for column_count in rows:
        row_images.append(images[index : index + column_count])
        index += column_count

    row_sizes: list[tuple[int, int, list[Image.Image]]] = []
    for row in row_images:
        column_count = len(row)
        column_width = (CANVAS_WIDTH - GUTTER * (column_count - 1)) // column_count
        fitted = []
        heights = []
        for image in row:
            width, height = image.size
            fitted_height = round(height * (column_width / width))
            fitted_image = fit_to_box(image, column_width, fitted_height)
            fitted.append(fitted_image)
            heights.append(fitted_image.height)
        row_sizes.append((column_width, max(heights), fitted))

    canvas_height = sum(row_height for _, row_height, _ in row_sizes)
    canvas_height += GUTTER * max(0, len(row_sizes) - 1)
    return canvas_height


def fit_grid_height(image_paths: list[Path]) -> tuple[list[Path], str | None]:
    fitted_paths = image_paths[:]
    removed: list[Path] = []

    while len(fitted_paths) > 1:
        with_images = [Image.open(path).convert("RGB") for path in fitted_paths]
        height = grid_height_for_images(with_images)
        for image in with_images:
            image.close()
        if height <= MAX_CANVAS_HEIGHT:
            if not removed:
                return fitted_paths, None
            removed_names = ", ".join(path.name for path in removed)
            return fitted_paths, f"removed {removed_names} to keep height under {MAX_CANVAS_HEIGHT}px"

        removed.append(fitted_paths.pop())

    return fitted_paths, "reduced grid to one image to keep height under limit"


def build_grid(image_paths: list[Path], output_path: Path) -> None:
    images = [Image.open(path).convert("RGB") for path in image_paths]
    rows = rows_for_count(len(images))

    row_images: list[list[Image.Image]] = []
    index = 0
    for column_count in rows:
        row_images.append(images[index : index + column_count])
        index += column_count

    row_sizes: list[tuple[int, int, list[Image.Image]]] = []
    for row in row_images:
        column_count = len(row)
        column_width = (CANVAS_WIDTH - GUTTER * (column_count - 1)) // column_count
        fitted = []
        heights = []
        for image in row:
            width, height = image.size
            fitted_height = round(height * (column_width / width))
            fitted_image = fit_to_box(image, column_width, fitted_height)
            fitted.append(fitted_image)
            heights.append(fitted_image.height)
        row_sizes.append((column_width, max(heights), fitted))

    canvas_height = sum(row_height for _, row_height, _ in row_sizes)
    canvas_height += GUTTER * max(0, len(row_sizes) - 1)

    canvas = Image.new("RGB", (CANVAS_WIDTH, canvas_height), BACKGROUND)
    y = 0
    for column_width, row_height, fitted in row_sizes:
        x = 0
        for image in fitted:
            offset_x = x + (column_width - image.width) // 2
            offset_y = y + (row_height - image.height) // 2
            canvas.paste(image, (offset_x, offset_y))
            x += column_width + GUTTER
        y += row_height + GUTTER

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, "JPEG", quality=QUALITY, optimize=True)


def product_dirs(batch_dir: Path) -> list[Path]:
    return sorted(
        [
            path
            for path in batch_dir.iterdir()
            if path.is_dir() and path.name.lower() != "adobe"
        ],
        key=natural_key,
    )


def output_for_source(
    product_dir: Path,
    source_dir: Path | None,
    output_root: Path,
    digest_map: dict[str, Path],
) -> Path:
    if source_dir:
        for thumbnail in thumbnail_candidates(product_dir, source_dir):
            matched_output = digest_map.get(file_digest(thumbnail))
            if matched_output:
                return matched_output
    return output_root / clean_product_name(product_dir)


def prepare_product(
    product_dir: Path,
    output_root: Path,
    digest_map: dict[str, Path],
    source_override: Path | None = None,
) -> ProductResult:
    if source_override:
        source_dir = source_override
        grid_images = numeric_jpgs(source_dir, recursive=False)
    else:
        source_dir, grid_images = source_for_product(product_dir)
    output_dir = output_for_source(product_dir, source_dir, output_root, digest_map)
    grid_images, selection_note = ordered_grid_images(grid_images, output_dir)
    grid_images, height_note = fit_grid_height(grid_images)
    selection_note = "; ".join(
        note for note in [selection_note, height_note] if note
    ) or None
    thumbnails = thumbnail_candidates(product_dir, source_dir)
    errors = []
    warnings = []
    if not grid_images:
        errors.append("no numbered JPGs found for Preview1.jpg")
    if not thumbnails:
        errors.append("no Thumbnail.jpg or t.jpg source found")
    return ProductResult(
        product=product_dir,
        source=source_dir,
        output=output_dir,
        grid_images=grid_images,
        thumbnail_source=thumbnails[0] if thumbnails else None,
        errors=errors,
        warnings=warnings,
        selection_note=selection_note,
    )


def prepare_products(
    product_dir: Path,
    output_root: Path,
    digest_map: dict[str, Path],
) -> list[ProductResult]:
    adobe_dir = product_dir / "Adobe"
    if adobe_dir.is_dir():
        variant_dirs = [
            child
            for child in sorted(adobe_dir.iterdir(), key=natural_key)
            if child.is_dir() and numeric_jpgs(child, recursive=False)
        ]
        if variant_dirs:
            return [
                prepare_product(product_dir, output_root, digest_map, child)
                for child in variant_dirs
            ]

    return [prepare_product(product_dir, output_root, digest_map)]

def result_to_log(batch_dir: Path, result: ProductResult) -> dict:
    def rel(path: Path | None) -> str | None:
        return str(path.relative_to(batch_dir)) if path else None

    return {
        "product": result.product.name,
        "source": rel(result.source),
        "output": rel(result.output),
        "preview1": rel(result.output / "Preview1.jpg"),
        "thumbnail": rel(result.output / "Thumbnail.jpg"),
        "gridImages": [rel(path) for path in result.grid_images],
        "thumbnailSource": rel(result.thumbnail_source),
        "selectionNote": result.selection_note,
        "errors": result.errors,
        "warnings": result.warnings,
    }


def write_report(batch_dir: Path, results: list[ProductResult], report_path: Path) -> None:
    existing = {}
    if report_path.exists():
        existing = json.loads(report_path.read_text(encoding="utf-8"))

    preview_errors = [
        {
            "step": "preview1",
            "product": result.product.name,
            "output": result_to_log(batch_dir, result)["output"],
            "message": error,
        }
        for result in results
        for error in result.errors
    ]
    existing_errors = [
        error for error in existing.get("errors", []) if error.get("step") != "preview1"
    ]

    report = {
        **existing,
        "batch": batch_dir.name,
        "reportType": "full-batch-automation",
        "dropboxFolder": "/Pixelbuddha/Products/Adobe Stock Automation",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "errors": existing_errors + preview_errors,
        "preview1": {
            "status": "completed"
            if not any(result.errors for result in results)
            else "failed",
            "results": [result_to_log(batch_dir, result) for result in results],
        },
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def run(batch_dir: Path, dry_run: bool, report_path: Path | None) -> int:
    output_root = batch_dir / "Adobe"
    digest_map = thumbnail_digest_map(output_root)
    results = [
        result
        for product in product_dirs(batch_dir)
        for result in prepare_products(product, output_root, digest_map)
    ]

    for result in results:
        print(f"\n{result.product.name}")
        print(f"  source: {result.source or 'missing'}")
        print(f"  output: {result.output}")
        print("  grid:")
        for image in result.grid_images:
            print(f"    - {image.relative_to(batch_dir)}")
        print(f"  thumbnail: {result.thumbnail_source or 'missing'}")
        if result.selection_note:
            print(f"  note: {result.selection_note}")
        for error in result.errors:
            print(f"  error: {error}")
        for warning in result.warnings:
            print(f"  warning: {warning}")

        if dry_run or result.errors:
            continue

        result.output.mkdir(parents=True, exist_ok=True)
        build_grid(result.grid_images, result.output / "Preview1.jpg")
        shutil.copy2(result.thumbnail_source, result.output / "Thumbnail.jpg")

    if report_path:
        write_report(batch_dir, results, report_path)
        print(f"\nWrote report: {report_path}")

    return 1 if any(result.errors for result in results) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Build final listing Preview1.jpg grids.")
    parser.add_argument("batch", type=Path, help="Batch folder, e.g. Batch220526")
    parser.add_argument("--dry-run", action="store_true", help="Report only; write no files.")
    parser.add_argument("--report", type=Path, help="Write a JSON batch report.")
    args = parser.parse_args()

    if not args.batch.is_dir():
        parser.error(f"Batch folder does not exist: {args.batch}")
    return run(args.batch, args.dry_run, args.report)


if __name__ == "__main__":
    raise SystemExit(main())
