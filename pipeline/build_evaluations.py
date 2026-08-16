#!/usr/bin/env python3
"""Build a courseNumber+instructor -> aggregated evaluation-score index from
a raw Booth course evaluation export.

Usage:
    python build_evaluations.py --input "Booth_MBA_Course_Evaluation_Data.xlsx"

The raw export has one row per (course section, term) evaluation, with a
"Course Name" like "33501 01" (course number + section) and separate
First Name / Last Name columns for the instructor.

Like convert.py's master class list, each run merges its rows into
data/master_evaluation_rows.json — the accumulated set of every evaluation
row ever exported — rather than replacing it. A row's (Course Name, Term,
instructor) identifies a specific section+term+instructor evaluation (a
co-taught section gets one row per instructor, sharing the same Course
Name/Term): re-uploading a file that includes a row already on file updates
it in place; nothing else is lost. The courseNumber+instructor aggregate index
(data/evaluations.json) is then fully recalculated from that complete
accumulated history on every run, so it's never stale or partial. Pass
--no-merge to instead treat --input as the complete row history.

A given course+instructor pair is typically evaluated across many sections
and terms, so rows are aggregated (respondent-weighted average of each
rating) into one entry per courseNumber+instructor.

Matching instructor names between this file and the course export is lossy:
the evaluation export uses full legal names (e.g. "Joao Pedro" / "Bacelar
Fernandes Granja") while the course export uses short display names (e.g.
"Joao" / "Granja") — first names in particular rarely agree. Matching is
done on courseNumber + last name's last word (e.g. "Granja") instead, since
that's where the two datasets actually agree. Scoping by courseNumber (not
just last name) keeps this safe: across the whole evaluation history there's
exactly one courseNumber+lastName pair taught by two different people (a
co-taught section), and merging their scores there is harmless since they
teach the identical sections anyway. This covers noticeably more instructors
than a first+last match would; it still can't recover an instructor who
isn't in the evaluation data at all.

Output is a JSON object keyed by "{courseNumber}|{normLastName}" for O(1)
lookup in convert.py.
"""

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

RATING_COLUMNS = {
    "Excluding class sessions, estimate the average number of hours per week spent in preparation or review. - Mean": "avgHoursPerWeek",
    "Overall, did the instructor convey the course material clearly? - Mean": "clarity",
    "Overall, did the instructor convey the course material in an interesting way? - Mean": "engagement",
    "Did you take away useful tools, concepts, and/or insights from this course? - Mean": "usefulness",
    "How much did you get out of this course? - Mean": "overallValue",
    "Would you recommend this course to other students? - Mean": "recommend",
}

REQUIRED_COLUMNS = ["Course Name", "First Name", "Last Name", "Term", "InvitedCount", "RespondentCount", *RATING_COLUMNS]


def normalize_last_name(last_name: str) -> str:
    last = str(last_name).strip().split()
    return last[-1].lower() if last else ""


def eval_key(course_number: str, last_name: str) -> str:
    return f"{course_number}|{normalize_last_name(last_name)}"


def row_key(row: dict) -> tuple:
    """Identifies a specific section+term+instructor evaluation, for merging into
    the master row list. Course Name + Term alone isn't unique — co-taught
    sections get one evaluation row per instructor.
    """
    return (row["Course Name"], row["Term"], row["First Name"], row["Last Name"])


def load_master_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return json.loads(path.read_text())


def merge_rows(master_rows: list[dict], new_rows: list[dict]) -> list[dict]:
    merged = {row_key(r): r for r in master_rows}
    for row in new_rows:
        merged[row_key(row)] = row
    return list(merged.values())


def read_rows(input_path: Path) -> list[dict]:
    df = pd.read_excel(input_path)
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        print(f"Warning: expected columns not found in export: {missing}", file=sys.stderr)
    # Cast numpy/pandas scalar types to native Python so rows stay JSON-safe
    # (and correctly typed on the *next* run, after a round-trip through disk).
    for col in df.select_dtypes(include="number").columns:
        df[col] = df[col].astype(float) if df[col].dtype.kind == "f" else df[col].astype(int)
    for col in df.select_dtypes(exclude="number").columns:
        df[col] = df[col].astype(str)
    return df.to_dict("records")


def build_index(rows: list[dict]) -> dict[str, dict]:
    df = pd.DataFrame(rows)
    df["courseNumber"] = df["Course Name"].astype(str).str.split().str[0]
    df["key"] = [eval_key(cn, l) for cn, l in zip(df["courseNumber"], df["Last Name"])]

    index: dict[str, dict] = {}
    for key, group in df.groupby("key"):
        weights = group["RespondentCount"].clip(lower=1)
        entry = {metric: round((group[col] * weights).sum() / weights.sum(), 2) for col, metric in RATING_COLUMNS.items()}
        entry["invitedCount"] = int(group["InvitedCount"].sum())
        entry["respondentCount"] = int(group["RespondentCount"].sum())
        entry["sectionsEvaluated"] = len(group)
        entry["mostRecentTerm"] = _latest_term(group["Term"])
        index[key] = entry

    return index


def _latest_term(terms: pd.Series) -> str:
    """Terms look like 'Autumn 2021' — sort by (year, season order)."""
    season_order = {"Winter": 0, "Spring": 1, "Summer": 2, "Autumn": 3}

    def sort_key(term: str) -> tuple[int, int]:
        parts = str(term).split()
        if len(parts) != 2 or not parts[1].isdigit():
            return (-1, -1)
        season, year = parts
        return (int(year), season_order.get(season, -1))

    return max(terms, key=sort_key)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", required=True, type=Path, help="Path to the raw course evaluation export (.xlsx)")
    parser.add_argument(
        "--master-rows",
        type=Path,
        default=Path(__file__).parent / "data" / "master_evaluation_rows.json",
        help="Path to the accumulated raw evaluation row history",
    )
    parser.add_argument(
        "--no-merge",
        action="store_true",
        help="Treat --input as the complete row history instead of merging into --master-rows",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "data" / "evaluations.json",
        help="Path to write the resulting evaluation index",
    )
    args = parser.parse_args()

    new_rows = read_rows(args.input)

    if args.no_merge:
        merged_rows = new_rows
    else:
        master_rows = load_master_rows(args.master_rows)
        merged_rows = merge_rows(master_rows, new_rows)
        args.master_rows.parent.mkdir(parents=True, exist_ok=True)
        args.master_rows.write_text(json.dumps(merged_rows, indent=2, default=str))
        print(f"Merged {len(new_rows)} rows from {args.input.name} into master ({len(merged_rows)} total) -> {args.master_rows}")

    index = build_index(merged_rows)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(index, indent=2))
    print(f"Recalculated {len(index)} course+instructor evaluation entries from {len(merged_rows)} rows -> {args.output}")


if __name__ == "__main__":
    main()
