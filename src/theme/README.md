# IronKor Mobile Design System

## Design Direction
- Minimalist + energetic fitness UI
- Premium workout dashboard language with warm gradients and strong contrast
- Rounded modular cards with clear hierarchy for fast between-set scanning
- Soft ambient glows, elevated heroes, and tactile micro-interactions
- Thumb-friendly actions that keep common tasks within one or two taps

## Token Architecture
- Core tokens: `src/theme/tokens.ts`
- Themes: `src/theme/lightTheme.ts`, `src/theme/darkTheme.ts`
- Provider/hook: `src/theme/ThemeProvider.tsx`

## Semantic Color Palette
- `background`, `backgroundElevated`
- `surface`, `surfaceAlt`, `surfaceMuted`, `surfaceRaised`, `surfacePressed`
- `input`, `inputBorder`, `inputBorderStrong`
- `text`, `textMuted`, `textSubtle`, `textInverse`
- `heroText`, `heroTextMuted`
- `primary`, `primarySoft`, `onPrimary`
- `secondary`, `secondarySoft`, `onSecondary`
- `accent`, `accentSoft`, `accentStrong`, `onAccent`
- `success`, `successSoft`, `warning`, `warningSoft`, `error`, `errorSoft`, `onSuccess`
- `border`, `borderSoft`, `borderStrong`, `borderAccent`, `borderSuccess`
- `overlay`, `overlaySoft`, `shadow`, `shadowAccent`, `shadowSuccess`

## Typography Scale
- `xxs` 10
- `xs` 12
- `sm` 13
- `md` 15
- `lg` 17
- `xl` 20
- `2xl` 24
- `3xl` 30
- `4xl` 38
- `5xl` 48

Weights:
- `regular` 400
- `medium` 500
- `semibold` 600
- `bold` 700
- `black` 800

## Reusable UI Components
- `PressableScale`: tactile tap micro-interactions
- `AppCard`: modular card surface variants
- `AppButton`: semantic button variants/sizes
- `AppChip`: compact status labels
- `ProgressBar`: workout progress indicator
- `MetricCard`: summary tiles for momentum, performance, and plan snapshots
- `QuickActionTile`: shortcut cards for common gym actions
- `AppTextField`: labeled semantic text inputs
- `SectionHeader`: section title + action row
- `FloatingActionButton`: primary CTA for add/start actions
- `WorkoutPage`: animated screen shell + glow background
- `WorkoutBottomNav`: custom animated tab bar with central action

## Motion and Interaction Guidelines
- Enter animations:
  - `FadeInUp` for cards and list rows
  - `FadeInDown` for screen headers/hero
- Layout transitions:
  - `LinearTransition.springify()` for reordered or toggled items
- Tap feedback:
  - Scale-to-press on all actionable cards/buttons (`PressableScale`)
- Completion feedback:
  - Toggle state color shift + chip state update + progress bar fill
- Suggested next pass:
  - Swipeable set history rows
  - Animated check-in confetti on workout completion
  - Shared sheet component for add/edit flows

## Main Screen Layouts
- Home:
  - Motivational hero with today’s focus
  - Momentum metrics in modular cards
  - Quick actions for planning and routine management
  - Today card with workout density and fast start CTA
  - Session list cards with edit access
  - Floating "Start now" action
- Routines:
  - Active routine summary hero
  - Library overview metrics
  - Routine cards with status chips and quick action buttons
  - Swipe-to-delete action
  - Floating "New routine" action
- Start:
  - Today's workout hero with progress
  - Summary metrics for remaining work and rest demand
  - Interactive exercise checklist rows
  - Completion gradient state when the session is done
- Plan:
  - Weekly overview hero
  - Daily workout/rest cards with stronger hierarchy
  - Metadata chips and quick-scanning durations
- Settings:
  - Fast toggles
  - Theme mode switcher
  - Preference summary metrics
- Routine Editor:
  - Tokenized form controls
  - Animated session/exercise rows
  - Planner chips and modal sheets
