# AGENTS.md

Project guidance for AI/code agents working in the **Ironkor Mobile** app.

## Project Snapshot

- Mobile gym logbook built with Expo + React Native.
- Core UX goal: fast, low-friction workout tracking while in the gym.
- Main app area lives in `src/app/(workout)`.
- Backend uses Convex; root app requires `EXPO_PUBLIC_CONVEX_URL`.
- This app is part of the Ironkor monorepo — see root `AGENTS.md` for the full picture.

## Directory Layout

```
apps/mobile/
├── app.config.ts          # Expo config (bundle IDs, EAS, variants)
├── metro.config.js        # Monorepo-aware Metro config (watchFolders)
├── src/
│   ├── app/               # Expo Router screens and layouts
│   │   ├── _layout.tsx    # ConvexProvider, theme, root stack
│   │   └── (workout)/     # Tabbed workout area (home, routines, start, plan, settings)
│   ├── components/        # UI primitives + workout-specific layout
│   ├── features/workout/  # Mappers, selectors, types, mock data
│   └── theme/             # Light/dark themes, tokens, ThemeProvider
└── assets/                # Images (e.g. app icon)
```

Path aliases: `@/*` → `src/*`, `@convex/*` → `../../convex/*` (see `tsconfig.json`).

## Stack and Commands

- Stack: Expo SDK 55, React 19, React Native 0.83, Expo Router, Convex, TypeScript, ESLint flat config.
- Preferred package manager: Bun.
- Run everything from **repo root** with `bun run start` (Convex + Expo together).
- Run Expo only (from repo root): `bun run mobile:dev`
- Run from inside this folder: `bun run start` (Expo only)
- Lint (from this folder): `bun run lint`
- Lint (auto-fix): `bun run lint:fix`
- Typecheck (from repo root): `bun run typecheck`
- After non-trivial changes, always run `bun run lint` and `bun run typecheck` from root.

## Routing and Navigation

- Expo Router source is `src/app`.
- Keep tab navigation in `src/app/(workout)/_layout.tsx`.
- Keep hidden/editor flows registered in workout layout using `href: null`.
- When changing navigation, verify together:
  - `src/app/_layout.tsx`
  - `src/app/index.tsx`
  - `src/app/(workout)/_layout.tsx`
  - `src/components/workout/WorkoutBottomNav.tsx`
- Ensure custom tab bar route names match `Tabs.Screen` names.
- If route groups/pages are renamed, update redirects and typed routes, then recheck `.expo/types/router.d.ts`.
- If routes behave unexpectedly, clear Expo cache with `npx expo start -c`.

## UI and Theming

- Prefer semantic theme tokens over hardcoded colors.
- Theme entrypoint: `@/theme`.
- Read before styling changes:
  - `src/theme/README.md`
  - `src/theme/tokens.ts`
  - `src/theme/ThemeProvider.tsx`
- Reuse UI primitives before creating new ones:
  - `AppButton`, `AppCard`, `AppChip`, `AppTextField`
  - `FloatingActionButton`, `MetricCard`, `QuickActionTile`
  - `SectionHeader`, `PressableScale`, `WorkoutPage`
- Preserve visual language: premium fitness UI, strong contrast, warm gradients, rounded cards, thumb-friendly actions.

## Workout Feature Organization

- Shared workout domain code belongs in `src/features/workout`.
- Split feature logic by concern:
  - `types.ts` for domain types
  - `mockData.ts` for sample local data
  - `selectors.ts` for derived/planning logic
  - `mappers.ts` for transformation helpers
- Keep route files focused on composition, not heavy business logic.
- Placement defaults:
  - workout screens: `src/app/(workout)`
  - workout-specific reusable components: `src/components/workout`
  - generic reusable UI: `src/components/ui`
  - workout domain helpers: `src/features/workout`

## Data and State Rules

- If change is UI-only, avoid adding backend complexity.
- If persistence is needed, inspect Convex (`../../convex/`) before introducing local storage patterns.
- Do not replace Convex-backed behavior with mock/local-only state unless explicitly requested.
- Preserve existing environment requirements, including `EXPO_PUBLIC_CONVEX_URL`.
- Shared enums/types belong in `packages/shared` (`@ironkor/shared`), not in this app.

## Editing and Quality Rules

- Prefer small, surgical changes over broad rewrites.
- Preserve file and route names unless rename is required.
- Do not create parallel design systems or duplicate UI primitives.
- Avoid new dependencies unless there is clear payoff.
- Keep TypeScript strict and avoid `any`.
- Reuse established import and typing patterns.
- Prefer readable selectors/helpers over large inline screen calculations.
- For forms/editors, optimize for in-gym speed: minimal taps, clear hierarchy, large touch targets, obvious primary action.
- Keep product copy in English unless explicitly requested otherwise.

## Before Finishing

- Run `bun run lint` from this folder.
- Run `bun run typecheck` from repo root.
- If routes changed, note whether Expo cache clear may be needed.
- State assumptions clearly in the handoff.
