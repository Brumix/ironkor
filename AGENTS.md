# AGENTS.md

Project guidance for AI/code agents working in this repository.

## Monorepo Overview

This is the **Ironkor** platform — a Bun workspace monorepo with one shared Convex backend and multiple client apps.

```
ironkor/                      # repo root — Git root, workspace root
├── convex/                   # Shared Convex backend (schema, functions, generated types)
├── packages/
│   └── shared/               # @ironkor/shared — pure TS constants, enums, validators
└── apps/
    └── mobile/               # Expo + React Native app (Ironkor Mobile)
```

### Architecture intent

- Keep **one Convex backend** for all first-party apps (`mobile`, `web`, future vertical apps).
- Keep **platform/domain logic** in Convex and `packages/shared`, and keep app folders focused on UI and app-specific flows.
- Scale by adding new app packages under `apps/` and new backend domains under `convex/<domain>/` rather than forking backends.

## Stack

- **Backend:** Convex (^1.32.0) — schema at `convex/schema.ts`, functions in `convex/*.ts`
- **Shared package:** `@ironkor/shared` — enums, constants, date helpers safe for server + client
- **Mobile app:** Expo SDK 55, React 19, React Native 0.83, Expo Router
- **Language:** TypeScript (strict throughout)
- **Package manager:** Bun (workspaces)

## Key Commands (run from repo root)

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run start` | Codegen once + run Convex dev + Expo concurrently |
| `bun run dev` | Run Convex dev + Expo concurrently (skip initial codegen) |
| `bun run convex:dev` | Run Convex dev server only |
| `bun run convex:deploy` | Deploy Convex to production |
| `bun run mobile:dev` | Run Expo dev server only |
| `bun run lint` | Lint the mobile app |
| `bun run typecheck` | Typecheck mobile + convex |

## Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `EXPO_PUBLIC_CONVEX_URL` | `apps/mobile/.env.local` | Convex HTTP URL for the Expo client |
| `CONVEX_URL` | root `.env.local` or shell | Convex URL used by seed scripts |

## Adding a New App

1. Create `apps/<name>/` with its own `package.json` (add `"@ironkor/shared": "workspace:*"` and `"convex"` as dependencies).
2. Point its Convex client at `NEXT_PUBLIC_CONVEX_URL` (or equivalent).
3. Run `bun install` from the repo root to wire up workspace links.

## Extending Convex (new vertical)

- Add schema tables in `convex/schemas/` and register them in `convex/schema.ts`.
- Add function modules under `convex/<domain>/` (e.g. `convex/nutrition/`).
- Add shared types/constants to `packages/shared/` if needed by both Convex and clients.

### Recommended domain structure

When adding a new vertical (e.g. nutrition), use this pattern:

```
convex/
├── schemas/
│   ├── car*.ts
│   ├── workout*.ts
│   └── nutrition*.ts
├── car/
├── workout/
└── nutrition/
```

Guidelines:
- Keep domain boundaries explicit (do not mix unrelated domain logic in one large file).
- Keep shared cross-domain primitives in `packages/shared`, not duplicated in apps.
- Prefer additive schema evolution and safe migrations for existing data.

## Editing and Quality Rules

- Always make changes from the correct workspace: root for Convex and shared, `apps/mobile` for the mobile app.
- Do not duplicate Convex config or schema across apps — one deployment serves all.
- Keep TypeScript strict; avoid `any`.
- After non-trivial changes, run `bun run lint` and `bun run typecheck` from root.
- For workout-editor UX in the mobile app, check `apps/mobile/AGENTS.md` before changing routine creation/editing flows or planner behavior.
- For the mobile routine editor, treat page-level edits as local until the user presses Save. Do not persist add/delete/reorder/name/planner changes for an existing routine during routine-editor interactions.

## Scaling Playbook

### Add a new app (web/admin/nutrition)

1. Create `apps/<name>/` with its own `package.json`.
2. Add dependencies:
   - `"convex"` for client hooks and generated API usage
   - `"@ironkor/shared": "workspace:*"` for shared contracts/utilities
3. Add app-specific env var (for example `NEXT_PUBLIC_CONVEX_URL`) pointing to the same Convex deployment.
4. Keep app-level UI and routing in that app folder; do not copy backend logic into app code.

### Add a new backend vertical

1. Add domain tables under `convex/schemas/`.
2. Register tables in `convex/schema.ts`.
3. Add queries/mutations/actions under `convex/<domain>/`.
4. Expose only the minimum app-facing API needed by clients.
5. If breaking changes are required, use a migration strategy before narrowing schema types.

### What not to do

- Do not create multiple Convex deployments for the same product surface unless strict isolation is required.
- Do not place reusable domain types inside app-local folders.
- Do not duplicate constants/enums across apps and Convex.

## See Also

- `apps/mobile/AGENTS.md` — mobile-specific coding guidance
- `convex/README.md` — Convex function reference

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
