# Data Pipeline

Converts a raw iBid course export into `frontend/public/data/classes.json`.

## Setup

```bash
cd pipeline
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Usage

```bash
python convert.py --input path/to/ibid_export.xlsx
```

Writes `frontend/public/data/classes.json` by default. Override with `--output`.

## Concentration / requirement mapping

`mappings/concentration_requirements.csv` is a manually maintained file mapping each
`courseId` to the concentrations and degree-requirement types it satisfies (there's no
clean source for this in the iBid export). Columns:

```
courseId,concentrations,requirementTypes
BUS41100,Analytic Finance;Econometrics,Statistics Foundation
```

Multiple values are semicolon-separated. Update this file each term as new classes are added.

## Column mapping

`COLUMN_MAP` at the top of `convert.py` maps the raw export's column headers to the
site's schema fields. **These are placeholders** — update them once a real iBid export
is available (see `sample_raw_export.csv` for the assumed shape used during development).

## Each term

1. Export data from iBid
2. Update `mappings/concentration_requirements.csv` for any new/changed classes
3. Run `python convert.py --input <export file>`
4. Commit the updated `frontend/public/data/classes.json`
5. Push — the site auto-redeploys via GitHub Actions
