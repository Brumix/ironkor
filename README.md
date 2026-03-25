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
ironkor-mobile/
├── app.config.ts          # Expo config (bundle IDs, EAS, variants)
├── src/
│   ├── app/               # Expo Router screens and layouts
│   │   ├── _layout.tsx    # ConvexProvider, theme, root stack
│   │   └── (workout)/     # Tabbed workout area (home, routines, start, plan, settings)
│   ├── components/        # UI primitives + workout-specific layout (e.g. WorkoutPage, bottom nav)
│   ├── features/workout/  # Mappers, selectors, types, mock data for UI experiments
│   └── theme/             # Light/dark themes, tokens, ThemeProvider
├── convex/                # Schema, routines & exercises API, generated types
└── assets/                # Images (e.g. app icon)
```

Path aliases: `@/*` → `src/*`, `@convex/*` → `convex/*` (see `tsconfig.json`).

---

## Convex data model (summary)

- **`routines`** — Name, `daysPerWeek`, `isActive`, `sessionOrder`, `weeklyPlan` (7 entries), timestamps.
- **`routineSessions`** — Belongs to a routine; ordered by `order`.
- **`exercises`** — Library of movements; `isCustom` distinguishes user-created rows.
- **`sessionExercises`** — Join of session ↔ exercise with ordering.

Main API modules: `convex/routines.ts` (routine lifecycle, sessions, weekly plan, seeding), `convex/exercises.ts` (list, create custom).

---

## Prerequisites

- **Node.js** (LTS recommended)
- A **Convex** project linked to this repo (`npx convex dev` will guide login and deployment selection)
- **pnpm**, **npm**, or **bun** for installs (scripts reference `pnpm` for parallel dev tasks)

For native builds, Xcode / Android SDK as required by Expo.

---

## Environment variables

The app expects a Convex deployment URL at runtime:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_CONVEX_URL` | Convex HTTP URL (injected at build time for the client) |

The root layout throws if this is missing (`src/app/_layout.tsx`). Configure it in your shell, `.env` (if you add one), or EAS secrets for production builds.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Runs `convex dev --once` then **concurrently** starts Expo and `convex dev` |
| `pnpm dev:expo` | `expo start --clear` |
| `pnpm dev:convex` | `npx convex dev` |
| `pnpm ios` / `pnpm android` / `pnpm web` | Platform runners |
| `pnpm lint` / `pnpm lint:fix` / `pnpm lint:strict` | ESLint |

The default **`start`** script runs nested `pnpm run dev:expo` and `pnpm run dev:convex`; use **pnpm** for that entry point, or run `dev:expo` and `dev:convex` in two terminals with your preferred package runner.

---

## Local development (typical flow)

1. Install dependencies: `pnpm install` (or equivalent).
2. Ensure Convex is configured (`npx convex dev` from the repo root at least once).
3. Set `EXPO_PUBLIC_CONVEX_URL` to your deployment URL.
4. Run `pnpm start` to sync Convex once and run both the Convex dev server and Expo.

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
