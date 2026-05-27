#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


REQUIRED_FILES = ("Thumbnail.jpg", "Preview1.jpg")
IGNORED_NAMES = {".DS_Store"}


@dataclass
class ZipResult:
    listing: Path
    zip_path: Path
    files: list[Path]
    errors: list[str]


def rel_to_batch(batch_dir: Path, path: Path) -> str:
    return str(path.relative_to(batch_dir))


def listing_dirs(batch_dir: Path) -> list[Path]:
    adobe_dir = batch_dir / "Adobe"
    if not adobe_dir.is_dir():
        return []
    return sorted(
        [
            path
            for path in adobe_dir.iterdir()
            if path.is_dir() and not path.name.startswith(".")
        ],
        key=lambda path: path.name.lower(),
    )


def listing_files(listing_dir: Path) -> list[Path]:
    return sorted(
        [
            path
            for path in listing_dir.rglob("*")
            if path.is_file() and path.name not in IGNORED_NAMES
        ],
        key=lambda path: str(path.relative_to(listing_dir)).lower(),
    )


def validate_listing(listing_dir: Path) -> list[str]:
    errors: list[str] = []
    for required in REQUIRED_FILES:
        if not (listing_dir / required).is_file():
            errors.append(f"missing required file: {required}")

    psdt_files = list(listing_dir.glob("*.PSDT"))
    if len(psdt_files) != 1:
        errors.append(f"expected exactly one PSDT file, found {len(psdt_files)}")

    return errors


def prepare_result(batch_dir: Path, listing_dir: Path) -> ZipResult:
    zip_path = batch_dir / "Adobe" / f"{listing_dir.name}.zip"
    return ZipResult(
        listing=listing_dir,
        zip_path=zip_path,
        files=listing_files(listing_dir),
        errors=validate_listing(listing_dir),
    )


def create_zip(result: ZipResult) -> None:
    with zipfile.ZipFile(result.zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in result.files:
            archive.write(file_path, file_path.relative_to(result.listing.parent))


def result_to_log(batch_dir: Path, result: ZipResult) -> dict:
    return {
        "listing": rel_to_batch(batch_dir, result.listing),
        "zip": rel_to_batch(batch_dir, result.zip_path),
        "files": [rel_to_batch(batch_dir, path) for path in result.files],
        "errors": result.errors,
    }


def write_report(batch_dir: Path, results: list[ZipResult], report_path: Path) -> None:
    existing = {}
    if report_path.exists():
        existing = json.loads(report_path.read_text(encoding="utf-8"))

    packaging_errors = [
        {
            "stage": "finalPackaging",
            "listing": rel_to_batch(batch_dir, result.listing),
            "output": rel_to_batch(batch_dir, result.zip_path),
            "message": error,
        }
        for result in results
        for error in result.errors
    ]
    existing_errors = [
        error
        for error in existing.get("errors", [])
        if error.get("stage") != "finalPackaging"
        and error.get("step") != "finalPackaging"
    ]
    stages = existing.get("stages", {})
    stages["finalPackaging"] = {
        "operation": "zip-final-listings",
        "status": "completed" if not packaging_errors else "failed",
        "results": [result_to_log(batch_dir, result) for result in results],
    }
    errors = existing_errors + packaging_errors
    warnings = existing.get("warnings", [])
    artifacts = existing.get("artifacts", {})
    artifacts["finalZips"] = [rel_to_batch(batch_dir, result.zip_path) for result in results]
    summary = existing.get("summary", {})
    summary.update(
        {
            "finalZips": sum(1 for result in results if result.zip_path.exists()),
            "errors": len(errors),
            "warnings": len(warnings),
        }
    )

    report = {
        **{
            key: value
            for key, value in existing.items()
            if key not in {"preview1", "step3", "finalPackaging", "metadataCsv"}
        },
        "reportVersion": existing.get("reportVersion", "1.0"),
        "reportType": "pixelbuddha-adobe-stock-batch",
        "batch": batch_dir.name,
        "status": "failed" if errors else existing.get("status", "partial"),
        "dropboxFolder": "/Pixelbuddha/Products/Adobe Stock Automation",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "paths": {
            **existing.get("paths", {}),
            "batchRoot": batch_dir.name,
            "adobeRoot": "Adobe",
            "canonicalReport": str(report_path.relative_to(batch_dir)),
        },
        "summary": summary,
        "stages": stages,
        "artifacts": artifacts,
        "warnings": warnings,
        "errors": errors,
        "legacyReportsAbsorbed": existing.get("legacyReportsAbsorbed", []),
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def run(batch_dir: Path, dry_run: bool, report_path: Path | None) -> int:
    results = [prepare_result(batch_dir, listing) for listing in listing_dirs(batch_dir)]

    for result in results:
        print(f"\n{result.listing.name}")
        print(f"  zip: {result.zip_path}")
        print("  files:")
        for file_path in result.files:
            print(f"    - {file_path.relative_to(batch_dir)}")
        for error in result.errors:
            print(f"  error: {error}")

        if dry_run or result.errors:
            continue
        create_zip(result)

    if report_path:
        write_report(batch_dir, results, report_path)
        print(f"\nWrote report: {report_path}")

    return 1 if any(result.errors for result in results) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="ZIP final Adobe listing folders after Step 4 metadata naming.")
    parser.add_argument("batch", type=Path, help="Batch folder, e.g. Batch220526")
    parser.add_argument("--dry-run", action="store_true", help="Report only; write no ZIPs.")
    parser.add_argument("--report", type=Path, help="Update the full batch JSON report.")
    args = parser.parse_args()

    if not args.batch.is_dir():
        parser.error(f"Batch folder does not exist: {args.batch}")

    return run(args.batch, args.dry_run, args.report)


if __name__ == "__main__":
    raise SystemExit(main())
