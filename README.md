# Booth Class Explorer

A static site for Booth students to search and filter the course catalog by any
property (course number, title, instructor, quarter, units, days/times) and see
which concentrations and degree-requirement types each class satisfies.

Data is updated manually each term from an iBid export — there's no live backend.

## Structure

- `frontend/` — React + Vite + Tailwind app. Loads `public/data/classes.json` and
  does all searching/filtering client-side (free text via Fuse.js, facets for
  quarter/Foundations area/FLMBE area/day/timing/building/program/concentration/
  units/instructor).
- `pipeline/` — Python script that converts a raw iBid export + a manually
  maintained concentration/requirement mapping into `classes.json`. See
  [pipeline/README.md](pipeline/README.md).
- `.github/workflows/deploy.yml` — builds the frontend and deploys it to GitHub
  Pages on every push to `main`.

## Local development

```bash
cd frontend
npm install
npm run dev
```

## Updating class data each term

See [pipeline/README.md](pipeline/README.md).

## Deployment

Enable GitHub Pages for this repo (Settings → Pages → Source: GitHub Actions).
Every push to `main` rebuilds and redeploys automatically.

## Donations

A donate link lives in the site header (`frontend/src/components/DonateButton.tsx`) —
update `DONATE_URL` there with the real Ko-fi / Buy Me a Coffee link before launch.
