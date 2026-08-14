#!/usr/bin/env python3
"""Convert a raw iBid course export into the site's classes.json schema.

Usage:
    python convert.py --input "Course List.xlsx"
    python convert.py --input "Course List.xlsx" --mapping mappings/concentration_requirements.csv

The raw export has one row per course section, with columns:
Quarter, Title, Course, Program, Faculty, Schedule, Capacity, Building, Location, Units

Two columns need to be split, and can each fan a single row out into multiple
class records (all other fields identical):

- Faculty: one or more instructors joined by " and " (e.g. "Anna Costello and
  Michael Minnis"). Each becomes its own record, with the name further split
  into professorFirstName / professorLastName.
- Schedule: a "Day, Time" pair, or two such pairs back-to-back for
  twice-a-week classes (e.g. "Monday, 10:10 AM - 11:30 AM Wednesday, 10:10 AM
  - 11:30 AM"). Each day/time pair becomes its own record. A schedule of
  "TBD" produces a record with empty day/time.

A row with 2 faculty and 2 schedule segments therefore expands into 4 records
(the cross product) — one per faculty/schedule combination.
"""

import argparse
import itertools
import json
import re
import sys
from pathlib import Path

import pandas as pd

SCHEDULE_SEGMENT_RE = re.compile(
    r"(?P<day>[A-Za-z]+),\s*(?P<time>\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)"
)


def split_faculty(raw: str) -> list[str]:
    if not isinstance(raw, str) or not raw.strip():
        return [""]
    return [name.strip() for name in raw.split(" and ") if name.strip()]


def split_name(full_name: str) -> tuple[str, str]:
    parts = full_name.split(None, 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    if len(parts) == 1:
        return parts[0], ""
    return "", ""


def split_schedule(raw: str) -> list[tuple[str, str]]:
    """Return a list of (day, time) tuples. Empty tuple pair for TBD/unparsed."""
    if not isinstance(raw, str) or not raw.strip():
        return [("", "")]
    matches = SCHEDULE_SEGMENT_RE.findall(raw)
    if not matches:
        return [("", "")]
    return [(day, re.sub(r"\s+", " ", time).strip()) for day, time in matches]


def normalize_course_number(course: str) -> str:
    """'30000-01' -> '30000' — the base course number, without section suffix."""
    return str(course).split("-")[0].strip()


def load_mapping(path: Path | None) -> dict[str, dict[str, list[str]]]:
    """Load a manual courseNumber -> concentrations/requirementTypes mapping.

    Expected CSV columns: courseNumber, concentrations, requirementTypes
    where concentrations/requirementTypes are semicolon-separated lists.
    """
    if path is None or not path.exists():
        return {}
    df = pd.read_csv(path, dtype=str).fillna("")
    mapping: dict[str, dict[str, list[str]]] = {}
    for _, row in df.iterrows():
        course_number = row["courseNumber"].strip()
        mapping[course_number] = {
            "concentrations": [v.strip() for v in row.get("concentrations", "").split(";") if v.strip()],
            "requirementTypes": [v.strip() for v in row.get("requirementTypes", "").split(";") if v.strip()],
        }
    return mapping


def convert(input_path: Path, mapping_path: Path | None) -> list[dict]:
    raw_df = pd.read_excel(input_path) if input_path.suffix.lower() in (".xlsx", ".xls") else pd.read_csv(input_path)
    mapping = load_mapping(mapping_path)

    required_cols = ["Quarter", "Title", "Course", "Program", "Faculty", "Schedule", "Capacity", "Building", "Location", "Units"]
    missing = [c for c in required_cols if c not in raw_df.columns]
    if missing:
        print(f"Warning: expected columns not found in export: {missing}", file=sys.stderr)

    records = []
    for _, row in raw_df.iterrows():
        course = str(row.get("Course", "")).strip()
        course_number = normalize_course_number(course)
        faculty_names = split_faculty(row.get("Faculty", ""))
        schedule_slots = split_schedule(row.get("Schedule", ""))

        extra = mapping.get(course_number, {"concentrations": [], "requirementTypes": []})

        for faculty_name, (day, time) in itertools.product(faculty_names, schedule_slots):
            first_name, last_name = split_name(faculty_name)
            records.append(
                {
                    "quarter": str(row.get("Quarter", "")).strip(),
                    "title": str(row.get("Title", "")).strip(),
                    "course": course,
                    "courseNumber": course_number,
                    "program": str(row.get("Program", "")).strip(),
                    "professorFirstName": first_name,
                    "professorLastName": last_name,
                    "day": day,
                    "time": time,
                    "capacity": str(row.get("Capacity", "")).strip(),
                    "building": str(row.get("Building", "")).strip() if pd.notna(row.get("Building")) else "",
                    "location": str(row.get("Location", "")).strip() if pd.notna(row.get("Location")) else "",
                    "units": float(row.get("Units", 0)) if str(row.get("Units", "")).strip() else 0,
                    "concentrations": extra["concentrations"],
                    "requirementTypes": extra["requirementTypes"],
                }
            )

    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", required=True, type=Path, help="Path to raw iBid export (.csv or .xlsx)")
    parser.add_argument(
        "--mapping",
        type=Path,
        default=Path(__file__).parent / "mappings" / "concentration_requirements.csv",
        help="Path to courseNumber -> concentrations/requirementTypes mapping CSV",
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
