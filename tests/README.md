# Cross-cutting tests

Unit tests live next to the code they test:

- `apps/web`, `packages/ui`: Vitest
- `apps/api/tests`: pytest

This folder is for tests that span the whole system (end-to-end flows against the Docker Compose stack, API contract checks between `apps/api` and `@opsforge/types`). Empty until the first feature needs one.
