#!/usr/bin/env python3
"""Parse Booth's concentration requirement descriptions into a courseNumber ->
concentrations mapping CSV, used by convert.py to tag each class with which
concentration(s) it satisfies.

Usage:
    python build_concentration_mapping.py

Reads mappings/concentrations_source.txt — a plain-text copy of Booth's
concentration requirement descriptions (see that file for the source), one
concentration per section, each introduced by the concentration's name on
its own line. Every 5-digit Booth course number mentioned in a section
(including parenthetical "or" alternates) is treated as satisfying that
concentration; a course can and often does count toward more than one.

Course numbers from other departments (e.g. "LAWS 43225", "ECON 28620",
mentioned as cross-listing notes) are excluded, since they won't appear in
Booth's own course export.
"""

import argparse
import csv
import re
import sys
from pathlib import Path

CONCENTRATIONS = [
    "Accounting",
    "Applied Artificial Intelligence",
    "Behavioral Science",
    "Business Analytics",
    "Business, Society and Sustainability",
    "Econometrics and Statistics",
    "Economics",
    "Entrepreneurship",
    "Finance",
    "Analytic Finance",
    "General Management",
    "Healthcare",
    "International Business",
    "Marketing Management",
    "Operations Management",
    "Strategic Management",
]

DEPT_PREFIXED_RE = re.compile(r"\b[A-Z]{3,5}\s+\d{4,5}\b")
COURSE_NUMBER_RE = re.compile(r"\b\d{5}\b")


def extract_course_numbers(text: str) -> set[str]:
    text = DEPT_PREFIXED_RE.sub("", text)
    return set(COURSE_NUMBER_RE.findall(text))


def parse_source(text: str) -> dict[str, set[str]]:
    """Returns concentration name -> set of course numbers."""
    sections: dict[str, list[str]] = {name: [] for name in CONCENTRATIONS}
    current: str | None = None

    for line in text.splitlines():
        stripped = line.strip()
        if stripped in CONCENTRATIONS:
            current = stripped
            continue
        if current is not None:
            sections[current].append(line)

    return {name: extract_course_numbers("\n".join(lines)) for name, lines in sections.items()}


def build_course_mapping(sections: dict[str, set[str]]) -> dict[str, list[str]]:
    course_to_concentrations: dict[str, set[str]] = {}
    for concentration, course_numbers in sections.items():
        for course_number in course_numbers:
            course_to_concentrations.setdefault(course_number, set()).add(concentration)
    return {course: sorted(concentrations) for course, concentrations in course_to_concentrations.items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).parent / "mappings" / "concentrations_source.txt",
        help="Path to the plain-text concentration requirements source",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "mappings" / "concentration_requirements.csv",
        help="Path to write the resulting courseNumber -> concentrations CSV",
    )
    args = parser.parse_args()

    sections = parse_source(args.input.read_text(encoding="utf-8"))
    for name, numbers in sections.items():
        if not numbers and name != "General Management":
            print(f"Warning: no course numbers found for '{name}'", file=sys.stderr)

    course_mapping = build_course_mapping(sections)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["courseNumber", "concentrations"])
        for course_number in sorted(course_mapping):
            writer.writerow([course_number, ";".join(course_mapping[course_number])])

    print(f"Wrote {len(course_mapping)} course concentration mappings to {args.output}")


if __name__ == "__main__":
    main()
