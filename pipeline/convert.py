#!/usr/bin/env python3
"""Convert a raw iBid course export and merge it into the master class list.

Usage:
    python convert.py --input "Course List.xlsx"
    python convert.py --input "Course List.xlsx" --mapping mappings/concentration_requirements.csv

Each run's converted records are merged into data/master_classes.json — the
accumulated set of every class ever exported, across terms — rather than
replacing it. A record's (course, quarter, day, time, professorFirstName,
professorLastName) identifies a specific offering: re-running convert.py
with a fresher export of a term already in the master list updates those
records in place (e.g. room changes); offerings from terms not
present in the new export are left untouched. frontend/public/data/classes.json
is then (re)written from the full merged master list. Pass --no-merge to
skip this and treat --input as the complete dataset instead.

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

Each record's end time also determines its "timing" bucket: "Morning" (ends
by noon), "Afternoon" (ends by 8pm), or "Evening" (ends after 8pm). Empty for
TBD/unparsed schedules.

Each class is also tagged with its specific Foundations or FLMBE area (e.g.
"Statistics", "Marketing") via courseNumber lookup in
mappings/requirement_types.csv (built by build_requirement_mapping.py from
Booth's Degree Requirements page) — stored as foundationsArea/flmbeArea, with
at most one of the two set. Courses not found there are Electives: both
fields stay empty, since that requirement has no explicit course list on the
page.

If data/evaluations.json exists (built by build_evaluations.py from a raw
course evaluation export), each class also gets an "evaluation" object with
aggregated rating scores, looked up by courseNumber + instructor name. This
is applied to the *entire* merged master list on every run, not just newly
converted records, so refreshing evaluations.json updates historical
offerings too. Classes with no evaluation match get "evaluation": null.
"""

import argparse
import itertools
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

import pandas as pd


def strip_accents(text: str) -> str:
    """'Dubé' -> 'Dube' — so accented and unaccented spellings of the same
    name match each other."""
    return "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))

SCHEDULE_SEGMENT_RE = re.compile(
    r"(?P<day>[A-Za-z]+),\s*(?P<time>\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)"
)
END_TIME_RE = re.compile(r"-\s*(\d{1,2}:\d{2}\s*[AP]M)\s*$")


def compute_timing(time_range: str) -> str:
    """Bucket a class by when it ends: Morning (by noon), Afternoon (by 8pm),
    or Evening (after 8pm). Empty for unparsed/TBD times.
    """
    match = END_TIME_RE.search(time_range.strip()) if time_range else None
    if not match:
        return ""
    end_time = datetime.strptime(match.group(1).replace(" ", ""), "%I:%M%p").time()
    if end_time <= datetime.strptime("12:00PM", "%I:%M%p").time():
        return "Morning"
    if end_time <= datetime.strptime("8:00PM", "%I:%M%p").time():
        return "Afternoon"
    return "Evening"


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


def normalize_building(raw) -> str:
    value = str(raw).strip() if pd.notna(raw) else ""
    return value or "TBA/Remote"


def load_concentration_mapping(path: Path | None) -> dict[str, list[str]]:
    """Load a manual courseNumber -> concentrations mapping.

    Expected CSV columns: courseNumber, concentrations
    where concentrations is a semicolon-separated list.
    """
    if path is None or not path.exists():
        return {}
    df = pd.read_csv(path, dtype=str).fillna("")
    mapping: dict[str, list[str]] = {}
    for _, row in df.iterrows():
        course_number = row["courseNumber"].strip()
        mapping[course_number] = [v.strip() for v in row.get("concentrations", "").split(";") if v.strip()]
    return mapping


def load_requirement_mapping(path: Path | None) -> dict[str, tuple[str, str]]:
    """Load the courseNumber -> (requirementType, area) mapping built by
    build_requirement_mapping.py. Expected CSV columns: courseNumber,
    requirementType, area.
    """
    if path is None or not path.exists():
        return {}
    df = pd.read_csv(path, dtype=str).fillna("")
    return {row["courseNumber"].strip(): (row["requirementType"].strip(), row["area"].strip()) for _, row in df.iterrows()}


NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def last_name_tokens(last_name: str) -> list[str]:
    """Split a last name into tokens, dropping trailing generational suffixes
    (e.g. "Pagliari Jr." -> ["Pagliari"], not ["Pagliari", "Jr."]) so they
    don't get mistaken for the surname itself.
    """
    tokens = strip_accents(str(last_name)).strip().split()
    while tokens and tokens[-1].lower().rstrip(".") in NAME_SUFFIXES:
        tokens.pop()
    return tokens


def normalize_eval_last_name(last_name: str) -> str:
    tokens = last_name_tokens(last_name)
    return tokens[-1].lower() if tokens else ""


def eval_key(course_number: str, last_name: str) -> str:
    return f"{course_number}|{normalize_eval_last_name(last_name)}"


def load_name_aliases(path: Path | None) -> dict[str, set[str]]:
    """Load a manual name-discrepancy map (marriage names, inconsistent
    accents/hyphenation the automatic normalization doesn't catch, etc).

    Expected CSV columns: nameA, nameB — each row is a pair of last names
    known to refer to the same instructor. Returns a symmetric
    normalizedLastName -> {other known variants} map.
    """
    if path is None or not path.exists():
        return {}
    df = pd.read_csv(path, dtype=str).fillna("")
    aliases: dict[str, set[str]] = {}
    for _, row in df.iterrows():
        a, b = normalize_eval_last_name(row["nameA"]), normalize_eval_last_name(row["nameB"])
        if not a or not b:
            continue
        aliases.setdefault(a, set()).add(b)
        aliases.setdefault(b, set()).add(a)
    return aliases


