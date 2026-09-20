# React Router v8 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `react-router-dom` with `react-router@8` and update all imports so the Vite SPA builds and runs without the removed package.

**Architecture:** Keep declarative mode (`HashRouter` + `Routes`/`Route`). Only change the dependency and import paths; routing structure and Hash strategy stay identical. DOM-specific deep imports (`react-router/dom`) are not needed for this app.

**Tech Stack:** `react-router@^8.4.0`, React 19, Vite 8, pnpm

## Global Constraints

- Node engines floor: `>=22.22.0` (React Router v8 requirement)
- React peer: already `react`/`react-dom` `^19.3.0` (satisfies `>=19.2.7`) — do not downgrade
- Package manager: pnpm only
- Do not migrate to Framework/Data mode
- Do not change routes, paths, or HashRouter usage
- Spec: `docs/superpowers/specs/2026-09-20-react-router-v8-migration-design.md`

## File Map

| File | Responsibility |
|------|----------------|
| `package.json` | Swap dependency; bump `engines.node` |
| `pnpm-lock.yaml` | Lockfile after install |
| `src/App.tsx` | App shell router imports |
| `src/pages/home/Home.tsx` | `Link` import |
| `src/pages/login/Login.tsx` | `Link` import |

**Working tree note:** There may already be uncommitted unrelated dependency bumps in `package.json` / `pnpm-lock.yaml`. Keep those changes; only replace `react-router-dom` with `react-router` and update `engines` as specified. Do not revert unrelated bumps.

---

### Task 1: Swap dependency and update engines

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (via pnpm)

**Interfaces:**
- Consumes: none
- Produces: `react-router` installed; `react-router-dom` absent from dependencies

- [ ] **Step 1: Remove old package and add react-router v8**

```bash
pnpm remove react-router-dom
pnpm add react-router@latest
```

Expected: install succeeds; `package.json` dependencies contain `"react-router": "^8.x.x"` and do not contain `react-router-dom`.

- [ ] **Step 2: Bump Node engines floor**

In `package.json`, set:

```json
"engines": {
  "node": ">=22.22.0"
}
```

- [ ] **Step 3: Verify lockfile has no react-router-dom dependency entry used by the app**

```bash
rg '"react-router-dom"' package.json || true
rg 'react-router-dom@' pnpm-lock.yaml | head
```

Expected: no match in `package.json`. Lockfile should not list `react-router-dom` as a direct dependency of `svg2react` (transitive absence is fine if none remain).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore(deps): migrate to react-router v8

EOF
)"
```

---

### Task 2: Update source imports

**Files:**
- Modify: `src/App.tsx` (line 1)
- Modify: `src/pages/home/Home.tsx` (line 1)
- Modify: `src/pages/login/Login.tsx` (line 1)

**Interfaces:**
- Consumes: `react-router` package from Task 1
- Produces: all app imports use `from "react-router"`

- [ ] **Step 1: Update App.tsx import**

Replace line 1:

```tsx
import { HashRouter, Route, Routes, useLocation } from "react-router";
```

Leave the rest of `App.tsx` unchanged (`HashRouter`, `Routes`, `Route`, `useLocation` usage stays the same).

- [ ] **Step 2: Update Home.tsx import**

Replace line 1:

```tsx
import { Link } from "react-router";
```

- [ ] **Step 3: Update Login.tsx import**

Replace line 1:

```tsx
import { Link } from "react-router";
```

- [ ] **Step 4: Confirm no remaining react-router-dom imports**

```bash
rg 'react-router-dom' src
```

Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/pages/home/Home.tsx src/pages/login/Login.tsx
git commit -m "$(cat <<'EOF'
refactor: import router APIs from react-router

EOF
)"
```

---

### Task 3: Verify build

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: Tasks 1–2 complete
- Produces: green `pnpm build`

- [ ] **Step 1: Run production build**

```bash
pnpm build
```

Expected: `tsc -b && vite build` exits 0 with no TypeScript errors related to `react-router` / `react-router-dom`.

- [ ] **Step 2: If build fails on missing types or wrong export path**

- Confirm imports are from `"react-router"` (not `"react-router-dom"`).
- Do **not** import `HashRouter` / `Link` / `useLocation` from `"react-router/dom"` — that path is only for `RouterProvider` / `HydratedRouter`.
- Fix and re-run `pnpm build` until green.
- Amend is not allowed if the previous commit was already successful without hooks rewriting files; make a new fix commit instead:

```bash
git add -u
git commit -m "$(cat <<'EOF'
fix: resolve react-router v8 build errors

EOF
)"
```

Only commit if there were actual fix changes; if Step 1 already passed, skip this commit.

---

## Spec Coverage Checklist

| Spec requirement | Task |
|------------------|------|
| Remove `react-router-dom`, add `react-router@8` | Task 1 |
| Update imports in App / Home / Login | Task 2 |
| Keep HashRouter + declarative APIs | Task 2 (no structural change) |
| `engines.node` `>=22.22.0` | Task 1 Step 2 |
| Do not change React versions | Global Constraints |
| `pnpm build` passes | Task 3 |
| No `react-router-dom` in package.json | Task 1 Step 3 |
