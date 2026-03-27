# Ironkor Mobile

**Ironkor** is a gym-focused mobile app for planning strength-training **routines**, organizing **sessions** (splits), and mapping exercises to a **weekly calendar**. The client is built with **Expo** and **React Native**; data and business logic live on **Convex** for real-time sync and a single TypeScript stack end to end.

---

## What it does

- **Routines** — Create and manage multiple routines. One routine can be **active** at a time; switching active routines updates what the rest of the app shows.
- **Sessions** — Each routine contains ordered **sessions** (for example Push / Pull / Legs). Sessions hold an ordered list of **exercises**.
- **Exercises** — Exercises define targets (sets, rep ranges, rest), muscle groups, and variant (barbell, machine, etc.). Users can add **custom** exercises via Convex.
- **Weekly plan** — Each routine has a **7-day plan**: train vs rest, with **auto** or **manual** assignment of a session to a given day. Changing `daysPerWeek` regenerates a sensible default spread of training days.
- **Today’s flow** — **Home** summarizes the active routine and today’s focus; **Start** is the in-session checklist (local completion state). **Plan** shows the week ahead with estimated session load.

Empty deployments **seed** a default Push / Pull / Legs routine with sample exercises when the routines list is empty (see `seedDefaultsIfEmpty` in Convex).

---

## Tech stack

| Layer | Choice |
|--------|--------|
| App framework | **Expo SDK 55** (`expo-router` file-based routes, typed routes, React Compiler experiment) |
| UI | **React Native 0.83**, **Reanimated**, **Gesture Handler**, **Safe Area** |
| Backend | **Convex** (queries/mutations, schema in `convex/`) |
| Language | **TypeScript** (strict) |
| Tooling | **ESLint** (Expo config, import resolver, sonarjs, unused-imports) |

Optional targets: **iOS**, **Android**, **Web** (static export configured in Expo config).

---

## Repository layout

```
apps/mobile/
├── app.config.ts          # Expo config (bundle IDs, EAS, variants)
├── metro.config.js        # Monorepo-aware Metro config
├── src/
│   ├── app/               # Expo Router screens and layouts
│   │   ├── _layout.tsx    # ConvexProvider, theme, root stack
│   │   └── (workout)/     # Tabbed workout area (home, routines, start, plan, settings)
│   ├── components/        # UI primitives + workout-specific layout (e.g. WorkoutPage, bottom nav)
│   ├── features/workout/  # Mappers, selectors, types, mock data for UI experiments
│   └── theme/             # Light/dark themes, tokens, ThemeProvider
└── assets/                # Images (e.g. app icon)
```

Convex backend lives at repo root: `../../convex/`.
Shared constants/enums: `@ironkor/shared` → `../../packages/shared/`.

Path aliases: `@/*` → `src/*`, `@convex/*` → `../../convex/*` (see `tsconfig.json`).

---

## Convex data model (summary)

- **`routines`** — Name, `daysPerWeek`, `isActive`, `sessionOrder`, `weeklyPlan` (7 entries), timestamps.
- **`routineSessions`** — Belongs to a routine; ordered by `order`.
- **`exercises`** — Library of movements; `isCustom` distinguishes user-created rows.
- **`sessionExercises`** — Join of session ↔ exercise with ordering.

Main API modules: `../../convex/routines.ts` (routine lifecycle, sessions, weekly plan, seeding), `../../convex/exercises.ts` (list, create custom).

---

## Prerequisites

- **Node.js** (LTS recommended)
- **Bun** package manager
- A **Convex** project linked to this repo (`npx convex dev` from repo root)
- Xcode / Android SDK for native builds

---

## Environment variables

The app expects a Convex deployment URL at runtime:

| Variable | File | Purpose |
|----------|------|---------|
| `EXPO_PUBLIC_CONVEX_URL` | `apps/mobile/.env.local` | Convex HTTP URL (injected at build time for the client) |

The root layout throws if this is missing (`src/app/_layout.tsx`). Set it in `.env.local` or as an EAS secret for production builds.

---

## Scripts

Run from the **repo root** for the full dev experience:

| Command | Description |
|---------|-------------|
| `bun run start` | Codegen once + run Convex + Expo concurrently |
| `bun run mobile:dev` | Expo dev server only |
| `bun run convex:dev` | Convex dev server only |

Run from `apps/mobile/` for app-only tasks:

| Command | Description |
|---------|-------------|
| `bun run start` | `expo start --clear` |
| `bun run ios` / `bun run android` / `bun run web` | Platform runners |
| `bun run lint` / `bun run lint:fix` / `bun run lint:strict` | ESLint |

Install note: use `bun install` from the monorepo root only. Do not install dependencies inside `apps/mobile`.

---

## Local development (typical flow)

1. Install dependencies: `bun install` from repo root.
2. Set `EXPO_PUBLIC_CONVEX_URL` in `apps/mobile/.env.local`.
3. Run `bun run start` from repo root to sync Convex and launch Expo.

Use a **development build** (`expo-dev-client`) when you rely on native modules beyond Expo Go, per your `package.json` dependencies.

---

## App variants

`app.config.ts` reads **`APP_VARIANT`**:

- `development` → bundle id `com.ironkor.ironkor.development`, display name **Ironkor Dev**
- `beta` → `com.ironkor.ironkor.beta`, **Ironkor Beta**
- default → `com.ironkor.ironkor`, **Ironkor**

Use this to install multiple builds side by side.

---

## UI and theming

- **ThemeProvider** supports **light**, **dark**, and **system** alignment with the OS color scheme.
- Shared tokens live under `src/theme/` (colors, typography, spacing, radii).
- The workout shell uses a custom **tab bar** (`WorkoutBottomNav`) with a prominent center **Start** action.

---

## Notes and limitations (current codebase)

- **Authentication** is not wired; Convex functions are written for a single shared dataset as typical for early-stage apps—harden with auth and user-scoped tables before production.
- **Workout history** (`src/app/(workout)/history.tsx`) is driven by **mock data** (`src/features/workout/mockData.ts`) to prototype the UI; it is not registered as a main tab and does not persist logs to Convex yet.
- **Settings** toggles (e.g. auto-start timer, haptics) are **local UI state** and are not persisted or connected to workout execution in the backend.

---

## Contributing

Follow the repository commit message convention: prefixes such as `feat:`, `fix:`, `docs:`, etc., with imperative descriptions (see `.cursor/rules/commit_rules.mdc` if present).