def eval_key_candidates(course_number: str, last_name: str, aliases: dict[str, set[str]] | None = None) -> list[str]:
    """Primary key first, plus fallbacks for known name discrepancies:

    - Just the part after the last hyphen for hyphenated last names (e.g.
      "Riggs-Cragun" -> "Cragun"), since the two datasets aren't consistent
      about which half of a hyphenated name they use.
    - For a space-separated compound surname (e.g. "Almagro Garcia"), the
      *first* word too (e.g. "Almagro") — one dataset sometimes gives only
      the first part of a compound last name where the other gives the full
      thing. (The primary key already covers the last word.)
    - Any variants listed in the manual alias map (marriage names, etc).
    """
    tokens = last_name_tokens(last_name)
    variants = {normalize_eval_last_name(last_name)}
    if tokens and "-" in tokens[-1]:
        variants.add(normalize_eval_last_name(tokens[-1].rsplit("-", 1)[-1]))
    if len(tokens) > 1:
        variants.add(tokens[0].lower())
    for variant in list(variants):
        variants |= (aliases or {}).get(variant, set())
    return [f"{course_number}|{v}" for v in variants]


def load_evaluations(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def attach_evaluations(records: list[dict], evaluations: dict[str, dict], aliases: dict[str, set[str]] | None = None) -> None:
    """Mutates records in place, setting record["evaluation"]."""
    for record in records:
        record["evaluation"] = next(
            (evaluations[key] for key in eval_key_candidates(record["courseNumber"], record["professorLastName"], aliases) if key in evaluations),
            None,
        )


def record_key(record: dict) -> tuple:
    """Identifies a specific class offering, for merging into the master list."""
    return (
        record["course"],
        record["quarter"],
        record["day"],
        record["time"],
        record["professorFirstName"],
        record["professorLastName"],
    )


def load_master(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return json.loads(path.read_text())


def merge_records(master_records: list[dict], new_records: list[dict]) -> list[dict]:
    """New records overwrite any existing record with the same key (e.g. a
    re-exported term whose room changed); everything else in the
    master list is left untouched, and unmatched new records are appended.
    """
    merged = {record_key(r): r for r in master_records}
    for record in new_records:
        merged[record_key(record)] = record
    return sorted(merged.values(), key=lambda r: (r["quarter"], r["courseNumber"], r["course"], r["day"], r["time"]))


def convert(input_path: Path, concentration_mapping_path: Path | None, requirement_mapping_path: Path | None) -> list[dict]:
    raw_df = pd.read_excel(input_path) if input_path.suffix.lower() in (".xlsx", ".xls") else pd.read_csv(input_path)
    concentration_mapping = load_concentration_mapping(concentration_mapping_path)
    requirement_mapping = load_requirement_mapping(requirement_mapping_path)

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

        concentrations = concentration_mapping.get(course_number, [])
        requirement_type, requirement_area = requirement_mapping.get(course_number, ("", ""))
        foundations_area = requirement_area if requirement_type == "Foundations" else ""
        flmbe_area = requirement_area if requirement_type == "FLMBE" else ""

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
                    "timing": compute_timing(time),
                    "building": normalize_building(row.get("Building")),
                    "location": str(row.get("Location", "")).strip() if pd.notna(row.get("Location")) else "",
                    "units": float(row.get("Units", 0)) if str(row.get("Units", "")).strip() else 0,
                    "concentrations": concentrations,
                    "foundationsArea": foundations_area,
                    "flmbeArea": flmbe_area,
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
        help="Path to courseNumber -> concentrations mapping CSV",
    )
    parser.add_argument(
        "--requirement-mapping",
        type=Path,
        default=Path(__file__).parent / "mappings" / "requirement_types.csv",
        help="Path to courseNumber -> requirementType CSV (built by build_requirement_mapping.py)",
    )
    parser.add_argument(
        "--evaluations",
        type=Path,
        default=Path(__file__).parent / "data" / "evaluations.json",
        help="Path to the evaluation index CSV/JSON (built by build_evaluations.py)",
    )
    parser.add_argument(
        "--name-aliases",
        type=Path,
        default=Path(__file__).parent / "mappings" / "instructor_name_aliases.csv",
        help="Path to the manual last-name discrepancy map (marriage names, accents, etc)",
    )
    parser.add_argument(
        "--master",
        type=Path,
        default=Path(__file__).parent / "data" / "master_classes.json",
        help="Path to the accumulated master class list",
    )
    parser.add_argument(
        "--no-merge",
        action="store_true",
        help="Treat --input as the complete dataset instead of merging into --master",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent.parent / "frontend" / "public" / "data" / "classes.json",
        help="Path to write the resulting classes.json",
    )
    args = parser.parse_args()

    new_records = convert(args.input, args.mapping, args.requirement_mapping)

    if args.no_merge:
        merged_records = sorted(new_records, key=lambda r: (r["quarter"], r["courseNumber"], r["course"], r["day"], r["time"]))
    else:
        master_records = load_master(args.master)
        merged_records = merge_records(master_records, new_records)
        args.master.parent.mkdir(parents=True, exist_ok=True)
        args.master.write_text(json.dumps(merged_records, indent=2))
        print(f"Merged {len(new_records)} records from {args.input.name} into master ({len(merged_records)} total) -> {args.master}")

    evaluations = load_evaluations(args.evaluations)
    aliases = load_name_aliases(args.name_aliases)
    attach_evaluations(merged_records, evaluations, aliases)
    matched = sum(1 for r in merged_records if r["evaluation"] is not None)
    print(f"Matched evaluations for {matched} of {len(merged_records)} classes")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(merged_records, indent=2))
    print(f"Wrote {len(merged_records)} classes to {args.output}")


if __name__ == "__main__":
    main()
