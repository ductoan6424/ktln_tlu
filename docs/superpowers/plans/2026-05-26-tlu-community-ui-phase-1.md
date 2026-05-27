# TLU Community UI Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the TLU Community foundation, application shell, authentication entry surfaces, feed chrome and official-announcement presentation to match the approved TLU design system without changing data or authorization behavior.

**Architecture:** Implement the refactor from the bottom up: establish semantic brand/status tokens and compatible reusable primitives first, then adopt them in navigation and authentication, then convert the feed and official-announcement surfaces. Existing Next.js route boundaries, Base UI/shadcn primitive APIs, server actions and realtime behavior remain unchanged; observable UI contracts are protected with focused Vitest tests before each production edit.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 token variables in `src/app/globals.css`, shadcn/base-nova on Base UI, Vitest with server-render/source-contract tests, browser visual QA.

**Design References:** `docs/TLU-COMMUNITY-DESIGN.md` and `docs/superpowers/specs/2026-05-26-tlu-community-ui-phase-1-design.md`.

---

## File Map

| Responsibility | Files |
| --- | --- |
| Theme and semantic component roles | `src/app/globals.css`, `src/components/ui/button-variants.ts`, `src/components/ui/badge.tsx`, `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/toast.tsx`, `src/components/shared/status-badge.tsx`, `src/components/shared/tab-navigation.tsx`, `src/components/shared/empty-state.tsx` |
| Shell identity and navigation | `src/components/layout/app-logo.tsx`, `src/components/layout/top-navbar.tsx`, `src/components/layout/navbar-link.tsx`, `src/components/layout/main-sidebar.tsx`, `src/components/layout/sidebar-nav-item.tsx`, `src/components/layout/mobile-bottom-nav.tsx`, `src/components/layout/page-container.tsx`, `src/components/layout/page-footer.tsx` |
| Auth branded entry | `src/components/layout/auth-layout.tsx`, `src/components/auth/login-card.tsx`, `src/components/auth/login-form.tsx`, `src/components/auth/register-card.tsx`, `src/components/auth/forgot-password-card.tsx`, `src/components/auth/auth-status-card.tsx`, local reset/status auth route components as found during execution |
| Feed hierarchy | `src/app/(main)/feed/feed-page-client.tsx`, `src/components/feed/post-composer.tsx`, `src/components/feed/post-card.tsx`, `src/components/feed/feed-empty-state.tsx`, `src/components/dashboard/event-item.tsx`, `src/components/dashboard/trending-item.tsx` |
| Official content semantics | `src/components/feed/announcement-feed-card.tsx`, `src/components/feed/announcement-strip.tsx`, `src/components/feed/announcement-card.tsx`, `src/components/feed/announcement-detail-dialog.tsx`, `src/components/admin/announcement-preview.tsx` |
| Test gates | Existing `tests/auth/auth-route-layout.test.ts`, `tests/layout/main-layout-chat-dock.test.ts`, `tests/components/feed-page-chat-dock.test.ts`, `tests/components/announcement-recipient-ui.test.ts`, `tests/components/announcement-governance-ui.test.ts`; create `tests/components/tlu-design-primitives.test.ts`, `tests/components/tlu-shell-ui.test.ts`, `tests/auth/auth-brand-surface.test.ts` |

## Task 1: Lock Semantic Brand And Primitive Contracts

**Files:**
- Create: `tests/components/tlu-design-primitives.test.ts`
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/button-variants.ts`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/textarea.tsx`
- Modify: `src/components/ui/tabs.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/components/ui/toast.tsx`
- Modify: `src/components/shared/status-badge.tsx`
- Modify: `src/components/shared/tab-navigation.tsx`
- Modify: `src/components/shared/empty-state.tsx`

- [ ] **Step 1: Add a failing source-contract test for TLU semantic roles**

```ts
import { readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const read = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("TLU design primitive contracts", () => {
  it("declares separate brand, official and critical semantic token roles", () => {
    const css = read("src/app/globals.css")

    expect(css).toContain("--brand-indigo:")
    expect(css).toContain("--brand-scarlet:")
    expect(css).toContain("--official:")
    expect(css).toContain("--official-soft:")
    expect(css).toContain("--destructive:")
    expect(css).toContain("--color-official: var(--official)")
  })

  it("exposes official badge meaning independently from destructive meaning", () => {
    const badge = read("src/components/ui/badge.tsx")
    const status = read("src/components/shared/status-badge.tsx")

    expect(badge).toContain('official:')
    expect(status).toContain('official:')
    expect(status).not.toContain('accent: "bg-destructive/10')
  })
})
```

