# Neural Ops — DevOps Interview Brain

Light-neutral UI prototype for an AI-powered Senior DevOps interview preparation platform.

## UI v2
- Neutral light-first visual system with white surfaces and cool-gray canvas backgrounds.
- Material Symbols Outlined for dense technical navigation and actions.
- MUI-inspired spacing, elevation, focus rings, chips, cards, inspector panels, and interaction states.
- Typography: Manrope for product UI and Roboto Mono / JetBrains Mono for commands, telemetry, and technical values.
- Architecture Studio uses a lighter engineering canvas rather than a dark hacker aesthetic.
- Production-ready React stack is defined in `package.json` for the next implementation phase.

## Recommended MUI stack
- `@mui/material` — core components, theme system, responsive primitives.
- `@mui/icons-material` — Material icon set.
- `@mui/x-charts` — readiness, skill, incident and telemetry visualizations.
- `@mui/x-data-grid` — documents, questions, evidence and readiness tables.
- `@emotion/react`, `@emotion/styled` — MUI styling engine.
- `lucide-react` — secondary technical/diagram icon set where Material icons are too generic.
- `@fontsource/manrope`, `@fontsource/roboto-mono` — deterministic typography without relying on Google Fonts at runtime.
- `react-router-dom` — application-level navigation.
- `react-use` — lightweight interaction/state utilities.

## Run the current static prototype
Open `index.html` directly in a browser.

## Motion and 3D direction
- `framer-motion` — primary React UI motion and layout transitions.
- `three` + `@react-three/fiber` + `@react-three/drei` — selective 3D neural/system visualizations.
- `@xyflow/react` — architecture topology editor and connected infrastructure diagrams.
- `gsap` — complex deterministic incident/interview timelines.
- `lucide-react` + `@mui/icons-material` — rich technical iconography.

The current static prototype previews this direction with lightweight CSS motion so it remains runnable without installing dependencies. The package manifest is ready for the React implementation.

## Production direction
Migrate each page into React + TypeScript and use a single MUI `ThemeProvider`. Keep deterministic readiness calculations in the domain layer and use AI only for semantic evaluation/tutoring.
