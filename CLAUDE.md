# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start dev server on port 3000
bun build        # Production build
bun test         # Run tests (vitest)
bun lint         # ESLint
bun typecheck    # tsc --noEmit
bun format       # Prettier write
bun check        # Prettier check
```

Drizzle database commands (run with `bunx` or `npx`):
```bash
bunx drizzle-kit generate   # Generate migrations from schema
bunx drizzle-kit migrate    # Apply migrations to the Postgres DB (DATABASE_URL)
bunx drizzle-kit studio     # Open Drizzle Studio
```

## Architecture

**TanStack Start** (SSR framework) on top of **Vite 8**. Routes are file-based under `src/routes/` and the route tree is auto-generated into `src/routeTree.gen.ts` — never edit that file manually. The router is configured in `src/router.tsx`.

**Database**: Drizzle ORM with PostgreSQL (Neon) via `node-postgres`, configured by `DATABASE_URL` in `.env`. All primary keys are `uuid` (`defaultRandom()`); better-auth uses `generateId: "uuid"`. Text timestamps default to `nowText` from `src/db/schema/_common.ts`. Use `.then(first)` / `.then(one)` from `@/db` instead of SQLite `.get()`. `scripts/migrate-sqlite-to-pg.ts` is the one-off copy from the old `local.db`. Schema lives in `src/db/schema/`, imported and re-exported through `src/db/index.ts`. Migrations output to `drizzle/`.

**UI components**: shadcn/ui components (style: `base-nova`) built on `@base-ui/react` primitives with `class-variance-authority` for variants. Components live in `src/components/ui/`. Add new shadcn components with:
```bash
npx shadcn@latest add <component>
```

**Styling**: Tailwind CSS v4 (no `tailwind.config.js` — configured via CSS in `src/styles.css`). The project is RTL (`rtl: true` in `components.json`). Use the `cn()` helper from `@/lib/utils` for conditional class merging.

**Path alias**: `@/` resolves to `src/`.

**Feature structure**: Feature-specific components go in `src/features/<feature>/` (e.g., `src/features/auth/LoginForm.tsx`). Shared UI primitives stay in `src/components/ui/`.

**Feature content pattern (tab dispatcher)**: For any feature page/panel with multiple sub-views (tabs), follow the pattern used in `src/features/watchlist/` and `src/features/settings/`:
- `src/features/<feature>/Content.tsx` — a **thin tab dispatcher only**. One `<TabsContent>` per tab, each delegating to a single component. Adding a new tab = one `<TabsTrigger>` (in the shell/header) + one `<TabsContent>` here + one new component file. Never put tab-specific markup or logic directly inside `Content.tsx`.
- `src/features/<feature>/detail/` (or `components/detail/` if the feature also has a non-tab `components/` folder) — one component per tab (e.g. `ChartTabContent.tsx`, `AnalysisTabContent.tsx`, `CurrencyDisplayContent.tsx`). Each owns its own data fetching (`useQuery` / server fn) and renders its own `Card`(s) — no shared state lives in `Content.tsx` beyond `activeTab`.
- `src/features/<feature>/types.ts` — shared `type` aliases only (e.g. `ActiveTab`), **not** component-local `Props` interfaces. Props interfaces stay next to the component that uses them.
- The route file (`src/routes/...`) stays a thin shell: page header + `<Content />`. No tab/business logic in the route file itself.

**Input components**: Reusable form input wrappers live in `src/components/inputs/`. **Always use these instead of native HTML inputs or building new ones from scratch.** Each wraps a shadcn/ui primitive and handles label, error message, and description display consistently.

| Component | File | Use for |
|---|---|---|
| `TextInput` | `inputs/TextInput.tsx` | text, number, datetime-local, and other `<input>` types |
| `TextAreaInput` | `inputs/TextAreaInput.tsx` | multi-line text (`<textarea>`) |
| `SelectInput` | `inputs/SelectInput.tsx` | dropdown selection (uses shadcn `Select`) |
| `CheckboxInput` | `inputs/CheckboxInput.tsx` | boolean toggles (uses shadcn `Checkbox`) |

`TextInput` and `TextAreaInput` are `forwardRef` components — spread `{...register("field")}` directly. `SelectInput` and `CheckboxInput` are controlled and must be used inside a react-hook-form `<Controller>` (pass `field.value` / `field.onChange`).

**MANDATORY**: Never use native `<input>`, `<textarea>`, or `<select>` elements in forms. Never create local inline wrappers (e.g. a `function Input()` inside a form file). Always use the shared inputs above, or install a new shadcn component first (`npx shadcn@latest add <component>`) and create a corresponding wrapper in `src/components/inputs/`.

**Charts**: `lightweight-charts` v5 is available for trading chart visualizations.

**Prefer shadcn components over raw native elements everywhere, not just forms**: For text, use `Typography` (`@/components/ui/typography`) with a `variant` (`h1`, `muted`, `caption`, etc.) instead of raw `<h1>`, `<p>`, `<span>`. For badges, buttons, cards, tabs, progress bars, etc., use the matching component in `src/components/ui/` instead of hand-rolled `<div>`/`<span>` markup with ad-hoc classes. If the primitive you need isn't installed yet, run `npx shadcn@latest add <component>` first — if it needs feature-specific wrapping (like the `inputs/` components), create that wrapper in `src/components/<area>/` rather than inlining a one-off in the feature file.