- [ ] **Step 2: Run the contract test and confirm it fails because the semantic role is absent**

Run: `npx vitest run tests/components/tlu-design-primitives.test.ts`

Expected: FAIL on missing `--brand-indigo`, `--official` and/or `official:` variants in current sources.

- [ ] **Step 3: Add semantic design tokens to the Tailwind v4 theme source**

In `src/app/globals.css`, preserve existing semantic aliases and add explicit mapped roles in `@theme inline` and in light/dark token blocks:

```css
@theme inline {
  --color-brand-indigo: var(--brand-indigo);
  --color-brand-scarlet: var(--brand-scarlet);
  --color-official: var(--official);
  --color-official-foreground: var(--official-foreground);
  --color-official-soft: var(--official-soft);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
}

:root {
  --brand-indigo: #000066;
  --brand-scarlet: #f32409;
  --official: #f32409;
  --official-foreground: #9c1b0a;
  --official-soft: #fff0ed;
  --success: #15803d;
  --success-soft: #ecfdf3;
  --warning: #b45309;
  --warning-soft: #fff7ed;
  --info: #1d4ed8;
  --info-soft: #eff6ff;
  --destructive: oklch(0.53 0.22 25);
}

.dark,
[data-theme-preference="dark"] {
  --brand-indigo: #9ea8ff;
  --brand-scarlet: #ff7563;
  --official: #ff7563;
  --official-foreground: #ffd6d0;
  --official-soft: oklch(0.28 0.08 28);
  --success: #4ade80;
  --success-soft: oklch(0.25 0.06 150);
  --warning: #fbbf24;
  --warning-soft: oklch(0.27 0.05 80);
  --info: #93c5fd;
  --info-soft: oklch(0.26 0.06 255);
}
```

Apply the same role declarations inside the `prefers-color-scheme` system-theme block so all three theme modes share the role model. Replace the former brand-red/destructive comment and decoration utilities with named identity utilities:

```css
@layer utilities {
  .brand-panel {
    background: var(--brand-indigo);
    color: white;
  }

  .official-marker {
    background: var(--brand-scarlet);
  }

  .tlu-geometry {
    background-image:
      radial-gradient(circle at 88% 16%, rgb(243 36 9 / 0.2) 0 4.5rem, transparent 4.55rem),
      linear-gradient(135deg, transparent 0 62%, rgb(255 255 255 / 0.08) 62% 72%, transparent 72%);
  }
}
```

- [ ] **Step 4: Extend primitives without breaking their current props**

Update badge variants and semantic shared badges with role-based classes:

```ts
// src/components/ui/badge.tsx variant map additions
official:
  "border-official/20 bg-official-soft text-official-foreground [a]:hover:bg-official-soft/80",
success:
  "border-success/20 bg-success-soft text-success",
warning:
  "border-warning/20 bg-warning-soft text-warning",
info:
  "border-info/20 bg-info-soft text-info",
```

```ts
// src/components/shared/status-badge.tsx
const VARIANT_CLASSES = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  official: "border-official/20 bg-official-soft text-official-foreground",
  critical: "border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border-warning/20 bg-warning-soft text-warning",
  success: "border-success/20 bg-success-soft text-success",
  info: "border-info/20 bg-info-soft text-info",
  muted: "border-border bg-muted text-muted-foreground",
} as const
```

Normalize primitive chrome while retaining public APIs:

```ts
// examples of intended class changes
// button-variants.ts
"... rounded-full ... focus-visible:ring-3 ...";
// card.tsx
"... rounded-2xl border border-border/70 bg-card ... shadow-sm ...";
// input.tsx and textarea.tsx
"... min-h-11 rounded-xl border-input bg-card ...";
// dialog.tsx and dropdown-menu.tsx
"... rounded-2xl border border-border/70 bg-popover shadow-xl ...";
```

Replace raw template class concatenation in `toast.tsx` with `cn()` and semantic role classes, and update `TabNavigation`/`EmptyState` to use rounded pill controls, `gap-*` layout and role-based surfaces.

