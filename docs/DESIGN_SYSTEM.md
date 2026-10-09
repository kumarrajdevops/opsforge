# OPSFORGE design system

Package: `packages/ui` (`@opsforge/ui`). Live reference: the **Design System** page in the web app (`/design-system`), which reads the real theme and follows the colour mode. Decisions behind the stack are in [ADR-0002](ADR/0002-engineering-standards.md). Requirements: UX-01 to UX-14 in [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md).

## 1. Direction

Light first, neutral, professional, technical, modern, engineering-focused, slightly futuristic. The interface is a calm instrument panel: neutral blue-grey surfaces, borders that do the separating, and colour kept for meaning.

| Do | Do not |
| --- | --- |
| Separate with borders and small, cool shadows | Neon glow, coloured shadows, glassmorphism |
| Use colour for state (healthy, degraded, AI) | Use colour as decoration or gradients as backgrounds |
| Set commands, versions, scores and metrics in the mono face | Use a terminal or hacker look, green on black, scan lines |
| Keep motion short and informative | Animate for effect, loop animations, parallax |
| Show state in text as well as colour | Rely on colour alone |

Dark mode is supported and follows the same tokens, but light is the reference.

## 2. Stack and where it lives

| Concern | Choice | Notes |
| --- | --- | --- |
| Components | MUI v9 | Primary foundation. Overrides live in `theme/components.ts` |
| Icons | `@mui/icons-material` | Default. Lucide is approved only where MUI Icons has no glyph (ADR-0002) and is not installed yet |
| Text face | Manrope | Loaded locally by `@fontsource`, no CDN |
| Technical face | Roboto Mono | Same |
| Motion | Framer Motion | Wrapped in `Reveal`, `PageTransition`, `Stagger`, `StateSwap`, `AnimatedNumber`. All respect reduced motion |
| Tables | MUI X Data Grid | Wrapped in `DataTable` |

Rule: components read tokens through the MUI theme (`theme.palette`, `theme.spacing`, `theme.opsforge`). They never import hex values. Business logic does not live in these components; they take props and render.

## 3. Tokens

Source of truth: `packages/ui/src/theme/tokens.ts`. Both modes define the same keys.

### Colour

| Group | Keys | Use |
| --- | --- | --- |
| Surfaces | `background.default`, `paper`, `raised`, `sunken` | Page, cards, popovers and menus, recessed groupings |
| Text | `text.primary`, `secondary`, `disabled` | Light values are tuned for WCAG AA on white and on the page background |
| Borders | `border.subtle`, `default`, `strong` | Dividers inside a surface, cards and inputs, emphasis |
| Tones | `primary`, `ai`, `success`, `warning`, `error`, `info` (plus `neutral`) | Meaning. `ai` (violet) marks AI-originated content only |

Never pick a tone colour by hand. `toneColors(theme, tone)` returns `solid` (fills, dots, bars), `fg` (text and icons, AA-safe), `bg` (soft tint), `border` and `contrastText`. All score, status and tag components use it, so the colours stay consistent.

### Typography

Variants are standard MUI (`h1` to `h6`, `subtitle1/2`, `body1/2`, `caption`, `overline`, `button`) plus three technical ones:

| Variant | Face | Use |
| --- | --- | --- |
| `mono` | Roboto Mono 13px | Commands, paths, identifiers |
| `monoSmall` | Roboto Mono 12px | Labels on tokens, table cells, hints |
| `metric` | Roboto Mono 24px | Large numbers. Tabular figures so values do not jitter |

### Spacing, radius, elevation, borders

