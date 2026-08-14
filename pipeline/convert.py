#!/usr/bin/env python3
"""Convert a raw iBid course export into the site's classes.json schema.

Usage:
    python convert.py --input raw_export.xlsx --output ../frontend/public/data/classes.json
    python convert.py --input raw_export.xlsx --mapping mappings/concentration_requirements.csv

The column names in COLUMN_MAP are placeholders — no sample iBid export has
been seen yet. Update COLUMN_MAP to match the real export's headers once one
is available.
"""

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd

# Map iBid export column names -> schema field names. Adjust once a real
# export is available.
COLUMN_MAP = {
    "Course": "courseId",
    "Course Title": "title",
    "Instructor": "instructor",
    "Quarter": "quarter",
    "Units": "units",
    "Days": "days",
    "Time": "time",
    "Description": "description",
}

# iBid commonly encodes meeting days as concatenated two-letter codes
# (e.g. "MW", "TuTh"). Longest codes are matched first to avoid ambiguity
# between "T" (Tue) and "Th" (Thu).
DAY_CODES = [
    ("Mon", "Mon"),
    ("Tue", "Tue"),
    ("Wed", "Wed"),
    ("Thu", "Thu"),
    ("Fri", "Fri"),
    ("Sat", "Sat"),
    ("Sun", "Sun"),
    ("Th", "Thu"),
    ("Tu", "Tue"),
    ("M", "Mon"),
    ("W", "Wed"),
    ("F", "Fri"),
]


def parse_days(raw: str) -> list[str]:
    if not isinstance(raw, str) or not raw.strip():
        return []
    remaining = raw.strip()
    days: list[str] = []
    while remaining:
        for code, name in DAY_CODES:
            if remaining.startswith(code):
                days.append(name)
                remaining = remaining[len(code):]
                break
        else:
            # Unrecognized character — skip it rather than looping forever.
            remaining = remaining[1:]
    # De-dupe while preserving order.
    seen = set()
    ordered = []
    for d in days:
        if d not in seen:
            seen.add(d)
            ordered.append(d)
    return ordered


def load_raw(path: Path) -> pd.DataFrame:
    if path.suffix.lower() in (".xlsx", ".xls"):
        return pd.read_excel(path)
    return pd.read_csv(path)


def load_mapping(path: Path | None) -> dict[str, dict[str, list[str]]]:
    """Load a manual courseId -> concentrations/requirementTypes mapping.

    Expected CSV columns: courseId, concentrations, requirementTypes
    where concentrations/requirementTypes are semicolon-separated lists.
    """
    if path is None or not path.exists():
        return {}
    df = pd.read_csv(path, dtype=str).fillna("")
    mapping: dict[str, dict[str, list[str]]] = {}
    for _, row in df.iterrows():
        course_id = row["courseId"].strip()
        mapping[course_id] = {
            "concentrations": [v.strip() for v in row.get("concentrations", "").split(";") if v.strip()],
            "requirementTypes": [v.strip() for v in row.get("requirementTypes", "").split(";") if v.strip()],
        }
    return mapping


def normalize_course_id(raw: str) -> str:
    return re.sub(r"\s+", "", str(raw)).upper()


def convert(input_path: Path, mapping_path: Path | None) -> list[dict]:
    raw_df = load_raw(input_path)
    mapping = load_mapping(mapping_path)

    missing = [col for col in COLUMN_MAP if col not in raw_df.columns]
    if missing:
        print(
            f"Warning: expected columns not found in export: {missing}. "
            "Update COLUMN_MAP in convert.py to match the real export headers.",
            file=sys.stderr,
        )

    records = []
    for _, row in raw_df.iterrows():
        record = {}
        for raw_col, field in COLUMN_MAP.items():
            record[field] = row.get(raw_col, "")

        course_id = normalize_course_id(record.get("courseId", ""))
        record["courseId"] = course_id
        record["units"] = float(record["units"]) if str(record.get("units", "")).strip() else 0
        record["days"] = parse_days(record.get("days", ""))
        record["description"] = str(record.get("description", "")).strip()

        extra = mapping.get(course_id, {"concentrations": [], "requirementTypes": []})
        record["concentrations"] = extra["concentrations"]
        record["requirementTypes"] = extra["requirementTypes"]

        records.append(record)

    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Path to raw iBid export (.csv or .xlsx)")
    parser.add_argument(
        "--mapping",
        type=Path,
        default=Path(__file__).parent / "mappings" / "concentration_requirements.csv",
        help="Path to courseId -> concentrations/requirementTypes mapping CSV",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent.parent / "frontend" / "public" / "data" / "classes.json",
        help="Path to write the resulting classes.json",
    )
    args = parser.parse_args()

    records = convert(args.input, args.mapping)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(records, indent=2))
    print(f"Wrote {len(records)} classes to {args.output}")


if __name__ == "__main__":
    main()