- [ ] **Step 5: Run the focused primitive test and lint touched primitive files**

Run: `npx vitest run tests/components/tlu-design-primitives.test.ts`

Expected: PASS.

Run: `npx eslint src/app/globals.css src/components/ui/button-variants.ts src/components/ui/badge.tsx src/components/ui/card.tsx src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/tabs.tsx src/components/ui/dialog.tsx src/components/ui/dropdown-menu.tsx src/components/ui/toast.tsx src/components/shared/status-badge.tsx src/components/shared/tab-navigation.tsx src/components/shared/empty-state.tsx tests/components/tlu-design-primitives.test.ts`

Expected: exit code `0` with no errors.

- [ ] **Step 6: Commit the primitive foundation**

```powershell
git add src/app/globals.css src/components/ui/button-variants.ts src/components/ui/badge.tsx src/components/ui/card.tsx src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/tabs.tsx src/components/ui/dialog.tsx src/components/ui/dropdown-menu.tsx src/components/ui/toast.tsx src/components/shared/status-badge.tsx src/components/shared/tab-navigation.tsx src/components/shared/empty-state.tsx tests/components/tlu-design-primitives.test.ts
git commit -m "feat: apply TLU semantic UI foundation"
```

## Task 2: Establish Approved Visual References For Converted Surfaces

**Files:**
- Reference: `docs/TLU-COMMUNITY-DESIGN.md`
- Reference: `docs/superpowers/specs/2026-05-26-tlu-community-ui-phase-1-design.md`
- Reference images: generated in the Codex thread for comparison during Tasks 3-6

- [ ] **Step 1: Generate one desktop concept for the branded auth entry surface**

Use Image Gen with this locked prompt:

```text
Desktop UI concept screenshot for TLU Community login, 1440x1024. Vietnamese university community product. Left 44% deep Thang Long Indigo (#000066) brand panel with restrained circle-square-triangle geometric motif in translucent Scarlet (#F32409) and white, official university community wording, compact TLU logo treatment. Right 56% warm white canvas with a single rounded white login card, Manrope/Be Vietnam Pro-like legible typography, royal-blue everyday primary CTA, calm neutral borders, no photography, no Meta styling. Modern accessible web app, realistic spacing, complete navbar/help/footer details.
```

Expected: a readable full auth screen matching the approved identity roles and two-region desktop layout.

- [ ] **Step 2: Generate one desktop concept for feed plus official notice anatomy**

Use Image Gen with this locked prompt:

```text
Desktop UI concept screenshot for TLU Community home feed, 1440x1100. White top navigation, Indigo identity mark, three-column daily community layout. Center stream includes composer, an ordinary student post, and an official university notice card with a thin Scarlet marker, pale Scarlet official badge, unit name and audience metadata; red is not used for errors. Everyday buttons use interaction blue, surfaces are airy rounded cards with subtle borders, restrained campus identity, Vietnamese labels, highly readable functional product.
```

Expected: a comparison reference for shell/feed/official surfaces, preserving current three-zone architecture.

- [ ] **Step 3: Generate a mobile reference for responsive auth and feed navigation**

Use Image Gen with this locked prompt:

```text
Mobile UI concept screenshot pair for TLU Community at 390x844: login screen and feed screen. Login has compact Indigo brand header with a small Scarlet geometric accent above a white rounded form card. Feed has compact white header, official notice marker visible in a single-column stream, and a five-item bottom navigation with Indigo selected state and Scarlet unread dot only. Vietnamese labels, accessible tap sizes, no decorative obstruction.
```

Expected: responsive reference for the mobile rules in the approved spec.

- [ ] **Step 4: Compare generated references against the design guide before source edits**

Confirm the concepts use:

```text
Indigo = structural/brand identity
Scarlet = official marker and unread attention only
Blue = ordinary action/selection
Critical = error/withdrawn presentation, not ordinary official identity
Auth = branded panel/header plus readable form
Feed = existing three-zone/single-column hierarchy retained
```

Expected: concepts are accepted for implementation comparison; regenerate a surface if it violates any listed mapping.

## Task 3: Refactor Main Application Shell And Navigation

