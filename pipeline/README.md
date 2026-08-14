# Data Pipeline

Converts a raw iBid course export (`Course List.xlsx`) into `frontend/public/data/classes.json`.

## Setup

```bash
cd pipeline
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Usage

```bash
python convert.py --input "Course List.xlsx"
```

Writes `frontend/public/data/classes.json` by default. Override with `--output`.

## Expected export columns

`Quarter, Title, Course, Program, Faculty, Schedule, Capacity, Building, Location, Units`

`Course` looks like `30000-01` (base course number + section). `Faculty` and `Schedule`
each get parsed and can fan a single row out into multiple class records:

- **Faculty** — one or more instructors joined by `" and "` (e.g. `"Anna Costello and
  Michael Minnis"`). Each instructor becomes its own record, split into
  `professorFirstName` / `professorLastName`.
- **Schedule** — a `"Day, Time"` pair, or two pairs back-to-back for twice-a-week
  classes (e.g. `"Monday, 10:10 AM - 11:30 AM Wednesday, 10:10 AM - 11:30 AM"`). Each
  day/time pair becomes its own record. `"TBD"` produces a record with an empty
  day/time.

A row with 2 faculty and 2 schedule segments expands into 4 records (the cross
product) — one per faculty/schedule combination, with all other fields identical.

## Concentration / requirement mapping

`mappings/concentration_requirements.csv` is a manually maintained file mapping each
`courseNumber` (the base course number without section, e.g. `30000`) to the
concentrations and degree-requirement types it satisfies — there's no clean source for
this in the iBid export. Columns:

```
courseNumber,concentrations,requirementTypes
30116,Analytic Finance,
30130,Analytic Finance,Financial Accounting Foundation
```

Multiple values are semicolon-separated. Update this file each term as new classes are
added — it currently only covers a handful of courses as a starting point.

## Each term

1. Export data from iBid as `Course List.xlsx`
2. Update `mappings/concentration_requirements.csv` for any new/changed classes
3. Run `python convert.py --input "Course List.xlsx"`
4. Commit the updated `frontend/public/data/classes.json`
5. Push — the site auto-redeploys via GitHub Actions
