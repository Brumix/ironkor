## Ironkor Architecture Contract

This repository is a **Bun workspace monorepo** designed to support multiple apps sharing one backend.

### Source of truth

- Backend: `convex/` (single shared Convex deployment)
- Shared contracts/utilities: `packages/shared` (`@ironkor/shared`)
- Apps: `apps/*` (currently `apps/mobile`, future `apps/web`, `apps/nutrition`, etc.)

### Scaling rules

1. **One backend, many clients**: new apps must consume the existing `convex/` project.
2. **Domain-first backend growth**: add new verticals as `convex/<domain>/` + `convex/schemas/<domain>*.ts`.
3. **Shared logic once**: move reusable enums/constants/types to `packages/shared`.
4. **App isolation**: each app owns only UI, routing, and app-local composition.
5. **Migration safety**: for schema/data changes on existing tables, use safe migration workflows.

### UI standards

- Shared card interaction rules live in `docs/UI_STANDARDS.md`.
- For card lists, use drag-and-drop for ordering (not up/down controls).
- Use icon-only actions for intuitive actions, and icon+label for less-intuitive actions.

### New app checklist

- Create `apps/<name>/package.json`
- Add `"convex"` and `"@ironkor/shared": "workspace:*"`
- Configure app env var to the same Convex URL
- Run workspace install and typecheck from root

### Current mobile workout constraints

- The mobile workout routine-creation flow is draft-first: users build the full routine, sections, and exercises before the final save.
- Existing routine editing now follows the same page-local contract for page-level changes: add/delete/reorder sections, rename routine, and planner edits stay local until Save. Leaving the editor without saving must restore the original server state.
- For existing routines, new sections are not persisted incrementally just to support editing. Either save first or introduce a real local section draft flow before allowing exercise-level edits on unsaved sections.
- Weekly planner in the mobile workout editor is currently train/rest only. Do not add manual session assignment back unless explicitly requested.
- On mobile workout editor screens, the chip is the primary page-context label; avoid reintroducing a large duplicated title or floating back button for those screens.
- The mobile drag-reorder flow depends on a checked-in Bun patch for `react-native-draggable-flatlist@4.0.3`; keep that in mind before upgrading or replacing the drag list implementation.

### Exercise catalog performance constraints

- The `exercises` table is a high-read catalog and must stay optimized for heavy concurrent reads.
- Keep `exercises` denormalized for hot lookups (do not split `equipment`, `bodyPart`, or `primaryMuscle` into separate lookup tables for performance reasons).
- Avoid unbounded `.collect()` on `exercises` for user-facing queries; prefer `withIndex` / `withSearchIndex` with `take()` or pagination.
- For text search, prefer a Convex `searchIndex` and push filter predicates (`bodyPart`, `equipment`, `primaryMuscle`, optional `isCustom`) into the index query.
- Add composite indexes that match real UI filter patterns; remove redundant/unused indexes to reduce write overhead.
- For large index additions on `exercises`, use staged indexes to avoid blocking deploys.
- Keep exercise ingestion idempotent by normalized name (`nameText`) and normalize raw seed payloads server-side before insert.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