**Files:**
- Create: `tests/components/tlu-shell-ui.test.ts`
- Modify: `src/components/layout/app-logo.tsx`
- Modify: `src/components/layout/top-navbar.tsx`
- Modify: `src/components/layout/navbar-link.tsx`
- Modify: `src/components/layout/main-sidebar.tsx`
- Modify: `src/components/layout/sidebar-nav-item.tsx`
- Modify: `src/components/layout/mobile-bottom-nav.tsx`
- Modify: `src/components/layout/page-container.tsx`
- Modify: `src/components/layout/page-footer.tsx`

- [ ] **Step 1: Write failing shell source-contract tests**

```ts
import { readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8")

describe("TLU shell visual contracts", () => {
  it("keeps shell selection primary while unread attention is official", () => {
    const mobile = source("src/components/layout/mobile-bottom-nav.tsx")
    const sidebarItem = source("src/components/layout/sidebar-nav-item.tsx")

    expect(mobile).toContain("bg-official")
    expect(mobile).not.toContain("bg-destructive text-white")
    expect(sidebarItem).toContain("bg-primary/10 text-primary")
  })

  it("brands the app logo with the identity color role", () => {
    expect(source("src/components/layout/app-logo.tsx")).toContain("text-brand-indigo")
  })
})
```

- [ ] **Step 2: Run the shell contract test and verify the unread-marker expectation fails**

Run: `npx vitest run tests/components/tlu-shell-ui.test.ts tests/layout/main-nav-items.test.ts tests/layout/main-layout-chat-dock.test.ts`

Expected: FAIL because mobile unread badges currently use `bg-destructive` and the logo does not declare brand identity styling.

- [ ] **Step 3: Apply shell styling while preserving navigation behavior**

Implement these exact role changes:

```tsx
// src/components/layout/app-logo.tsx heading treatment
<h1 className={cn(text, "font-semibold tracking-tight text-brand-indigo dark:text-foreground leading-none")}>
  TLU Community
</h1>

// src/components/layout/mobile-bottom-nav.tsx unread count treatment
<span className="absolute -right-2 -top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-official px-1 text-[9px] font-bold leading-none text-white">
  {badge > 99 ? "99+" : badge}
</span>
```

Retain existing route maps, counts and logout/dark-mode handlers. Apply consistent shell classes:

```tsx
// intended anatomy across shell components
"border-border/70 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90"
"rounded-xl bg-primary/10 text-primary" // selected item
"rounded-full" // icon/avatar/menu triggers
"mx-auto w-full max-w-7xl px-4 py-5 lg:px-8" // page rhythm
```

Replace `space-y-*` stacks touched in shell files with `flex flex-col gap-*`, leaving component behavior unchanged.

- [ ] **Step 4: Run shell and main-layout regression tests**

Run: `npx vitest run tests/components/tlu-shell-ui.test.ts tests/layout/main-nav-items.test.ts tests/layout/main-layout-chat-dock.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit shell changes**

```powershell
git add src/components/layout/app-logo.tsx src/components/layout/top-navbar.tsx src/components/layout/navbar-link.tsx src/components/layout/main-sidebar.tsx src/components/layout/sidebar-nav-item.tsx src/components/layout/mobile-bottom-nav.tsx src/components/layout/page-container.tsx src/components/layout/page-footer.tsx tests/components/tlu-shell-ui.test.ts
git commit -m "feat: refactor TLU application shell styling"
```

## Task 4: Build The Branded Authentication Entry Experience

**Files:**
- Create: `tests/auth/auth-brand-surface.test.ts`
- Modify: `src/components/layout/auth-layout.tsx`
- Modify: `src/components/auth/login-card.tsx`
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/components/auth/register-card.tsx`
- Modify: `src/components/auth/forgot-password-card.tsx`
- Modify: `src/components/auth/auth-status-card.tsx`
- Inspect and modify when rendering local UI: `src/app/(auth)/reset-password/page.tsx`, `src/app/(auth)/complete-contact-email/complete-contact-email-card.tsx`

- [ ] **Step 1: Write failing auth surface tests**

```ts
import { readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8")

describe("branded authentication surfaces", () => {
  it("renders a two-region TLU identity layout with compact mobile support", () => {
    const layout = read("src/components/layout/auth-layout.tsx")

    expect(layout).toContain("brand-panel")
    expect(layout).toContain("tlu-geometry")
    expect(layout).toContain("Cộng đồng Đại học Thăng Long")
    expect(layout).toContain("lg:grid-cols")
  })

  it("uses semantic auth feedback rather than raw color helpers", () => {
    const register = read("src/components/auth/register-card.tsx")

    expect(register).toContain("bg-success-soft")
    expect(register).not.toContain("bg-emerald-100")
    expect(register).not.toContain("bg-yellow-500")
  })
})
```

