# IronKor Mobile Design System

## Design Direction
- Minimalist + energetic fitness UI
- Rounded modular cards with high contrast hierarchy
- Soft ambient glows to make screens feel alive
- Fast, thumb-friendly actions for between-set usage

## Token Architecture
- Core tokens: `src/theme/tokens.ts`
- Themes: `src/theme/lightTheme.ts`, `src/theme/darkTheme.ts`
- Provider/hook: `src/theme/ThemeProvider.tsx`

## Semantic Color Palette
- `background`, `backgroundElevated`
- `surface`, `surfaceAlt`, `surfaceMuted`
- `text`, `textMuted`, `textSubtle`
- `primary`, `primarySoft`, `onPrimary`
- `secondary`, `secondarySoft`, `onSecondary`
- `accent`, `accentSoft`, `onAccent`
- `success`, `successSoft`, `warning`, `warningSoft`, `error`, `errorSoft`
- `border`, `borderStrong`, `overlay`

## Typography Scale
- `xs` 11
- `sm` 12
- `md` 14
- `lg` 16
- `xl` 18
- `2xl` 22
- `3xl` 28
- `4xl` 34

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

## Main Screen Layouts
- Home:
  - Hero active-routine card
  - Today card with quick status
  - Session list cards
  - Floating "Start now" action
- Routines:
  - Active routine summary hero
  - Routine cards with quick action buttons
  - Swipe-to-delete action
  - Floating "New routine" action
- Start:
  - Today's workout hero with progress
  - Interactive exercise checklist rows
  - Completion chips + progress updates
- Plan:
  - Weekly day cards with workout/rest states
  - Day metadata and duration chips
- Settings:
  - Fast toggles
  - Theme mode switcher
- Routine Editor:
  - Tokenized form controls
  - Animated session/exercise rows
  - Planner chips and modal sheets
