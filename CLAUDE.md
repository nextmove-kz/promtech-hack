# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 application for pipeline infrastructure diagnostics and object management with interactive map visualization. Uses PocketBase as backend, React Query for data fetching, Leaflet for maps, and Tailwind CSS for styling.

## Common Commands

```bash
# Development
bun run dev              # Start dev server at http://localhost:3000

# Build and production
bun run build           # Build for production
bun run start           # Run production server

# Code quality
bun run lint            # Run Biome linter
bun run format          # Format code with Biome

# Type generation
bun run typegen         # Generate PocketBase types from schema

# Data generation
bun run scripts/generate-data.ts  # Creates Objects.csv, Diagnostics.csv fixtures
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

Types are auto-generated in `app/api/api_types.ts` via `bun run typegen`.

Key collections:

- `objects` - Pipeline objects (cranes, compressors, pipeline sections) with coordinates
- `diagnostics` - Diagnostic records linked to objects
- `pipelines` - Pipeline metadata
- `plan` - Action plans with expanded actions
- `action` - Individual action items

### Data Import System

CSV import flow (`app/api/importer.ts`, `app/lib/schemas.ts`):

1. Auto-detect data type (objects vs diagnostics) from CSV headers
2. Validate rows with Zod schemas
3. Batch create via PocketBase `/api/batch` endpoint
4. Handle pipeline creation/lookups automatically

Object types: `crane`, `compressor`, `pipeline_section`

Diagnostic methods: `VIK`, `PVK`, `MPK`, `UZK`, `RGK`, `TVK`, `VIBRO`, `MFL`, `TFI`, `GEO`, `UTWM`

Quality grades: `удовлетворительно`, `допустимо`, `требует_мер`, `недопустимо`

ML labels: `normal`, `medium`, `high`

### AI Analysis System

**Model**: Gemini 2.0 Flash Lite (temperature 0.3, JSON mode)

**API Endpoints**:
- **Single Analysis**: POST to `/api/analyze` with `object_id`
- **Batch Analysis**: PATCH to `/api/analyze` with array of `object_id` (max 10 per call)
- **Prioritization**: PUT to `/api/analyze` returns sorted object IDs by risk level
- **Action Plan Generation**: POST to `/api/action-plan` with `object_id` (AI сам выбирает критичную диагностику)

**Health Status Consistency Rule**: `health_status` must align with `urgency_score`:
- 0-25: OK
- 26-65: WARNING
- 66-100: CRITICAL

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

Default center: Kazakhstan center (48.0196, 66.9237)

See `app/components/map/MAP_USAGE.md` for detailed usage examples.

### State Management

- React Query (`@tanstack/react-query`) for server state
- QueryProvider in `lib/providers/QueryProvider.tsx` with 1-minute stale time
- Jotai atoms for UI state (filters, map viewport)
- Custom hooks (`hooks/useObjects.ts`, `hooks/useDiagnostic.ts`) wrap queries

### UI Components

shadcn/ui components in `components/ui/` with Tailwind CSS + class-variance-authority.

Dashboard components handle:

- Map/table view switching
- Object selection and details panel
- Data import dialog
- Filter bar and recent scans
- Statistics and analytics (pipeline-dependent)

### Environment Variables

Required in `.env`:

```
PB_TYPEGEN_URL="http://pocketbase.url:port"
PB_TYPEGEN_EMAIL=
PB_TYPEGEN_PASSWORD=
GEMINI_API_KEY=
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

**Statistics Dashboard**: All statistics and charts on `/stats` page are pipeline-dependent:

- Pipeline selector at top filters all metrics
- Uses `filterAtom` from `@/store/filterStore` for state management
- All chart components apply pipeline filtering via `selectedPipelineId`
- Components use `withDerivedUrgencyScore` utility from `@/lib/utils/urgency`

**Minimalist Design Principles**:

- Soft, neutral color palette (slate, soft blue, calm green, amber, rose)
- Avoid neon or saturated colors
- Generous spacing, reduced visual noise
- Full Russian-language UI
- Calm chart styling with subtle gradients

## Known TODOs

**Urgency Score Calculation**: Currently using placeholder logic in `ObjectCardList.tsx` based on object type. Should be replaced with real diagnostic-based calculation using `ml_label` or `quality_grade` from the most recent diagnostic record.

**Health Status Calculation**: Currently using placeholder logic in `ObjectCardList.tsx` (line 108). Should be replaced with real diagnostic data:

- ml_label "high" or quality_grade "недопустимо" → CRITICAL (red)
- ml_label "medium" or quality_grade "требует_мер" → WARNING (yellow)
- ml_label "normal" or quality_grade "удовлетворительно/допустимо" → OK (green)

## Data Flow

**Object Lifecycle**:
```
CSV Import → Validation (Zod) → Batch Create → PocketBase
                ↓
        Update diagnostics + plans
                ↓
        AI Analysis (Gemini)
                ↓
        Update health_status, urgency_score, ai_summary
                ↓
        Display in Dashboard/Map/Table
```

**Import Workflow**:
1. Generate sample data: `bun run scripts/generate-data.ts`
2. Upload CSVs at `/import` using "Импорт" dialog
3. System auto-detects data type and validates
4. Batch import to PocketBase
5. Trigger AI analysis from UI (automatic batching)

## Code Quality

**Biome Configuration** (`.biome.json`):
- 2-space indentation
- Single quotes
- Auto organize imports
- Tailwind CSS directive parsing enabled
- Recommended rules with TypeScript support
