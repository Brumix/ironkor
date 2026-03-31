# AGENTS.md

Project guidance for AI/code agents working in this repository.

## Ironkor Architecture Contract

This repository is a **Bun workspace monorepo** designed to support multiple apps sharing one backend.

### Source of truth

- Backend: `convex/` (single shared Convex deployment)
- Shared contracts/utilities: `packages/shared` (`@ironkor/shared`)
- Apps: `apps/*` (currently `apps/mobile`, future `apps/web`, `apps/nutrition`, etc.)

### Monorepo snapshot

```
ironkor/                      # repo root - Git root, workspace root
|- convex/                    # Shared Convex backend (schema, functions, generated types)
|- packages/
|  `- shared/                 # @ironkor/shared - pure TS constants, enums, validators
`- apps/
   `- mobile/                 # Expo + React Native app (Ironkor Mobile)
```

### Architecture intent and scaling rules

1. **One backend, many clients**: all first-party apps consume the same `convex/`.
2. **Domain-first backend growth**: add domains as `convex/<domain>/` + `convex/schemas/<domain>*.ts`.
3. **Shared logic once**: reusable enums/constants/types live in `packages/shared`.
4. **App isolation**: app folders own UI/routing/app-local composition, not backend duplication.
5. **Migration safety**: use additive/widen-migrate-narrow workflows for existing data.

## Stack

- **Backend:** Convex (^1.32.0)
- **Shared package:** `@ironkor/shared`
- **Mobile app:** Expo SDK 55, React 19, React Native 0.83, Expo Router
- **Language:** TypeScript (strict)
- **Package manager:** Bun workspaces

## Key commands (run from repo root)

| Command | Description |
|---------|-------------|
| `bun install` | Install workspace dependencies |
| `bun run start` | Codegen once + run Convex dev + Expo |
| `bun run dev` | Run Convex dev + Expo (skip initial codegen) |
| `bun run convex:dev` | Run Convex development server |
| `bun run convex:deploy` | Deploy Convex to production |
| `bun run mobile:dev` | Run Expo development server only |
| `bun run mobile:doctor` | Run Expo Doctor |
| `bun run lint` | Lint mobile app |
| `bun run quality:mobile` | Mobile sign-off: lint + Expo Doctor + typecheck |
| `bun run typecheck` | Typecheck mobile + convex |
| `bun run lockfile:check` | Fail on nested `bun.lock` files |

## Dependency policy

- Run `bun install` only at repository root.
- Root `bun.lock` is the only lockfile source of truth.
- Never run `bun install` inside `apps/*` or `packages/*`.
- Never add nested `bun.lock` files in workspace folders.
- Run `bun run lockfile:check` before PRs.

## Environment variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `EXPO_PUBLIC_CONVEX_URL` | `apps/mobile/.env.local` | Convex URL for Expo client |
| `CONVEX_URL` | root `.env.local` or shell | Convex URL for seed/scripts |

## Editing and quality rules

- Make changes from the correct workspace: root for Convex/shared, `apps/mobile` for mobile UI work.
- Keep one shared Convex schema/config for all apps.
- Keep TypeScript strict; avoid `any`.
- After non-trivial changes, run the appropriate validation from root.
- If work changes anything under `apps/mobile`, `bun run quality:mobile` is required before handoff.
- If work does not touch Expo app code, keep normal validation flow and run `bun run typecheck` at minimum for non-trivial changes.
- Follow interaction standards in `docs/UI_STANDARDS.md`.
- For workout-editor UX changes, consult `apps/mobile/AGENTS.md`.

## Current mobile workout constraints

- Routine creation is draft-first: users build routine + sections + exercises before final save.
- Existing routine editing follows the same page-local contract for page-level changes (name, planner, add/delete/reorder sections) until Save.
- Leaving routine editor without saving must restore original server state.
- For existing routines, do not persist new sections incrementally just to support editing; either save first or implement a true local section draft flow.
- Weekly planner in mobile editor is currently train/rest only; do not reintroduce manual session assignment unless explicitly requested.
- On workout editor screens, chip/badge is the primary page-context label; do not reintroduce large duplicated titles or floating back buttons unless requested.
- Drag reorder currently depends on the checked-in Bun patch for `react-native-draggable-flatlist@4.0.3`; preserve this expectation when touching reorder implementation.

## Exercise catalog performance guardrails

- Treat `convex/schemas/exercises.ts` as a high-read catalog table.
- Keep `exercises` denormalized for hot reads; do not split `equipment`, `bodyPart`, or `primaryMuscle` into lookup tables for performance reasons.
- Avoid unbounded `.collect()` in user-facing exercise queries; prefer:
  - `withIndex(...).take(n)` for bounded reads
  - `.paginate(...)` for browse/infinite lists
  - `withSearchIndex(...)` for text search
- Push filters (`bodyPart`, `equipment`, `primaryMuscle`, optional `isCustom`) into search/index queries.
- Keep indexes aligned with real UI query shapes and remove unused/redundant indexes.
- Use staged indexes for large production backfills.
- Keep ingestion idempotent via normalized `nameText`; normalize seed/import payloads server-side.
- Debounce mobile search input to reduce query churn.

## Scaling playbook

### Add a new app

1. Create `apps/<name>/` with its own `package.json`.
2. Add `"convex"` and `"@ironkor/shared": "workspace:*"` as dependencies.
3. Point app env var (`NEXT_PUBLIC_CONVEX_URL` or equivalent) to the same Convex deployment.
4. Keep app-specific UI and routing in that app folder.
5. Run root install and typecheck.

### Extend backend with a new vertical

1. Add tables under `convex/schemas/`.
2. Register new tables in `convex/schema.ts`.
3. Add queries/mutations/actions under `convex/<domain>/`.
4. Expose the minimum app-facing API surface.
5. Use migrations before narrowing existing schema fields.

### Recommended domain structure

```
convex/
|- schemas/
|  |- workout*.ts
|  |- nutrition*.ts
|  `- ...
|- workout/
|- nutrition/
`- ...
```

### What not to do

- Do not create multiple Convex deployments for the same product surface unless strict isolation is required.
- Do not duplicate backend logic in app code.
- Do not place reusable domain primitives in app-local folders.
- Do not duplicate constants/enums across apps and Convex.

## UI standards

- Shared card interaction rules live in `docs/UI_STANDARDS.md`.
- For card lists, use drag-and-drop for ordering (not up/down controls).
- Use icon-only actions for intuitive actions and icon+label for less-intuitive actions.

## See also

- `apps/mobile/AGENTS.md` - mobile-specific coding guidance
- `convex/README.md` - Convex function reference
- `docs/UI_STANDARDS.md` - shared interaction standards

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidance on correct Convex APIs and patterns. Those guidelines override stale assumptions.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->