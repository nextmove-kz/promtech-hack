# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 application for pipeline infrastructure diagnostics and object management with interactive map visualization. Uses PocketBase as backend, React Query for data fetching, Leaflet for maps, and Tailwind CSS for styling.

## Common Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000

# Build and production
npm run build           # Build for production
npm run start           # Run production server

# Code quality
npm run lint            # Run ESLint

# Type generation
npm run typegen         # Generate PocketBase types from schema
```

## Architecture

### Directory Structure

- `app/` - Next.js App Router pages and application code
  - `api/` - Backend integration (PocketBase client, server utilities)
  - `components/` - App-specific components (data-importer, map components)
  - `hooks/` - App-specific hooks
  - `lib/` - Schemas, utilities, seeder
  - `types/` - Type definitions
  - `(main)/` - Main route group
- `components/` - Shared UI components
  - `dashboard/` - Dashboard-specific components
  - `ui/` - shadcn/ui components
- `hooks/` - Shared React hooks
- `lib/` - Shared utilities and providers

### PocketBase Integration

Two separate PocketBase clients exist:

1. **Server-side** (`app/api/pocketbase.ts`): Uses `PB_TYPEGEN_URL` env var, handles cookie-based auth
2. **Client-side** (`app/api/client_pb.ts`): Hardcoded URL for client operations

Types are auto-generated in `app/api/api_types.ts` via `npm run typegen`.

Key collections:
- `objects` - Pipeline objects (cranes, compressors, pipeline sections) with coordinates
- `diagnostics` - Diagnostic records linked to objects
- `pipelines` - Pipeline metadata

### Data Import System

CSV import flow (`app/api/importer.ts`, `app/lib/schemas.ts`):
1. Auto-detect data type (objects vs diagnostics) from CSV headers
2. Validate rows with Zod schemas
3. Batch create via PocketBase `/api/batch` endpoint
4. Handle pipeline creation/lookups automatically

Object types: `crane`, `compressor`, `pipeline_section`
Diagnostic methods: `VIK`, `PVK`, `MPK`, `UZK`, `RGK`, `TVK`, `VIBRO`, `MFL`, `TFI`, `GEO`, `UTWM`

### Map System

Leaflet-based interactive map (`app/components/map/`):
- `PipelineMap.tsx` - Main container with OpenStreetMap tiles
- `PipelineMarker.tsx` - Individual markers with color-coded types
- `map-utils.ts` - Color mapping, bounds calculation
- Layers system (`layers/`) for organizing different object types

Color coding:
- Crane: blue
- Compressor: red
- Pipeline section: green

See `app/components/map/MAP_USAGE.md` for detailed usage examples.

### State Management

- React Query (`@tanstack/react-query`) for server state
- QueryProvider in `lib/providers/QueryProvider.tsx` with 1-minute stale time
- Custom hooks (`hooks/useObjects.ts`, `hooks/useDiagnostic.ts`) wrap queries

### UI Components

shadcn/ui components in `components/ui/` with Tailwind CSS + class-variance-authority.
Dashboard components handle:
- Map/table view switching
- Object selection and details panel
- Data import dialog
- Filter bar and recent scans

### Environment Variables

Required in `.env`:
```
PB_TYPEGEN_URL="http://pocketbase.url:port"
PB_TYPEGEN_EMAIL=
PB_TYPEGEN_PASSWORD=
```

Note: Client-side PocketBase URL is hardcoded in `app/api/client_pb.ts`.

### TypeScript Configuration

Path alias: `@/*` maps to project root
Target: ES2017
Strict mode enabled
JSX: react-jsx (Next.js handles runtime)

## Key Patterns

**Data fetching**: Use React Query hooks, never fetch directly in components
**Validation**: Zod schemas in `app/lib/schemas.ts` for all external data
**Error handling**: Batch operations return error counts, individual operations return null on error
**Client components**: Map and interactive components use `"use client"` directive
**Server components**: Use `pocketbase()` function from `app/api/pocketbase.ts` with cookie auth
**Expanding relations**: Use PocketBase expand parameter to fetch related data (e.g., `expand: 'pipeline'`)

## UI Patterns

**Object List Health Status**: Each object card in the Sidebar displays a colored left border and background:
- Green (OK): Healthy object, no issues
- Yellow (WARNING): Requires attention
- Red (CRITICAL): Critical issues detected

The color is based on the `health_status` field or calculated from diagnostic data.

## Known TODOs

**Urgency Score Calculation**: Currently using placeholder logic in `ObjectCardList.tsx` based on object type. Should be replaced with real diagnostic-based calculation using `ml_label` or `quality_grade` from the most recent diagnostic record.

**Health Status Calculation**: Currently using placeholder logic in `ObjectCardList.tsx` (line 108). Should be replaced with real diagnostic data:
- ml_label "high" or quality_grade "недопустимо" → CRITICAL (red)
- ml_label "medium" or quality_grade "требует_мер" → WARNING (yellow)
- ml_label "normal" or quality_grade "удовлетворительно/допустимо" → OK (green)
