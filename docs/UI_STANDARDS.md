# UI Standards

Shared interaction standards for card-based list UIs across Ironkor clients.

## Card Action Buttons

- Use **icon-only** buttons for intuitive actions users immediately recognize (for example delete/trash, edit/pencil, reorder handle).
- Use **icon + label** buttons for actions that are not universally obvious from iconography alone (for example Program, Replace, Assign, Archive).
- Keep action rows consistent inside the same list: size, spacing, and visual hierarchy should match between cards.
- Destructive actions must use danger styling and destructive iconography (for example `trash-outline`) and should not rely on plain text abbreviations like `Del`.

## Card List Reordering

- For sortable card lists, use **drag-and-drop** as the default interaction.
- Do not implement up/down nudge controls as the primary ordering mechanism.
- Provide a visible drag handle with clear affordance and an accessibility label/hint describing reorder behavior.
- Keep reorder behavior aligned with the local editing contract of each screen (draft-local vs save-on-confirm flows).

## Accessibility Baseline

- Icon-only buttons must include descriptive `accessibilityLabel`.
- Drag handles must include reorder-focused `accessibilityLabel` and `accessibilityHint`.
- Keep touch targets thumb-friendly (minimum 44x44).
- Preserve strong contrast for action states in light and dark themes.
