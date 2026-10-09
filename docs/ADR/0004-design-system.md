# ADR-0004: Design system

- Status: Accepted
- Date: 2026-10-09

## Context

OPSFORGE should look light, neutral, professional, technical and slightly futuristic. It must avoid gaming UI, heavy neon, heavy glassmorphism, generic purple SaaS gradients, hacker aesthetics and gratuitous 3D. Pages must not duplicate styling.

## Decision

`@opsforge/ui` is the only place visual decisions are made. It builds on MUI.

- **Light first**, with a full dark mode. Preference is `light | dark | system`, default `light`, stored under `opsforge.color-mode`.
- **Tokens** (`theme/tokens.ts`): neutral blue-grey surfaces, a blue primary, a violet `ai` accent reserved for AI-generated content, semantic success/warning/error/info. Light-mode accents are darkened to meet WCAG AA contrast on white.
- **Typography:** Manrope for UI, Roboto Mono for commands, code and metrics (`mono`, `monoSmall`, `metric` variants, tabular numerals).
- **Spacing:** MUI's 8 px unit, halves for dense layouts. **Radius:** 6/8/12/16. **Elevation:** a soft, cool 25-step shadow scale used sparingly; borders do most of the separation.
- **Component overrides** live in `theme/components.ts` (buttons, cards, chips, badges, tabs, dialogs, drawers, progress, tooltip, inputs, list items, dividers, data grid).
- **Tone system:** `neutral | primary | ai | success | warning | error | info`, resolved once in `theme/tones.ts` and reused by chips, status indicators, score rings, progress bars, command cards and metric stats.
- **Presentational only:** components never decide what a score *means*. The caller passes value and tone; thresholds belong to the readiness engine.
- **Router-agnostic:** navigation components accept a `LinkComponent`; the app passes react-router's `NavLink`.
- **Accessibility built in:** `:focus-visible` outline, reduced-motion override, skip link, `aria-current`, `role="meter"` on score rings, labelled progress bars, labelled dialogs and tabs.
- **Living reference:** `/design-system` in development builds renders every component. It is excluded from production builds.

## Consequences

- New UI is composed from library components. A one-off style in a page is a smell; promote it into the library or theme instead.
- Changing the brand look means editing `tokens.ts` and `components.ts` only.
- The library depends on MUI, MUI X Data Grid and Framer Motion. Importing from the package index pulls the data grid into the main bundle; split the entry points if bundle size becomes a problem.