- [ ] **Step 2: Run auth tests and confirm the branded-layout assertions fail**

Run: `npx vitest run tests/auth/auth-brand-surface.test.ts tests/auth/auth-route-layout.test.ts tests/auth/register.test.ts`

Expected: FAIL because the current auth layout is a centered neutral surface and register feedback still uses raw color classes.

- [ ] **Step 3: Compose desktop brand panel and compact mobile brand header**

Update `AuthLayout` to retain support/footer routing while introducing the approved structure:

```tsx
<div className="min-h-dvh bg-background">
  <div className="grid min-h-dvh lg:grid-cols-[minmax(360px,44%)_1fr]">
    <aside className="brand-panel tlu-geometry hidden flex-col justify-between p-10 lg:flex xl:p-14">
      <AppLogo size="md" className="[&_h1]:text-white" />
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
          TLU Community
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">
          Cộng đồng Đại học Thăng Long
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/76">
          Kết nối học tập, hoạt động và thông báo chính thức trong một không gian đáng tin cậy.
        </p>
      </div>
    </aside>
    <section className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-5 sm:px-8 lg:px-10">
        <AppLogo size="sm" className="lg:hidden" />
        {/* existing support link */}
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-8 sm:px-8">
        <div className="w-full max-w-[460px]">{children}</div>
      </main>
      <PageFooter variant="simple" />
    </section>
  </div>
</div>
```

- [ ] **Step 4: Normalize auth cards and semantic feedback**

Use the updated primitives and semantic roles without changing submit/validation logic:

```tsx
<Card className="border-border/70 shadow-sm">
  <CardContent className="flex flex-col gap-7 p-6 sm:p-8">
    {/* existing content and handlers */}
  </CardContent>
</Card>
```

Replace auth raw success/warning treatment:

```ts
function getPasswordStrength(password: string) {
  // preserve scoring logic
  if (score <= 1) return { score, label: "Yếu", color: "bg-destructive" }
  if (score <= 3) return { score, label: "Trung bình", color: "bg-warning" }
  return { score, label: score <= 4 ? "Khá mạnh" : "Mạnh", color: "bg-success" }
}
```

```tsx
<div className="flex size-16 items-center justify-center rounded-full bg-success-soft">
  <Check className="size-8 text-success" />
</div>
```

Error callouts remain destructive because they communicate validation/action failure.

- [ ] **Step 5: Run auth regression tests**

Run: `npx vitest run tests/auth/auth-brand-surface.test.ts tests/auth/auth-route-layout.test.ts tests/auth/register.test.ts tests/actions/auth-school-login.test.ts tests/actions/auth-sign-out-others.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit authentication conversion**

```powershell
git add src/components/layout/auth-layout.tsx src/components/auth/login-card.tsx src/components/auth/login-form.tsx src/components/auth/register-card.tsx src/components/auth/forgot-password-card.tsx src/components/auth/auth-status-card.tsx src/app/(auth)/reset-password/page.tsx src/app/(auth)/complete-contact-email/complete-contact-email-card.tsx tests/auth/auth-brand-surface.test.ts
git commit -m "feat: add branded TLU authentication surfaces"
```

Only add the listed optional route files if execution actually changes them.

## Task 5: Separate Official Identity From Critical Announcement States

**Files:**
- Modify: `tests/components/announcement-recipient-ui.test.ts`
- Modify: `tests/components/announcement-governance-ui.test.ts`
- Modify: `src/components/feed/announcement-feed-card.tsx`
- Modify: `src/components/feed/announcement-strip.tsx`
- Modify: `src/components/feed/announcement-card.tsx`
- Modify: `src/components/feed/announcement-detail-dialog.tsx`
- Modify: `src/components/admin/announcement-preview.tsx`

- [ ] **Step 1: Extend existing recipient tests with official-versus-critical assertions**

Add an active notice test and strengthen withdrawal coverage:

```ts
it("marks active official notices with the official role without destructive chrome", () => {
  const markup = renderToStaticMarkup(
    createElement(AnnouncementFeedCard, {
      id: "ann-official",
      title: "Lich thi K38",
      content: "Noi dung chinh thuc",
      status: "PUBLISHED",
      pinToTop: true,
      issuingUnitName: "Phong Dao tao",
      publishedAt: "2026-05-26T03:00:00.000Z",
    }),
  )

  expect(markup).toContain("bg-official")
  expect(markup).toContain("bg-official-soft")
  expect(markup).not.toContain("border-destructive/20")
})

