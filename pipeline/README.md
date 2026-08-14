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

## Concentration mapping

`mappings/concentration_requirements.csv` is a manually maintained file mapping each
`courseNumber` (the base course number without section, e.g. `30000`) to the
concentrations it satisfies — there's no clean source for this in the iBid export, or
anywhere else scraped automatically. Columns:

```
courseNumber,concentrations
30116,Analytic Finance
```

Multiple concentrations are semicolon-separated. Update this file each term as new
classes are added — it currently only covers a handful of courses as a starting point.

## Requirement type mapping (Foundations / FLMBE / Electives)

Unlike concentrations, degree-requirement types *are* published — on Booth's intranet
"Degree Requirements" page. `build_requirement_mapping.py` parses a saved copy of that
page into `mappings/requirement_types.csv` (courseNumber → requirementType → area):

```bash
python build_requirement_mapping.py --input "Degree Requirements ....html"
```

The page lists specific course numbers under two sections — **Foundations** (Financial
Accounting / Microeconomics / Statistics) and **Functions, Leadership and Management,
and the Business Environment** ("**FLMBE**": Finance, Marketing, Operations, Strategy,
Decisions, People, Economy, Society). `convert.py` sets each class's `foundationsArea`
or `flmbeArea` field to the specific area (e.g. `"Statistics"`, `"Marketing"`) if its
course number appears in the corresponding section; a class matches at most one of the
two. Courses in neither section are Electives — both fields stay empty, since that
requirement has no explicit course list on the page ("any remaining units").

Re-run `build_requirement_mapping.py` whenever Booth updates the Degree Requirements
page (new curriculum year, course number changes, etc.) and commit the regenerated
`mappings/requirement_types.csv`.

## Each term

1. Export data from iBid as `Course List.xlsx`
2. Update `mappings/concentration_requirements.csv` for any new/changed classes
3. If Booth's Degree Requirements page changed, re-run `build_requirement_mapping.py`
4. Run `python convert.py --input "Course List.xlsx"`
5. Commit the updated `frontend/public/data/classes.json`
6. Push — the site auto-redeploys via GitHub Actions