| Token | Values |
| --- | --- |
| Spacing | MUI unit of 8px. Halves for dense layouts (0.5 is 4px, 1.5 is 12px) |
| Radius | `sm` 6, `md` 8 (default), `lg` 12, `xl` 16, `pill` 999. Read from `theme.opsforge.radius` |
| Elevation | `theme.shadows[0..24]`, generated in `theme/shadows.ts`. Cards at 1, menus at 8, dialogs at 16. Cool, never coloured. Dark mode uses stronger shadows |
| Borders | 1px, colour from `border.*` |
| Motion | `theme.opsforge.motion`: durations 90, 140, 220, 360 ms and three easings |
| Layout | `theme.opsforge.layout`: sidebar 264, top bar 56, content max width 1360 |

## 4. Components

| Area | Components | Notes |
| --- | --- | --- |
| Buttons | MUI `Button` with `color="ai"` added | Variants `contained`, `outlined`, `text`. No gradients |
| Cards and surfaces | `Panel`, `MetricStat`, MUI `Card` | `Panel` takes `title`, `subtitle`, `actions`, `recessed`, `flush` |
| Chips and badges | `ToneChip` (`tone`, `mono`), MUI `Badge`, `ScoreBadge` | `ToneChip mono` for technologies and versions |
| Tabs | `SectionTabs` (`items`, `label`, controlled or uncontrolled) | Needs an accessible `label` |
| Dialogs | `DialogShell`, `ConfirmDialog` (`destructive`) | Focus trapped, labelled, close on Escape |
| Drawers | `SideDrawer` (`title`, `subtitle`, `footer`) | |
| Tables | `DataTable` | Data Grid with the theme applied. Use `cellClassName: 'mono'` for technical columns |
| Progress | `ProgressBar` (`label`, `value`, `target`) | The label is required; a target marker shows the senior benchmark |
| Score | `ScoreRing`, `ScoreBadge`, `ScoreCell`, `LevelLadder`, `RadarChart`, `Sparkline` | Always carry a text label; `RadarChart` exposes every axis value in its accessible name |
| Status | `StatusIndicator` (`healthy`, `degraded`, `critical`, `info`, `unknown`; `dot` or `pill`; optional `pulse`) | Text always shown, not colour alone |
| Navigation | `AppShell`, `SidebarNav`, `Brand`, `PageHeader`, `ColorModeToggle` | `SidebarNav` is router-agnostic via `LinkComponent` and marks the active item with `aria-current` |
| Command blocks | `CommandCard` (`title`, `description`, `icon`, `tone`, `meta`, link or `onClick`) | An action tile, not a terminal |
| Technical code | `CodeBlock` (`code`, `language`, `title`, `prompt`, `copyable`, `wrap`), `InlineCode` | The prompt is not selectable and not copied |
| Motion | `Reveal`, `PageTransition`, `Stagger`, `StaggerItem`, `StateSwap`, `AnimatedNumber` | |

## 5. Accessibility rules

- State is never colour alone. Every status, score and delta carries text.
- Text and icon colours come from `toneColors().fg` or `text.*`, which meet AA contrast on their surface.
- Interactive components are keyboard operable and labelled. Dialogs and drawers trap focus.
- Motion respects `prefers-reduced-motion`; `pulse` and number animation switch off.
- Charts expose their values in an accessible name (`RadarChart` lists each axis and value). A visible table alternative for the 3D and graph views is still to be built.

## 6. Adding to the system

1. Check whether an MUI component with a theme override already does the job.
2. Build the component in `packages/ui/src/components`, read tokens from the theme, take everything through props, and export it from `src/index.ts`.
3. Add a test in `components.test.tsx` that checks behaviour and accessible names.
4. Add an example to the Design System page in the web app.
5. Do not add colours, radii or shadows in a component. Add a token first.

## 7. Known gaps

- No automated contrast, axe or screenshot checks (TODO S8). Contrast is by token design and manual review.
- Lucide is not installed. Add it with the first component that needs a glyph MUI Icons lacks.
- Form inputs (text fields, selects) use MUI defaults with the theme applied and have no dedicated OPSFORGE wrappers yet.
- The 3D and graph components (React Three Fiber, React Flow) are separate libraries and are outside this package until the modules that need them are built.
