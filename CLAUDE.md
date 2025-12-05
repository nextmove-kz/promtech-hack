# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IntegrityOS** - A hackathon MVP for pipeline inspection data visualization, storage, and analysis. The system demonstrates a complete workflow from importing CSV inspection data to AI-powered severity assessment and report generation.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **UI Components**: shadcn/ui
- **Styling**: TailwindCSS v4
- **Data Fetching**: TanStack Query (React Query)
- **Tables**: TanStack Table
- **Maps**: Leaflet + OpenStreetMap
- **Backend**: PocketBase (BaaS)
- **Type Safety**: TypeScript with strict mode

## Common Commands

```bash
# Development
npm run dev        # Start Next.js development server on localhost:3000
bun dev           # Alternative using Bun

# Build and Production
npm run build     # Build for production
npm start         # Run production server

# Linting
npm run lint      # Run ESLint

# PocketBase Type Generation
npm run typegen   # Generate TypeScript types from PocketBase schema
                  # Requires PB_TYPEGEN_URL, PB_TYPEGEN_EMAIL, PB_TYPEGEN_PASSWORD in .env
```

## Environment Setup

Required environment variables (see `.env.example`):
- `PB_TYPEGEN_URL` - PocketBase instance URL for type generation
- `PB_TYPEGEN_EMAIL` - Admin email for PocketBase typegen
- `PB_TYPEGEN_PASSWORD` - Admin password for PocketBase typegen

## Architecture

### PocketBase Integration

The project uses two PocketBase client configurations:

1. **Server-side** (`app/api/pocketbase.ts`):
   - Factory function `pocketbase()` creates authenticated instances
   - Uses `PB_TYPEGEN_URL` environment variable
   - Loads auth from Next.js cookies (`pb_auth`)
   - Used for server components and API routes

2. **Client-side** (`app/api/client_pb.ts`):
   - Single instance exported as `clientPocketBase`
   - Hardcoded to production URL: `https://hack-aton.pockethost.io`
   - Used for client components and API calls

Both instances are typed with `TypedPocketBase` from auto-generated `api_types.ts`.

### Current Data Model

The codebase currently has a `vacancy` collection with the following operations (in `app/api/vacancy.ts`):
- `createVacancy(vacancy)` - Create new record
- `viewVacancy()` - Fetch all records
- `vacancyById(id)` - Fetch single record
- `updateVacancy(id, data)` - Update record
- `archiveById(id)` / `disArchiveById(id)` - Toggle archive status

**Note**: This is legacy code from initial setup and will need refactoring for pipeline inspection data.

## MVP Feature Requirements

### 1. CSV Import
- Import pipeline inspection data from CSV files
- Parse and validate inspection records
- Store in PocketBase collections

### 2. Map Visualization (Leaflet + OpenStreetMap)
- Display pipeline objects on interactive map
- Show diagnostics data points
- Color-coded markers based on severity/status
- Click to view object details

### 3. Objects List
- Filterable list of all pipeline objects
- Filter by inspection method
- TanStack Table for performance with large datasets
- Sortable columns

### 4. Object Details Page
Each object should display:
- **Diagnostics history**: Timeline of all inspections
- **AI severity assessment**: ML-based criticality classification
- **Parameters and attributes**: Technical specifications and metadata

### 5. Dashboard
Statistics and visualizations:
- Breakdown by inspection methods
- Risk level distribution
- Object count by category/region
- Charts using appropriate library (consider Recharts or similar)

### 6. AI/ML Module
- Classification model for issue criticality
- Severity scoring based on inspection data
- Integration with object details and dashboard

### 7. Report Generator
- Generate reports in HTML/PDF format
- Include inspection data, AI assessments, and visualizations
- Export functionality for single objects or filtered sets

## Project Structure

```
app/
├── api/                    # Backend logic and PocketBase integration
│   ├── api_types.ts       # Auto-generated PocketBase types
│   ├── client_pb.ts       # Client-side PocketBase instance
│   ├── pocketbase.ts      # Server-side PocketBase factory
│   ├── serverEnv.ts       # Server environment variables
│   ├── vacancy.ts         # Legacy CRUD operations (to be refactored)
│   └── auth/
│       └── sign-in.tsx    # Authentication component
├── layout.tsx             # Root layout with Geist fonts
├── page.tsx              # Home page
└── globals.css           # Global styles
```

## Type Generation Workflow

When PocketBase schema changes:
1. Update `.env` with admin credentials
2. Run `npm run typegen`
3. Review changes in `app/api/api_types.ts`
4. Update affected API functions if schema changed

## Path Aliases

The tsconfig uses `@/*` alias pointing to project root, allowing imports like:
```typescript
import { pocketbase } from '@/app/api/pocketbase'
```

## Development Guidelines

### UI Components
- Use shadcn/ui components for consistency
- Follow TailwindCSS utility-first approach
- Ensure responsive design for all views

### Data Fetching
- Use TanStack Query for all API calls
- Implement proper loading and error states
- Cache strategy for performance

### Map Integration
- Leaflet components should be client-side only (`'use client'`)
- OpenStreetMap as base layer
- Consider marker clustering for performance with many objects

### Tables
- Use TanStack Table for all data tables
- Implement pagination for large datasets
- Server-side filtering when possible, fallback to client-side
