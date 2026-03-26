## Ironkor Architecture Contract

This repository is a **Bun workspace monorepo** designed to support multiple apps sharing one backend.

### Source of truth

- Backend: `convex/` (single shared Convex deployment)
- Shared contracts/utilities: `packages/shared` (`@ironkor/shared`)
- Apps: `apps/*` (currently `apps/mobile`, future `apps/web`, `apps/nutrition`, etc.)

### Scaling rules

1. **One backend, many clients**: new apps must consume the existing `convex/` project.
2. **Domain-first backend growth**: add new verticals as `convex/<domain>/` + `convex/schemas/<domain>*.ts`.
3. **Shared logic once**: move reusable enums/constants/types to `packages/shared`.
4. **App isolation**: each app owns only UI, routing, and app-local composition.
5. **Migration safety**: for schema/data changes on existing tables, use safe migration workflows.

### New app checklist

- Create `apps/<name>/package.json`
- Add `"convex"` and `"@ironkor/shared": "workspace:*"`
- Configure app env var to the same Convex URL
- Run workspace install and typecheck from root

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
