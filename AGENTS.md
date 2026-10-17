# AGENTS.md

## Commands

```bash
bun dev          # dev server :3000
bun build        # production
bun test         # vitest run (no tests exist yet)
bun lint         # eslint
bun typecheck    # tsc --noEmit
bun format       # prettier --write
bun check        # prettier --check
bun run db:seed  # tsx src/db/seed.ts

# Drizzle (use bunx):
bunx drizzle-kit generate   # schema → migration
bunx drizzle-kit migrate    # apply migration to local.db
bunx drizzle-kit studio     # open Drizzle Studio
```

Run verification order: `lint` → `typecheck` → `test`.

## Architecture

- **TanStack Start** (SSR) on Vite 8. File-based routes in `src/routes/`. `src/routeTree.gen.ts` — never edit manually.
- **Drizzle ORM** + libsql (SQLite). Schema in `src/db/schema/`, re-exported via `src/db/index.ts`. DB file: `local.db` (set via `DB_FILE_NAME` in `.env`). Migrations in `drizzle/`.
- **better-auth**: email/password auth. Route handler at `src/routes/api/auth/$.ts`. Client in `src/lib/auth-client.ts`, server auth in `src/lib/auth.ts`.
- **Server functions**: `createServerFn()` in `src/server/` files. Access request context via `getRequest()` from `@tanstack/react-start/server`.
- **Routing**: `_app` layout route guards all authenticated pages. Login/register are unauthenticated routes.

## UI conventions

- **shadcn/ui** (style: `base-nova`) on `@base-ui/react` + CVA. Components in `src/components/ui/`. Add new ones: `npx shadcn@latest add <name>`.
- **Tailwind CSS v4** — no `tailwind.config.js`. Config via `@theme` in `src/styles.css`. Dark glassmorphism only (always `.dark` on `<html>`). RTL.
- **`cn()`** from `@/lib/utils` for class merging.
- **Input components** at `src/components/inputs/` — **mandatory** over native `<input>`, `<textarea>`, `<select>` in forms:

| Component | Usage |
|---|---|
| `TextInput` / `TextAreaInput` | `forwardRef` — spread `{...register("field")}` |
| `SelectInput` / `CheckboxInput` | Controlled — use inside react-hook-form `<Controller>` |

No local inline form wrappers. No native HTML inputs in forms.

- **Feature components** in `src/features/<feature>/`.

## TypeScript

- `verbatimModuleSyntax: true` — use `import type` for type-only imports.
- `noUncheckedSideEffectImports: true` — all imports must be used or explicitly marked.
- Path alias: `@/` → `src/`.

## Prettier

```json
{ "semi": false, "singleQuote": false, "trailingComma": "es5", "endOfLine": "lf" }
```

Tailwind plugin configured with `tailwindFunctions: ["cn", "cva"]`.
