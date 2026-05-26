# TLU Community UI Refactor Phase 1 Design

## Context

`TLU Community` is an existing Next.js community application for Dai hoc Thang Long with three visible product zones:

- Public-facing authentication and account-status routes.
- Main student/community surfaces, centered on the feed shell.
- Administrative surfaces, including an official-announcement governance workflow.

The approved brand guide is [TLU-COMMUNITY-DESIGN.md](../../TLU-COMMUNITY-DESIGN.md). It defines a **Community-branded** visual direction: Thang Long Indigo and Scarlet establish identity, but ordinary interaction surfaces remain readable and task focused.

The current UI already uses a navy/red direction and a reusable component layer, but the implementation predates the approved design guide:

- `src/app/globals.css` exposes generic `primary` and `destructive` tokens without explicit brand/official roles.
- Official announcements use destructive styling for institutional identity, conflating official content with errors or withdrawal.
- Main, auth and admin shells share primitives but do not yet share a coherent branded hierarchy.
- Authentication is a centered neutral card rather than the branded entry surface specified by the guide.
- A code scan identified `19` files with raw color utilities, `52` files using destructive styles and `71` files using primary styles. A foundation-first change has higher leverage than restyling domain screens individually.

Phase 1 establishes the design foundation and converts the most identity-critical user surfaces. Later phases will extend it through communication, community, profile, settings and the complete admin suite.

## Approved Direction

The approved rollout strategy is **system-first phased refactor**.

Phase 1 covers:

1. Theme tokens and common UI primitives.
2. Main application navigation shell and shared page framing.
3. Authentication routes and account-status surfaces.
4. Feed core surfaces.
5. Official announcement presentation, including its admin preview dependency.

Phase 1 does not rewrite business logic, queries, realtime channels, routes or authorization. It changes styling contracts and the smallest component anatomy needed to express the new design.

## Goals

- Implement the approved TLU identity roles in reusable theme tokens and primitives.
- Distinguish brand Scarlet/official identity from semantic critical/destructive status.
- Make desktop and mobile app shells feel like one coherent TLU Community product.
- Convert auth into a recognizable branded entry experience.
- Convert feed and official announcements into the approved hierarchy without disrupting post, notification or publication behavior.
- Leave a stable foundation that later refactor phases can adopt without duplicating ad hoc utility styles.
- Verify behavior, responsive presentation, accessibility affordances and dark-mode compatibility for representative Phase 1 screens.

## Non-Goals

- Full visual redesign of messages, notification page, profile, search, clubs, groups, courses, events or settings in this phase.
- Full admin suite redesign beyond announcement preview/presentation elements needed for official-content consistency.
- Changes to database schema, server actions, data-fetching behavior, realtime services, permissions or navigation information architecture.
- Importing or redistributing `Thang Long Sans` without an approved font asset and usage rights.
- Treating current dark mode as an official TLU dark brand system.
- Replacing Base UI/shadcn primitives or changing the application framework.

## Design Principles

### Brand Versus Meaning

- `Thang Long Indigo` is a brand anchor and strong structural color.
- Everyday primary action remains a high-clarity interaction blue mapped from the approved guide.
- `Thang Long Scarlet` appears as official marker, branded geometric artwork and high-attention identity cue.
- Error, destructive action and withdrawn content use semantic critical tokens. A notice is not destructive merely because it is official.

### Foundation Before Domain Customization

Primitive changes must carry most of the visual shift: surface color, borders, radius, typography, focus, badges and controls. Domain components should express content-specific structure only where primitives do not communicate meaning, particularly official-announcement identity and auth artwork.

### Functional Community Product

The application remains a dense daily-use tool. Branded geometry belongs in auth, official content and controlled event/empty-state locations, not on ordinary posts, input fields or administrative data rows.

## Visual System Mapping

### Token Mapping

`src/app/globals.css` remains the single Tailwind v4 theme source. It will map the guide to semantic CSS variables and Tailwind utilities:

