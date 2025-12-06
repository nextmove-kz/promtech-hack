# Promtech Hack

Next.js 16 app (App Router) using Bun and Shadcn UI for pipeline integrity monitoring and diagnostics.

## Prerequisites
- Bun 1.1+
- Node.js 18+ (for tooling compatibility)

## Install
```bash
bun install
```

## Run (dev)
```bash
bun dev
```

## Build (CI)
```bash
bun run build
```

## Generate sample data
Creates CSV fixtures in the repo root:
```bash
bun run scripts/generate-data.ts
```
Outputs: `Objects.csv`, `Diagnostics.csv`, plus smaller `small_objects.csv` / `small_diagnostics.csv`.

## Import workflow
- Upload the generated CSVs at `/import` using the “Импорт” dialog.
- After import, kick off AI analysis from the UI (batching is handled automatically).

## Useful pages
- `/` – dashboard with objects, diagnostics, and map
- `/import` – data import UI
- `/map-example` – standalone Leaflet map example (client-rendered)
