#!/usr/bin/env python3
"""Parse Booth's "Degree Requirements" intranet page into a courseNumber ->
requirement-type mapping CSV, used by convert.py to tag each class with which
top-level degree requirement it satisfies.

Usage:
    python build_requirement_mapping.py --input "Degree Requirements....html"

The page has one table (id="sort-table") with rows grouped under bold section
headers. Only two sections list specific courses:

- "Foundations" (Financial Accounting / Microeconomics / Statistics)
- "Functions, Leadership and Management, and the Business Environment"
  (Finance, Marketing, Operations, Strategy, Decisions, People, Economy,
  Society)

Each data row lists a "Basic Courses" cell and an "Approved Substitutes"
cell; course numbers are pulled out of both. Any course number found in
either section's rows is tagged accordingly. Everything else defaults to
"Electives" at merge time in convert.py, since Electives has no explicit
course list on the page (it's just "any remaining units").
"""

import argparse
import csv
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

SECTION_HEADERS = {
    "Foundations": "Foundations",
    "Functions, Leadership and Management, and the Business Environment": "FLMBE",
    "Electives": None,  # no explicit course list — stop collecting
}

# Booth course numbers are 5 digits. Strip department-prefixed cross-listings
# (e.g. "ECON 30100") first so their numbers aren't mistaken for Booth ones.
ECON_PREFIXED_RE = re.compile(r"\b[A-Z]{3,5}\s+\d{4,5}\b")
COURSE_NUMBER_RE = re.compile(r"\b\d{5}\b")


def extract_course_numbers(text: str) -> set[str]:
    text = ECON_PREFIXED_RE.sub("", text)
    return set(COURSE_NUMBER_RE.findall(text))


def parse_table(html_path: Path) -> dict[str, tuple[str, str]]:
    """Returns courseNumber -> (requirementType, area)."""
    soup = BeautifulSoup(html_path.read_text(encoding="utf-8"), "lxml")
    table = soup.find("table", id="sort-table")
    if table is None:
        raise ValueError("Could not find table#sort-table in the given HTML file")

    mapping: dict[str, tuple[str, str]] = {}
    current_section: str | None = None

    for tr in table.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all("td")]
        if not cells or not cells[0]:
            continue

        label = cells[0]

        matched_header = next((h for h in SECTION_HEADERS if label.startswith(h)), None)
        if matched_header is not None:
            current_section = SECTION_HEADERS[matched_header]
            continue

        if current_section is None:
            continue

        # Sub-header row ("", "Basic Courses", "Approved Substitutes").
        if label == "" or cells[:2] == ["", "Basic Courses"]:
            continue

        rest = cells[1:]
        # Category divider rows (e.g. "Functions", "Leadership & Management")
        # have a label but every other cell empty — no courses to extract.
        if not any(c.strip() for c in rest):
            continue

        area = label
        course_numbers = set()
        for cell in rest:
            course_numbers |= extract_course_numbers(cell)

        for course_number in course_numbers:
            mapping[course_number] = (current_section, area)

    return mapping


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", required=True, type=Path, help="Path to the saved Degree Requirements HTML page")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "mappings" / "requirement_types.csv",
        help="Path to write the resulting courseNumber -> requirementType CSV",
    )
    args = parser.parse_args()

    mapping = parse_table(args.input)
    if not mapping:
        print("Warning: no course numbers found — the page structure may have changed.", file=sys.stderr)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["courseNumber", "requirementType", "area"])
        for course_number, (req_type, area) in sorted(mapping.items()):
            writer.writerow([course_number, req_type, area])

    print(f"Wrote {len(mapping)} course requirement mappings to {args.output}")


if __name__ == "__main__":
    main()