| Design Role | Implementation Role | Usage |
| --- | --- | --- |
| `{colors.canvas}` | `--background` | Main app page background |
| `{colors.surface}` | `--card`, `--popover` | Cards, navigation bars, dialogs, popovers |
| `{colors.ink}` | `--foreground`, `--card-foreground` | Main readable text |
| `{colors.primary}` | `--primary` | Daily interactive CTA and selected interaction |
| `{colors.primary-soft}` | `--secondary` / selected tints as appropriate | Active nav row, selected supporting surfaces |
| `{colors.brand-indigo}` | New explicit brand variable/utility | Branded heading, auth panel, strong official header |
| `{colors.brand-scarlet}` | New explicit brand variable/utility | Official marker and geometric accent only |
| `{colors.critical}` | `--destructive` | Error, withdrawal and destructive actions |
| Surface and semantic soft tokens | New explicit variables where needed | Badge variants and official/semantic callouts |

The implementation may map approved hex values to OKLCH equivalents in CSS, provided the rendered colors match the approved identity roles and contrast is verified.

### Typography

- Preserve the repo's operating font `Be Vietnam Pro` unless licensed TLU assets are provided.
- Establish role-based font utilities/tokens aligned to the guide: brand/display heading, page heading, card heading, body, label and overline.
- Use branded display treatment only on auth artwork or official branded headline areas during Phase 1.
- Keep feed content and form controls highly readable with the current Vietnamese-safe UI font stack.

### Radius And Elevation

- Normalize surface radius to functional UI roles: default controls/cards, elevated modal/composer panels and branded panels.
- Reduce arbitrary card shadow usage; surfaces rely on border and modest elevation.
- Popovers/dialogs retain stronger elevation because they sit above interaction flow.

## Component Architecture

### Layer 1: Theme And Primitives

Responsible files include:

- `src/app/globals.css`
- `src/components/ui/button-variants.ts`
- `src/components/ui/badge.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/toast.tsx`
- `src/components/shared/status-badge.tsx`
- `src/components/shared/tab-navigation.tsx`
- `src/components/shared/empty-state.tsx`

Required outcome:

- Existing component APIs remain compatible wherever practical.
- Status badges expose official, primary/info, success, warning, critical and muted meaning without raw domain-specific colors.
- Button destructive styling remains semantic critical; brand identity must not overload the destructive variant.
- Shared tabs and empty state consume the new token hierarchy rather than introducing one-off surface treatments.

### Layer 2: Product Shell

Responsible files include:

- `src/components/layout/app-logo.tsx`
- `src/components/layout/top-navbar.tsx`
- `src/components/layout/navbar-link.tsx`
- `src/components/layout/main-sidebar.tsx`
- `src/components/layout/sidebar-nav-item.tsx`
- `src/components/layout/mobile-bottom-nav.tsx`
- `src/components/layout/page-container.tsx`
- `src/components/layout/page-footer.tsx`
- `src/app/(main)/layout.tsx`

Required outcome:

- Desktop top navigation is a clean white/surface bar with a stable TLU identity on the left and Indigo/primary active affordances.
- Left rail/sidebar selected state uses approved Indigo tint hierarchy.
- Mobile navigation preserves routes and unread counts while using Scarlet only as unread attention marker.
- Page containers establish consistent app rhythm on desktop/mobile.
- No business, authentication or notification-count behavior is altered.

### Layer 3: Authentication

Responsible files include:

- `src/components/layout/auth-layout.tsx`
- `src/components/auth/login-card.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/auth/register-card.tsx`
- `src/components/auth/forgot-password-card.tsx`
- `src/components/auth/auth-status-card.tsx`
- Auth pages that contain local reset/status UI

Required outcome:

- Desktop auth layout becomes a two-region composition: Indigo brand panel with TLU identity and restrained geometric motif plus a focused white form region.
- Mobile auth routes collapse to a single-column form with a compact branded header treatment.
- Register steps, password feedback, errors and completion states follow shared semantic primitives.
- Existing form behavior, server actions and validation remain unchanged.

### Layer 4: Feed And Official Content

Responsible files include:

- `src/app/(main)/feed/feed-page-client.tsx`
- `src/components/feed/post-composer.tsx`
- `src/components/feed/post-card.tsx`
- `src/components/feed/feed-empty-state.tsx`
- `src/components/feed/announcement-feed-card.tsx`
- `src/components/feed/announcement-strip.tsx`
- `src/components/feed/announcement-card.tsx` and announcement dialog where reused identity appears
- `src/components/dashboard/event-item.tsx`
- `src/components/dashboard/trending-item.tsx`
- `src/components/admin/announcement-preview.tsx`