it("keeps withdrawal explanation in critical styling", () => {
  const markup = renderToStaticMarkup(/* WITHDRAWN props already used in this suite */)
  expect(markup).toContain("bg-destructive")
  expect(markup).toContain("Lý do thu hồi")
})
```

Extend governance preview coverage:

```ts
import { AnnouncementPreview } from "@/components/admin/announcement-preview"

it("uses official preview anatomy for school notices", () => {
  const markup = renderToStaticMarkup(
    createElement(AnnouncementPreview, {
      title: "Thong bao hoc vu",
      content: "Noi dung",
      pinToTop: true,
    }),
  )

  expect(markup).toContain("bg-official")
  expect(markup).toContain("ThÃ´ng bÃ¡o")
})
```

- [ ] **Step 2: Run announcement tests and verify they fail on current destructive official chrome**

Run: `npx vitest run tests/components/announcement-recipient-ui.test.ts tests/components/announcement-governance-ui.test.ts`

Expected: FAIL because pinned/official rendering currently includes `bg-destructive` or lacks `bg-official` treatment.

- [ ] **Step 3: Convert official content surfaces to named official styling**

Apply shared anatomy in recipient and preview components:

```tsx
<Card className={cn("relative overflow-hidden border-official/15 bg-card", className)}>
  {pinToTop && (
    <div className="official-marker absolute inset-y-0 left-0 w-1" aria-hidden="true" />
  )}
  {/* school avatar and metadata remain */}
  <StatusBadge variant="official">
    <Megaphone data-icon="inline-start" />
    Thông báo chính thức
  </StatusBadge>
</Card>
```

Map state labels explicitly:

```tsx
{status === "WITHDRAWN" && <StatusBadge variant="critical">Đã thu hồi</StatusBadge>}
{status === "SUPERSEDED" && <StatusBadge variant="warning">Đã thay thế</StatusBadge>}
{priority === "URGENT" && <StatusBadge variant="warning">Khẩn cấp</StatusBadge>}
```

Keep withdrawal reason destructive:

```tsx
<p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
  Lý do thu hồi: {withdrawalReason}
</p>
```

Use the same official marker/badge and metadata hierarchy in `AnnouncementPreview`, strip cards and detail dialog; do not change click, saved, acknowledge, target or publication behavior.

- [ ] **Step 4: Run announcement and related query/action regression tests**

Run: `npx vitest run tests/components/announcement-recipient-ui.test.ts tests/components/announcement-governance-ui.test.ts tests/lib/announcement-publication.test.ts tests/lib/announcement-queries.test.ts tests/actions/announcements.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit official identity conversion**

```powershell
git add tests/components/announcement-recipient-ui.test.ts tests/components/announcement-governance-ui.test.ts src/components/feed/announcement-feed-card.tsx src/components/feed/announcement-strip.tsx src/components/feed/announcement-card.tsx src/components/feed/announcement-detail-dialog.tsx src/components/admin/announcement-preview.tsx
git commit -m "feat: distinguish official announcement styling"
```

## Task 6: Harmonize Feed Surfaces With The New Foundation

**Files:**
- Modify: `src/app/(main)/feed/feed-page-client.tsx`
- Modify: `src/components/feed/post-composer.tsx`
- Modify: `src/components/feed/post-card.tsx`
- Modify: `src/components/feed/feed-empty-state.tsx`
- Modify: `src/components/dashboard/event-item.tsx`
- Modify: `src/components/dashboard/trending-item.tsx`
- Modify: `tests/components/feed-page-chat-dock.test.ts`

- [ ] **Step 1: Add a failing feed source-contract assertion without coupling to dynamic data**

Add to `tests/components/feed-page-chat-dock.test.ts`:

