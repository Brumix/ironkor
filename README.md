# Ironkor

**Ironkor** is a fitness platform for planning strength-training routines, tracking workouts, and building healthy habits. The codebase is a **Bun workspace monorepo** with a single shared Convex backend, a shared TypeScript package, and separate client apps.

---

## Repository layout

```
ironkor/
├── convex/                   # Convex backend — schema, queries, mutations
├── packages/
│   └── shared/               # @ironkor/shared — pure TS constants, enums, validators
└── apps/
    └── mobile/               # Expo + React Native (iOS / Android / Web)
```

---

## Apps

| App | Path | Description |
|-----|------|-------------|
| Ironkor | `apps/mobile/` | Mobile gym logbook: routines, sessions, weekly planning |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | **Convex** (real-time sync, TypeScript functions) |
| Shared | `@ironkor/shared` — workspace package |
| Mobile | **Expo SDK 55**, React Native 0.83, Expo Router |
| Language | **TypeScript** (strict) |
| Package manager | **Bun** (workspaces) |

---

## Prerequisites

- **Node.js** LTS
- **Bun** (`curl -fsSL https://bun.sh/install | bash`)
- A **Convex** project (`npx convex dev` will prompt for login and deployment selection)
- Xcode / Android SDK for native builds

---

## Getting started

```bash
# Install all workspace dependencies
bun install

# Set up environment
cp apps/mobile/.env.local.example apps/mobile/.env.local  # then fill in EXPO_PUBLIC_CONVEX_URL

# Start Convex + Expo together
bun run start
```

---

## Environment variables

| Variable | File | Purpose |
|----------|------|---------|
| `EXPO_PUBLIC_CONVEX_URL` | `apps/mobile/.env.local` | Convex HTTP URL for the mobile client |
| `CONVEX_URL` | root `.env.local` or shell | URL used by seed scripts |

---

## Scripts (from repo root)

| Command | Description |
|---------|-------------|
| `bun run start` | Codegen once, then run Convex + Expo concurrently |
| `bun run dev` | Run Convex + Expo concurrently (skip initial codegen) |
| `bun run convex:dev` | Convex dev server only |
| `bun run convex:deploy` | Deploy Convex to production |
| `bun run mobile:dev` | Expo dev server only |
| `bun run lint` | Lint the mobile app |
| `bun run typecheck` | Typecheck mobile + convex |
| `bun run lockfile:check` | Fail if nested `bun.lock` files exist |

---

## Dependency policy

- Run `bun install` only from the repository root.
- Treat root `bun.lock` as the single lockfile source of truth.
- Do not run `bun install` inside `apps/mobile` or other workspace folders.
- Do not add nested `bun.lock` files under `apps/*` or `packages/*`.

---

## Adding a new app

1. Create `apps/<name>/` with its own `package.json`.
2. Add `"@ironkor/shared": "workspace:*"` and `"convex"` as dependencies.
3. Set `NEXT_PUBLIC_CONVEX_URL` (or equivalent) pointing to the same deployment.
4. Run `bun install` from the repo root.

---

## Convex data model

- **`routines`** — Name, `daysPerWeek`, `isActive`, `sessionOrder`, `weeklyPlan` (7 entries).
- **`routineSessions`** — Belongs to a routine; ordered by `order`.
- **`exercises`** — Library of movements; `isCustom` distinguishes user-created rows.
- **`sessionExercises`** — Join of session ↔ exercise with ordering.

See `convex/README.md` for full function reference.

---

## Notes

- Authentication is not yet wired — Convex functions operate on a shared dataset suitable for early development.
- Workout history in the mobile app uses mock data pending a real persistence layer.