Required outcome:

- Maintain the current feed information architecture and infinite/realtime behavior.
- Standardize composer, post and contextual rail chrome through primitives and spacing.
- Replace official-notice reliance on `destructive` styling with official marker/badge treatment.
- Reserve critical/destructive presentation for withdrawn/error states.
- Render the same official identity anatomy in feed announcement and admin preview: school/unit identity, official marker, audience/time metadata and status when applicable.

## Responsive Behavior

### Desktop

- Main shell maintains the existing navbar and three-zone feed layout where sufficient width exists.
- Auth uses the two-region brand/form composition.
- Announcement identity can include the fullest marker/header treatment.

### Tablet

- Feed retains the stream and drops or reduces contextual rails according to current route behavior.
- Auth brand panel reduces in footprint without displacing form usability.
- Navigation continues to preserve all functional routes and controls.

### Mobile

- Bottom navigation remains the route anchor.
- Auth brand presence becomes compact rather than ornamental.
- Feed cards use reduced padding while preserving type hierarchy and official marker visibility.
- Announcement body content is never hidden behind decorative geometry.

## Dark Mode

- Existing theme preference and reduced-motion/density hooks remain supported.
- Dark tokens should be remapped consistently with the new role model.
- Indigo and Scarlet remain recognizable, but text contrast and semantic separation override decoration.
- Phase 1 tests dark-mode rendering on representative surfaces; it does not define an official institutional dark palette.

## Accessibility

- Preserve or improve keyboard behavior and focus-visible styles for controls, navigation, popovers and dialogs.
- Keep mobile interactive targets at or above `44px` where primary navigation and action controls are involved.
- Official, unread, selected, warning and error states must include text/icon/anatomy signals, not color alone.
- Verify contrast for primary CTA, official badge/marker contexts, destructive actions and dark surfaces.
- Branded motif is decorative and must not interfere with readable copy or accessible naming.

## Data, State And Error Handling

No data contracts change in Phase 1.

- Auth actions and validation results remain the source of form status.
- Feed loading, optimistic likes, chat dock and announcement query behavior remain untouched except for presentation.
- Official announcement `status`, `priority`, `pinToTop`, issuing unit and scope fields continue driving visible labels.
- Errors and withdrawn states continue rendering via semantic critical treatment.
- Styling refactors must not change conditional visibility, routes or action permissions.

## Testing And Verification

### Automated Tests

Use existing Vitest rendering/contract tests and add narrowly targeted coverage where new styling semantics introduce observable DOM contracts:

- Theme/primitive contract tests for official-versus-critical variants if suitable existing tests are available or added.
- Auth layout structure test for branded panel/mobile-compatible content contract.
- Announcement component tests proving official content no longer uses destructive semantics while withdrawn state remains critical.
- Existing feed/chat/layout tests remain regression gates for functionality.

### Static Verification

- `npm run lint`
- `npx vitest run` or focused tests during each task followed by the full suite before Phase 1 completion.
- `npm run build`

### Visual QA

Use browser verification at desktop and mobile viewports for:

- Login/register route.
- Feed with ordinary post and official announcement.
- Official announcement preview in admin context.
- Navbar, notification/message affordances and bottom navigation.
- Representative dark-mode render.

Check layout hierarchy, spacing, typography, responsive collapse, focus presentation and console errors.

## Rollout And File Safety

- The implementation is completed on the existing `feat/refactor-UI` branch unless the user changes direction.
- The already-approved `docs/TLU-COMMUNITY-DESIGN.md` is the normative design reference.
- Changes are staged and committed by coherent Phase 1 tasks after verification.
- Changes outside Phase 1 are limited to incidental inheritance from updated primitives or tokens; broad domain restyling is deferred to subsequent specs/plans.

## Follow-On Phases

Phase 2 will target communication and community surfaces: messages, notifications, search, profile, clubs, groups, courses and events.

Phase 3 will target full governance/admin completion, settings/system routes, responsive/dark-mode consolidation and full-app visual QA.