```ts
const POST_COMPOSER_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/feed/post-composer.tsx"),
  "utf8",
)
const TRENDING_ITEM_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/dashboard/trending-item.tsx"),
  "utf8",
)

it("uses foundation chrome and avoids destructive styling for ordinary trend categories", () => {
  expect(POST_COMPOSER_SOURCE).toContain("rounded-2xl")
  expect(TRENDING_ITEM_SOURCE).not.toContain("text-destructive")
  expect(TRENDING_ITEM_SOURCE).toContain("text-brand-indigo")
})
```

- [ ] **Step 2: Run feed tests and verify the style contract fails while behavior tests still execute**

Run: `npx vitest run tests/components/feed-page-chat-dock.test.ts tests/components/post-card-community-context.test.ts tests/components/post-detail-dialog.test.ts`

Expected: FAIL on new feed-style assertions because current trend categories are destructive and the composer has not adopted new card radius.

- [ ] **Step 3: Restyle feed presentation only**

Keep current fetching, optimistic state, chat-dock and deep-link wiring intact. Apply the shared card/rhythm roles:

```tsx
// intended center/rail chrome
<Card className="rounded-2xl border-border/70 shadow-sm">
  <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
    {/* existing composer/post/rail content */}
  </CardContent>
</Card>
```

Convert ordinary supporting category accents away from critical:

```tsx
// src/components/dashboard/trending-item.tsx
<p className="text-[10px] font-bold uppercase tracking-wider text-brand-indigo dark:text-info">
  {category}
</p>

// src/components/dashboard/event-item.tsx
<span className="text-[10px] font-bold uppercase leading-tight text-official-foreground">
  {month}
</span>
```

Make empty state consume shared structure where practical:

```tsx
<Card className="w-full">
  <CardContent className="p-0">
    <EmptyState
      icon={FileText}
      title="Chưa có bài viết nào"
      description="Hãy là người đầu tiên chia sẻ!"
    />
  </CardContent>
</Card>
```

Limit changes in `feed-page-client.tsx` to column spacing/container styling and imported presentation components; do not change handler bodies or query props.

- [ ] **Step 4: Run feed functionality and presentation tests**

Run: `npx vitest run tests/components/feed-page-chat-dock.test.ts tests/components/post-card-community-context.test.ts tests/components/post-detail-dialog.test.ts tests/lib/feed-queries.test.ts tests/lib/feed-sidebar-queries.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit feed hierarchy changes**

```powershell
git add src/app/(main)/feed/feed-page-client.tsx src/components/feed/post-composer.tsx src/components/feed/post-card.tsx src/components/feed/feed-empty-state.tsx src/components/dashboard/event-item.tsx src/components/dashboard/trending-item.tsx tests/components/feed-page-chat-dock.test.ts
git commit -m "feat: harmonize TLU feed presentation"
```

## Task 7: Run Full Verification And Browser Comparison

**Files:**
- Modify only when a verified mismatch requires a correction in one of the Phase 1 files above.

- [ ] **Step 1: Run lint across the application**

Run: `npm run lint`

Expected: exit code `0`; fix any reported Phase 1 regression before proceeding.

- [ ] **Step 2: Run the complete Vitest suite**

Run: `npx vitest run`

Expected: exit code `0` with all tests passing; preserve any non-Phase-1 failure evidence rather than claiming completion.

- [ ] **Step 3: Produce a production build**

Run: `npm run build`

Expected: exit code `0` and Next.js production compilation completes.

- [ ] **Step 4: Perform browser visual QA against the generated concepts**

Because the current tool list does not expose the Browser plugin, use regular Playwright/browser capture after recording that reason. Verify at these viewports:

```text
1440x1024 /login: two-region auth composition, readable form, identity motif contained.
390x844 /login: compact identity header and tappable form controls.
1440x1100 /feed: shell rhythm, ordinary post neutrality, official notice Scarlet marker.
390x844 /feed: single-column cards and bottom-nav selected/unread semantics.
1440x1024 /admin/announcements: preview anatomy matches recipient official card.
Representative dark mode: readable official and critical states remain distinct.
```

Expected: implemented screens align with reference hierarchy; no console errors introduced by the UI refactor.

- [ ] **Step 5: Inspect the diff and commit final verified corrections only if needed**

Run:

```powershell
git status --short --branch
git diff --stat HEAD
git log --oneline --decorate -6
```

Expected: Phase 1 commits and any narrowly verified correction are visible; unrelated user changes are not reverted or staged.
