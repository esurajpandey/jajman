# Pandit Seva App — Mobile UI Design Specification

Version: 1.0 · Date: 2026-06-20 · Status: Draft for review
Deliverable: interactive React (Vite + TS + Tailwind) mobile-UI prototype with mock data, covering Jajman, Pandit, and Admin surfaces (all mobile / phone-frame).

---

## 0. Conventions & Reconciliations (NORMATIVE — overrides any conflicting detail elsewhere in this spec)

This section is the single source of truth. Where any other part of the spec disagrees with a ruling here, this section wins.

### 0.1 ROUTING SCHEME (single source of truth)

**Rationale.** Three actor surfaces (Jajman, Pandit-self, Admin) plus an Auth/onboarding zone must never collide. We segment by a leading base segment per surface and reserve `/` only for the splash redirect. The historical ambiguity ("is the Jajman base `/` or `/app`?") and the public-vs-self pandit profile clash are resolved below.

**Decision — route bases.**

- **Auth / onboarding — `/auth/*`** (splash lives at `/`):
  - `/` — Splash; `RootRedirect` decides the target (see consequences).
  - `/auth/language`, `/auth/welcome`, `/auth/login`, `/auth/otp`, `/auth/password`, `/auth/forgot`, `/auth/change-password`, `/auth/register`, `/auth/role`, `/auth/permissions`, `/auth/profile-setup`.
- **Jajman surface — `/app/*`:**
  - `/app/home`, `/app/search`, `/app/results`, `/app/map`, `/app/category/:categoryId`, `/app/puja/:pujaId`.
  - Public pandit profile `/app/pandit/:panditId`, `/app/pandit/:panditId/reviews`.
  - Booking flow `/app/book/*`; `/app/bookings`, `/app/bookings/:id`, team status `/app/bookings/:id/team`.
  - Payment `/app/pay/*`, receipt `/app/receipt/:bookingId`.
  - `/app/favorites`, `/app/addresses`, chat list `/app/chat`, chat thread `/app/chat/:threadId`, `/app/notifications`, `/app/referral`, `/app/recurring`, `/app/disputes`, `/app/disputes/:id`, `/app/profile`, `/app/settings`, `/app/help`.
- **Pandit-self surface — `/pandit/*`:**
  - `/pandit/dashboard`, `/pandit/requests`, `/pandit/requests/:id`, `/pandit/calendar`, `/pandit/availability`, `/pandit/leave`, `/pandit/bookings`, `/pandit/bookings/:id`, `/pandit/earnings`, `/pandit/wallet`, `/pandit/withdraw`, `/pandit/bank`, `/pandit/ratings`, chat list `/pandit/chat`, chat thread `/pandit/chat/:threadId`, `/pandit/profile`, onboarding `/pandit/onboarding/*`, `/pandit/pending-approval`, `/pandit/rejected`, `/pandit/referral`, `/pandit/settings`, `/pandit/help`.
- **Admin — `/admin/*`:**
  - `/admin/login`, `/admin/dashboard`, `/admin/bookings`, `/admin/bookings/:id`, `/admin/users`, `/admin/users/:id`, `/admin/more`, `/admin/verifications`, `/admin/verifications/:id`, `/admin/pujas`, `/admin/commission`, `/admin/settlements`, `/admin/withdrawals`, `/admin/disputes`, `/admin/disputes/:id`, `/admin/reports`, `/admin/audit`, `/admin/settings`.

**Consequences.**
- The Jajman base is **`/app`**, NOT `/`. Any link, redirect, or test that assumes the Jajman home is `/` is wrong; it is `/app/home`.
- The **public** pandit profile (a Jajman viewing a pandit) is `/app/pandit/:panditId`. The pandit's **own** management surface is `/pandit/*`. These never collide because the bases differ.
- `RootRedirect` at `/`: unauthenticated → `/auth/welcome` (or `/auth/language` on first run if language unset); authenticated Jajman in Jajman mode → `/app/home`; authenticated Pandit in Pandit mode → `/pandit/dashboard` (or pending-approval/rejected per §0.6); Admin session → `/admin/dashboard`.
- **Chat is ALWAYS opened by `threadId`.** When only a `bookingId` is known (e.g. from a Booking detail), the caller resolves `Booking.chatThreadId` first, then navigates to `/app/chat/:threadId` or `/pandit/chat/:threadId`. There is no `/chat/by-booking/:id` route.

### 0.2 BOOKING STATUS ENUM

**Rationale.** "Disputed" was historically mixed in as a status, but a booking can be disputed in nearly any lifecycle state. Statuses must be a clean linear-ish lifecycle; disputes are an orthogonal overlay.

**Decision — canonical `BookingStatus`:**
`requested | accepted | advance_paid | scheduled | in_progress | completed | rated | rejected | cancelled | refund_initiated | refund_completed | expired`.

`disputed` is **NOT** a status. It is a boolean overlay flag **`Booking.isDisputed`** (plus `Booking.disputeId`). A booking in any status may be disputed.

**List-tab → status mapping.**

- **Jajman Bookings (`/app/bookings`):**
  - **Upcoming** = `{requested, accepted, advance_paid, scheduled}`
  - **Ongoing** = `{in_progress}`
  - **Completed** = `{completed, rated}`
  - **Cancelled** = `{rejected, cancelled, refund_initiated, refund_completed, expired}`
  - A disputed booking shows a **"Disputed" badge** in whatever tab its status places it, AND appears in the dedicated **Disputes** entry (`/app/disputes`).
- **Pandit Bookings (`/pandit/bookings`):**
  - **Today** = accepted/advance_paid/scheduled/in_progress whose `pujaStart` is today
  - **Upcoming** = `{accepted, advance_paid, scheduled}` with `pujaStart` in the future (excluding today)
  - **Completed** = `{completed, rated}`
  - `expired` and `rejected` are **not** shown as live bookings; they appear in **Requests history** (`/pandit/requests`, history filter).

**Where `expired` and `isDisputed` are surfaced.**
- `expired`: Jajman side → **Cancelled** tab (with an "Expired — no pandit accepted in time" reason). Pandit side → **Requests history** only. Admin → `/admin/bookings` with status filter.
- `isDisputed`: surfaced as a badge on the booking card/detail in every list it appears in, plus the Disputes lists on all three surfaces (`/app/disputes`, `/pandit/disputes`, `/admin/disputes`). Admin Settlement detail also reflects it via `on_hold` (§ Appendix B).

### 0.3 REFUND BASE (OQ2)

**Rationale.** Charging a 5% cut on the full booking total would penalize a Jajman who has only paid a 30% advance. Early-stage policy is goodwill-friendly: cut is on money actually received.

**Decision.**
- The 5% cut is computed on **`amountPaid`** = the sum the Jajman has ACTUALLY PAID at cancellation time (advance only, OR advance + remaining if the remaining was already collected). It is **NOT** computed on the booking total.
- **Jajman-initiated cancel:** `refundAmount = amountPaid − round(0.05 × amountPaid)`. The `round(0.05 × amountPaid)` is retained as the **platform cut**.
- **Pandit-initiated cancel:** **full refund** of `amountPaid` (cut = 0).
- No additional penalty at this stage (early stage policy).

**Consequences.**
- `Booking.cancellation.refundAmount` stores the computed refund; `Booking.cancellation.platformCut` stores the retained cut (0 for pandit-initiated).
- The Cancel screen's **`RefundBreakdown`** copy uses the phrase **"amount paid"** (e.g. "Amount paid ₹X · Platform cut (5%) −₹Y · You receive ₹Z"). It must never say "booking total".

**Cancellation-window rule (precise).**
- A **Jajman may cancel** while `status ∈ {requested, accepted, advance_paid, scheduled}` AND `now < pujaStart − pricingConfig.cancellationLeadMins` (a configurable lead window; default surfaced from config). Once `status === in_progress` (or later), the Jajman **cannot** self-cancel — they must raise a dispute instead.
- A **Pandit may cancel** while `status ∈ {accepted, advance_paid, scheduled}` (before `in_progress`); a pandit cancel triggers full refund and re-opens/expires the request.
- `requested` with no acceptance simply **expires** (becomes `expired`) at `BookingRequest.expiresAt` (§0.7) — that is not a "cancellation" and yields a full refund of any pre-authorized amount (typically ₹0 since advance is paid after acceptance).

### 0.4 COMPONENT NAMING + CATALOG

**Rationale.** Three differently-named bottom bars and a scatter of "used-but-undefined" components caused drift. One bar, one catalog.

**Decision — bottom navigation.** The single bottom navigation component is **`BottomTabBar`** for ALL surfaces. It is configured by a `tabs` prop per surface. The names **`BottomNav`, `PanditTabBar`, `AdminTabBar` are aliases to be removed** — replace all references with `BottomTabBar`.

**Catalog extensions (single catalog — nothing is used-but-undefined).** The following surface-local components are hereby part of the one component catalog:
- **`MoneyBreakdown`** — itemized charges (base, travel, surcharge, advance, remaining, commission note).
- **`RefundBreakdown`** — cancel-time refund math (uses "amount paid"; §0.3).
- **`CostPreviewFooter`** — sticky bottom cost summary + primary CTA during booking flow.
- **`PanditMiniHeader`** — compact pandit avatar/name/rating header used atop booking/chat/profile contexts.
- **`TeamPackagePanel`** — multi-pandit package composition (roles, counts, per-role pricing).
- **`MapPinPicker`** — draggable map pin for address/location selection.
- **`OutcomeSelector`** — pandit's completion outcome chooser (completed / partial / no-show).
- **`BalanceCompare`** — before/after balance comparison (wallet/withdraw).
- **`WithdrawalStepper`** — multi-step withdrawal flow indicator.
- **`RatingSummary`** — aggregate rating with count + breakdown link.
- **`DistributionBars`** — 5→1 star distribution bars.
- **`WeekdayScheduleRow`** — per-weekday availability toggle + time ranges.
- **`DayTimeline`** — vertical day schedule of bookings/slots.
- **`KpiCard`** — dashboard metric tile.
- **`MiniChart`** — small sparkline/bar chart for earnings/reports.
- **`Countdown`** — live countdown to an `expiresAt`/`pujaStart`.
- **`ModeSwitcher`** — Jajman ↔ Pandit surface switch (gated by §0.6).

These join the existing shared primitives (AppBar, Button, Card, Chip, Sheet/BottomSheet, ListRow, Avatar, Badge, EmptyState, SkeletonList, Toast, SegmentedTabs, SearchBar, etc.). No component referenced anywhere in this spec is left undefined.

### 0.5 NOTIFICATION CHANNELS

**Rationale.** The out-of-scope note, the preferences screen, and the data model previously listed different channel sets.

**Decision — single `NotifChannel` enum:** `in_app | mobile | whatsapp | email | push`.
- **Active / simulated:** `in_app`, `mobile` (SMS), `whatsapp`.
- **DISABLED ("coming soon"):** `email`, `push` — shown but non-interactive with a "Coming soon" tag.

This identical set is used verbatim in (a) the foundation out-of-scope note, (b) the Notification-preferences screen, and (c) the data model (`User.notifPrefs: Record<NotifChannel, boolean>` with `email`/`push` forced `false` and locked).

### 0.6 PANDIT ROLE ENTITLEMENT TIMING

**Rationale.** A user who submits pandit onboarding should be able to enter (and explore) the Pandit surface immediately, while still being gated from discoverability until approved.

**Decision.**
- On **pandit-onboarding submit**: add `'pandit'` to `user.roles` **IMMEDIATELY**, and set `PanditProfile.status = 'pending'`.
- **Mode switch to Pandit** (via `ModeSwitcher`) is allowed whenever `'pandit' ∈ user.roles`.
- While `PanditProfile.status ∈ {pending, rejected}`, the Pandit surface **routes to the gating screen** — `/pandit/pending-approval` (pending) or `/pandit/rejected` (rejected) — instead of `/pandit/dashboard`. A pandit guard intercepts all `/pandit/*` (except the gating screens, onboarding, help, settings, profile) and redirects.
- The pandit becomes **discoverable/bookable by Jajmans only when `PanditProfile.status === 'approved'`** (excluded from search/results/map and from public profile booking CTA otherwise).

**Consistency.** §3.4 (role model), the onboarding submit mutation, and `ModeSwitcher` logic all follow the above: `roles` grants surface access; `PanditProfile.status` gates dashboard-vs-gating and discoverability.

### 0.7 EMERGENCY REQUEST EXPIRY (OQ3 vs OQ6)

**Rationale.** OQ6 sets a default 24h approval timeout; OQ3 raised that an emergency puja two hours out cannot wait 24h. Resolve as an explicit formula, not ad-hoc "visual compression".

**Decision.** Default approval timeout is **24h** (OQ6). For **urgent/emergency** bookings:
```
BookingRequest.expiresAt = min(now + 24h, pujaStart − pricingConfig.emergencyBufferMins)
```
with `emergencyBufferMins` default **60**. This is a documented exception. If `pujaStart − 60min` is already in the past at request time, the booking cannot be created as emergency (the UI blocks submission with an inline error).

### 0.8 PRICING CONFIG

**Rationale.** Pricing constants were scattered as literals. Centralize them.

**Decision — `pricingConfig` object** in the data model:
- `advancePercent` (default **30**)
- `cancellationCutPct` (default **5**)
- `emergencySurchargePct` (e.g. **20**)
- `emergencyBufferMins` (default **60**)
- `cancellationLeadMins` (configurable cancel lead window; §0.3)
- Note: **per-pandit / per-category `platformCommissionPct` does NOT live here** — it lives on **`CommissionRule`** (most-specific rule wins; see Admin Commission).

**Estimate vs binding advance.** The advance shown on the booking **Summary is an ESTIMATE** (base + a *travel estimate*). The **BINDING** advance is **recomputed at pandit acceptance** once travel is finalized (actual distance/route). The Summary UI labels it "Estimated advance"; the post-acceptance Pay screen shows the binding amount. If the binding advance differs materially from the estimate, the Jajman sees the updated figure before paying.

### 0.9 PHONE-VISIBILITY PRECEDENCE

**Rationale.** A global default must be overridable per booking so a Jajman can share their number for one engagement without changing their global setting.

**Decision.**
- `User.phoneVisibility` is the **global default**.
- Each **`Booking.phoneShared`** is a per-booking override, **initialized from the global default** at booking creation time.
- `ChatThread` reads the **booking-scoped** value (`Booking.phoneShared`), not the global.
- **Per-booking overrides global.** Toggling phone-share inside a chat/booking changes `Booking.phoneShared` only.

### 0.10 CITY FILTER vs GPS RADIUS

**Rationale.** Distance/radius is meaningless when a user deliberately browses another city.

**Decision.** Selecting a **City** in Filters **overrides** the active-address-based distance/radius for that search session. While browsing a **non-local** city:
- Distance chips/sorting based on the user's GPS are **hidden**, OR shown **relative to the selected city's center** (not the user's location).
- Clearing the city filter restores active-address-based radius behavior.

---

---

## 1. Foundation & Shared Auth / Onboarding

> Authoritative spec for the foundation layer and shared authentication/onboarding flows of the Pandit Seva interactive prototype. This document is normative for all later role-specific specs (Jajman, Pandit, Admin), which build on the architecture, design system, navigation, and theming defined here.

---

## 1. Overview & Goals

### 1.1 What this prototype is
Pandit Seva is a **mobile booking platform** that connects **Jajmans** (families/devotees) with **Pandits** (priests) to book pujas, kathas, jaaps, ceremonies, and rituals. The deliverable is a **fully navigable, interactive front-end prototype** — not a production app and not a static mockup. It runs entirely in the browser with an **in-memory mock store** that behaves like a real backend: actions mutate state and the consequences ripple through every screen that reads that state.

Three end-user roles share **one app via a single-account model**: a user may be a Jajman, a Pandit, or both, and can switch modes at any time. **Admin** is a separate login that lands on its own (also mobile) surface.

### 1.2 What "done" means (acceptance criteria for the foundation layer)
The foundation is "done" when:

1. **Phone-frame shell renders** a centered ~390–420px device viewport on desktop, with safe-area padding, status-bar mock, and a contained scroll region. On a real mobile viewport it fills the screen.
2. **Theme tokens are live**: light and dark themes are fully defined as CSS variables, switchable at runtime, and every primitive consumes tokens (no hard-coded colors in screens).
3. **Routing works across all four surfaces** (auth, jajman, pandit, admin) with route guards that redirect based on `authState`, `activeRole`, and `isAdmin`.
4. **The full auth/onboarding flow is walkable end-to-end** with mock data: Splash → Language → Welcome → Login (OTP **or** password) → (Register → Role select → Permissions priming → Profile setup) → land in the chosen role's home. Admin login lands on the admin dashboard.
5. **Mode switching works**: a both-role user can flip Jajman ↔ Pandit from Profile and the shell (tabs, theme accents, home) re-renders for the active role. A Jajman-only user sees a "Become a Pandit" entry.
6. **Every auth/onboarding screen defines loading (skeleton), empty, and error states** where applicable, and they are reachable in the prototype (e.g., wrong OTP shows the error state).
7. **The component catalog primitives exist** and are themeable, accessible (focus rings, hit targets ≥44px), and used consistently.
8. **i18n stub is wired**: English is complete; Hindi and Sanskrit have a stub dictionary and a Devanagari-capable font fallback renders correctly.

### 1.3 Design north star
**"Warm premium hybrid"** — a modern, spacious, contemporary layout (generous whitespace, soft gradients, calm hierarchy) carrying restrained devotional warmth (saffron/amber, maroon, gold, cream surfaces, a faint kalash/diya line motif). The product must read as **trustworthy, premium, and uncluttered** — never ornate, busy, or kitsch.

---

## 2. Scope

### 2.1 In scope
- **All three end-user roles + Admin**, every one rendered as a **mobile** experience inside the phone-frame shell. Admin is mobile too — there is **no desktop dashboard**.
- A **fully interactive prototype**: navigation, forms, validation, optimistic UI, and **state mutations** that flow across screens. Canonical flows:
  - Book → booking appears in Jajman's *Bookings* and Pandit's *Requests*.
  - Pandit accepts → status advances (Requested → Accepted) on both sides; 24h countdown stops.
  - Withdraw → Pandit wallet balance decreases, withdrawal row added.
  - Cancel → refund computed (Jajman: minus 5%; Pandit: full) and reflected in wallet/booking status.
- **Realistic mock data** seeded in an in-memory zustand store (pandits, pujas, categories, bookings, wallet, reviews, disputes, users, notifications, chat threads).
- **Light + dark theme** from day one via design tokens.
- **i18n stub**: English-first copy, Hindi + Sanskrit stub dictionaries, Devanagari font fallback.
- **Per-screen loading / empty / error states**.
- **Simulated** OTP, payments, settlements, withdrawals, notifications, chat, maps, image upload — all convincingly faked in the UI.

### 2.2 Explicitly out of scope
- **No real backend / API / database** — everything is in-memory; a refresh resets to the seeded state (with an optional `localStorage` persistence toggle for demo convenience, documented but off by default).
- **No real SMS/OTP** — OTP is mocked; a fixed dev code (`123456`) and a "use mock code" hint are shown.
- **No real payment gateway** — advance/remaining payments simulate a processing delay then succeed (with a toggle to simulate failure for the error state).
- **No real sockets / push / WhatsApp** — notifications and chat update via local store + simulated latency timers.
- **No real GPS / maps SDK** — the address picker uses a **mock map** (static map image/illustration with a draggable pin stub and canned reverse-geocoded addresses).
- **No real auth/security**, audit logging, or cloud storage — sign-in is simulated; uploads are local object URLs.
- **No social login** — placeholder buttons only, marked "coming soon" and disabled.
- **No production analytics, A/B, or telemetry.**

### 2.3 Non-goals for *this* document
This part specifies **foundation + shared auth/onboarding only**. Role-specific screens (Jajman discovery/booking, Pandit dashboard/calendar/earnings, Admin queues/reports) are referenced for architecture/navigation completeness but are **specified in later parts**.

---

## 3. Tech & Architecture

### 3.1 Stack (locked)
| Concern | Choice |
|---|---|
| Build/dev | **Vite** |
| UI | **React + TypeScript** |
| Styling | **Tailwind CSS** (token-driven via CSS variables) |
| State | **zustand** (in-memory store, slice-per-domain) |
| Routing | **react-router** (v6 data routers, nested routes) |
| Icons | **lucide-react** |
| Charts (admin) | **recharts** (lightweight) |
| Dates | **dayjs** (lightweight, for slots/calendar/countdowns) |
| IDs/util | tiny helpers (`nanoid` for mock IDs) |

### 3.2 The phone-frame shell concept
The entire app renders inside a **`PhoneFrame`** wrapper:

- On **desktop** (≥ `md`): a centered device frame, **390px** content width (max 420px), fixed aspect ratio (e.g., 390×844), rounded bezel, subtle shadow, optional notch/Dynamic-Island mock, and a **mock status bar** (time, signal, battery — purely decorative). Background behind the frame is a soft warm gradient (theme-aware).
- On **mobile** (< `md`): the frame collapses to full-viewport; the bezel and outer gradient are hidden so it behaves like a native app.
- Inside the frame, layout is a column: `[StatusBarMock?] [AppBar?] [ScrollableBody] [BottomTabBar?]`. Only the body scrolls; app bar and tab bar are pinned. `100dvh` and `env(safe-area-inset-*)` are respected.
- The frame exposes a **portal root** for `BottomSheet`, `Modal`, and `Toast` so overlays are clipped to the device, not the desktop page.
- A small **dev toolbar** (outside the frame, desktop only) lets the demo driver: toggle theme, switch role, reset store, jump to any surface, and toggle "simulate failure". This is a prototype affordance, not a product feature.

### 3.3 Surfaces & route grouping
Four **route groups**, each a layout route with its own shell composition:

| Group | Base | Shell | Guard |
|---|---|---|---|
| **auth** | `/` (auth routes are flat under root pre-login) | No tab bar; minimal/absent app bar | Redirect to role home if already authed |
| **jajman** | `/app` | AppBar + Jajman BottomTabBar | Requires `authed && activeRole==='jajman'` |
| **pandit** | `/pandit` | AppBar + Pandit BottomTabBar | Requires `authed && activeRole==='pandit' && panditApproved` (else onboarding/pending) |
| **admin** | `/admin` | AppBar + Admin BottomTabBar + More menu | Requires `authed && isAdmin` |

### 3.4 Auth / role / mode routing logic
A single **`useSession`** selector exposes `{ authed, isAdmin, user, activeRole, roles, panditStatus }`. A top-level **`RootRedirect`** and per-group **route guards** decide destinations:

```
resolveLanding(session):
  if (!authed)                      -> /welcome (or /splash on cold start)
  if (isAdmin)                      -> /admin/dashboard
  if (!session.onboardingComplete)  -> resume onboarding step (role-select / permissions / profile-setup)
  if (activeRole === 'pandit'):
      if (panditStatus === 'pending') -> /pandit/pending-approval
      if (panditStatus === 'rejected')-> /pandit/rejected
      else                            -> /pandit/dashboard
  else (activeRole === 'jajman')    -> /app/home
```

- **Mode switching** mutates `activeRole` in the store (persisted to the session slice). Guards re-evaluate, and react-router navigates to the new role's home. The shell swaps tab bar + accent treatment.
- **`roles`** is the set the account is entitled to (`['jajman']`, `['jajman','pandit']`, etc.). `activeRole` must be a member; switching to `pandit` when not entitled routes into the **"Become a Pandit"** onboarding instead.
- **Admin** is a distinct credential path (`/admin/login`) that sets `isAdmin=true`; admin and end-user sessions are mutually exclusive in the prototype.

### 3.5 Folder structure

```
src/
├─ main.tsx                       # bootstraps router + theme + i18n providers
├─ app/
│  ├─ router.tsx                  # route tree: auth / jajman / pandit / admin groups
│  ├─ guards.tsx                  # RequireAuth, RequireRole, RequireAdmin, RedirectIfAuthed
│  ├─ RootRedirect.tsx            # cold-start landing resolver
│  ├─ shells/
│  │  ├─ PhoneFrame.tsx           # device bezel + status bar mock + portal root
│  │  ├─ AuthShell.tsx            # minimal shell for auth/onboarding
│  │  ├─ JajmanShell.tsx          # AppBar + Jajman BottomTabBar
│  │  ├─ PanditShell.tsx          # AppBar + Pandit BottomTabBar
│  │  └─ AdminShell.tsx           # AppBar + Admin BottomTabBar + More menu
│  └─ DevToolbar.tsx              # demo controls (desktop only)
│
├─ screens/
│  ├─ auth/                       # SCOPE OF THIS DOC
│  │  ├─ Splash.tsx
│  │  ├─ LanguageSelect.tsx
│  │  ├─ WelcomeCarousel.tsx
│  │  ├─ MobileLogin.tsx
│  │  ├─ OtpVerify.tsx
│  │  ├─ PasswordLogin.tsx
│  │  ├─ ForgotPassword.tsx
│  │  ├─ ResetPassword.tsx
│  │  ├─ Register.tsx
│  │  ├─ RoleSelect.tsx
│  │  ├─ PermissionsPriming.tsx
│  │  ├─ ProfileSetup.tsx
│  │  └─ AdminLogin.tsx
│  ├─ jajman/                     # later parts
│  ├─ pandit/                     # later parts
│  ├─ admin/                      # later parts
│  └─ shared/                     # Chat, Notifications, Settings, etc. (later)
│
├─ components/
│  ├─ primitives/                 # Button, IconButton, Input, Badge, Avatar, ...
│  ├─ nav/                        # AppBar, BottomTabBar, ModeSwitcher, MoreMenu
│  ├─ overlays/                   # BottomSheet, Modal, Toast, Toaster
│  ├─ data-display/               # PanditCard, PujaCard, ReviewItem, KpiCard, MiniChart, MoneyBreakdown, StatusStepper
│  ├─ inputs/                     # SearchBar, FilterChip, FiltersSheet, SlotPicker, Calendar, RatingStars, ImageUploader, AddressPickerMap, SegmentedControl, Stepper, OtpInput
│  ├─ feedback/                   # EmptyState, SkeletonLoader, Countdown, StatusPill
│  └─ motif/                      # KalashLine, DiyaMark, GradientField (devotional SVG motifs)
│
├─ mock/
│  ├─ seed/                       # users.ts, pandits.ts, pujas.ts, categories.ts, bookings.ts, reviews.ts, disputes.ts, wallet.ts, notifications.ts, chats.ts, addresses.ts
│  ├─ fixtures.ts                 # assembles the initial store state
│  └─ simulate.ts                 # fake latency, OTP check, payment success/fail, geocode
│
├─ store/
│  ├─ index.ts                    # createStore() combining slices
│  ├─ sessionSlice.ts             # authed, user, roles, activeRole, isAdmin, onboarding
│  ├─ uiSlice.ts                  # theme, language, toasts, sheet/modal stack
│  ├─ catalogSlice.ts             # categories, pujas, pandits (read-heavy)
│  ├─ bookingSlice.ts             # bookings + lifecycle mutations
│  ├─ walletSlice.ts              # balances, withdrawals, settlements
│  ├─ socialSlice.ts              # favorites, reviews, chat, notifications
│  └─ adminSlice.ts               # verification queue, commission, disputes, reports
│
├─ theme/
│  ├─ tokens.css                  # :root + [data-theme="dark"] CSS variables
│  ├─ tokens.ts                   # typed token map mirror for TS access
│  ├─ ThemeProvider.tsx           # applies data-theme, persists choice
│  └─ tailwind.preset.ts          # maps tokens -> Tailwind theme extension
│
├─ i18n/
│  ├─ I18nProvider.tsx            # current language context + t()
│  ├─ keys.ts                     # typed key union
│  ├─ en.ts                       # complete
│  ├─ hi.ts                       # Hindi stub
│  └─ sa.ts                       # Sanskrit stub
│
├─ lib/
│  ├─ money.ts                    # currency format (INR ₹), refund/commission math
│  ├─ datetime.ts                 # dayjs wrappers, slot helpers, countdown
│  ├─ format.ts                   # distance, response-time, phone masking
│  ├─ validation.ts               # phone/OTP/password/name validators
│  └─ hooks/                      # useSession, useTheme, useCountdown, useDisclosure
│
└─ assets/                        # mock map images, illustration SVGs, avatar placeholders
```

### 3.6 State architecture notes
- **Single root store** composed of slices; selectors are colocated. Screens never reach into the backend — they call slice **actions** (e.g., `bookingSlice.requestBooking()`), which apply the mutation and any derived effects (e.g., create a notification, start a 24h timer).
- **Simulated async**: actions that "talk to a server" route through `mock/simulate.ts` (e.g., `withLatency(300–900ms)`, `maybeFail()` honoring the dev "simulate failure" flag) so loading and error states are exercisable.
- **Timers** (24h request expiry per OQ6, payment "processing", OTP resend cooldown) are modeled in-store with `dayjs` deadlines; `Countdown` components read them. For demo speed, a dev flag can compress "24h" to seconds.

---

## 4. Design System — "Warm premium hybrid"

### 4.1 Color tokens (concrete HEX, light + dark)

Tokens are semantic-first. Brand ramps are listed, then the semantic aliases each theme maps to.

**Brand ramps (theme-independent source palette)**

| Token | Hex | Use |
|---|---|---|
| `saffron-50` | `#FFF7ED` | tint wash |
| `saffron-100` | `#FFEAD2` | chips/hover |
| `saffron-300` | `#FBC07A` | gradients |
| `saffron-500` | `#F59E0B` | **primary** (amber-saffron) |
| `saffron-600` | `#EA8C04` | primary pressed |
| `saffron-700` | `#C2710A` | primary text-on-light |
| `maroon-500` | `#8C2F39` | **secondary** (deep maroon) |
| `maroon-600` | `#7A2730` | secondary pressed |
| `maroon-700` | `#5F1E26` | secondary deep |
| `maroon-200` | `#E7C4C8` | maroon tint |
| `gold-400` | `#E6B450` | **accent** (gold) |
| `gold-500` | `#D4A017` | accent strong |
| `cream-50` | `#FCF8F1` | lightest surface |
| `cream-100` | `#F7EFE2` | sand surface |
| `cream-200` | `#EFE3CF` | sand border |

**Light theme — semantic aliases**

| Semantic token | Hex |
|---|---|
| `--color-bg` (app background) | `#FCF8F1` |
| `--color-surface` (cards/sheets) | `#FFFFFF` |
| `--color-surface-2` (raised/secondary) | `#F7EFE2` |
| `--color-surface-sunken` (wells) | `#F2E8D7` |
| `--color-primary` | `#F59E0B` |
| `--color-primary-hover` | `#EA8C04` |
| `--color-on-primary` | `#3A1D00` |
| `--color-secondary` | `#8C2F39` |
| `--color-on-secondary` | `#FFF4F2` |
| `--color-accent` | `#D4A017` |
| `--color-on-accent` | `#3A2A00` |
| `--color-text` (primary text) | `#2A211A` |
| `--color-text-muted` | `#6E6256` |
| `--color-text-subtle` | `#9A8C7C` |
| `--color-border` | `#E7DBC7` |
| `--color-border-strong` | `#D7C6AA` |
| `--color-ring` (focus) | `#F59E0B` |
| `--color-overlay` (scrim) | `rgba(42,33,26,0.45)` |
| `--color-success` | `#2E8B57` |
| `--color-success-bg` | `#E4F2EA` |
| `--color-warn` | `#C9791A` |
| `--color-warn-bg` | `#FBEBD4` |
| `--color-error` | `#C0392B` |
| `--color-error-bg` | `#F8E2DE` |
| `--color-info` | `#2F6F9F` |
| `--color-info-bg` | `#E1EEF6` |

**Dark theme — semantic aliases**

| Semantic token | Hex |
|---|---|
| `--color-bg` | `#1A130D` |
| `--color-surface` | `#241A12` |
| `--color-surface-2` | `#2E2218` |
| `--color-surface-sunken` | `#15100B` |
| `--color-primary` | `#F6A926` |
| `--color-primary-hover` | `#FFB940` |
| `--color-on-primary` | `#2A1600` |
| `--color-secondary` | `#C9737C` |
| `--color-on-secondary` | `#2A0E12` |
| `--color-accent` | `#E6B450` |
| `--color-on-accent` | `#2A1F00` |
| `--color-text` | `#F3E9DA` |
| `--color-text-muted` | `#C4B5A1` |
| `--color-text-subtle` | `#8C7E6C` |
| `--color-border` | `#3A2C1F` |
| `--color-border-strong` | `#4D3B29` |
| `--color-ring` | `#F6A926` |
| `--color-overlay` | `rgba(0,0,0,0.6)` |
| `--color-success` | `#5DBE86` |
| `--color-success-bg` | `#16291F` |
| `--color-warn` | `#E0A047` |
| `--color-warn-bg` | `#2E2310` |
| `--color-error` | `#E57366` |
| `--color-error-bg` | `#2E1614` |
| `--color-info` | `#6FA9D0` |
| `--color-info-bg` | `#13242E` |

> **Contrast rule**: body text on `--color-bg`/`--color-surface` must meet WCAG AA (≥4.5:1); `--color-on-*` pairs are pre-validated. Primary saffron is a fill color — for primary *text* on light surfaces use `saffron-700` (`#C2710A`), never `saffron-500`.

### 4.2 Typography scale

- **Font families**:
  - UI/Latin: `"Inter"` (or system `-apple-system, "Segoe UI", Roboto`) — `--font-sans`.
  - Display/brand accent: `"Fraunces"` or `"Marcellus"`-style warm serif for the wordmark and large display headings only — `--font-display`. (Falls back to serif system stack.)
  - **Devanagari fallback**: `"Noto Sans Devanagari"` appended to every family so Hindi/Sanskrit (`hi`/`sa`) render correctly — `--font-deva`. The active font stack switches to lead with Devanagari when language is `hi`/`sa`.
- **Numerals**: tabular figures for money and KPIs (`font-variant-numeric: tabular-nums`).

| Style | Size / line-height | Weight | Usage |
|---|---|---|---|
| Display L | 32 / 38 | 600 (display serif) | Splash/Welcome headline, brand |
| Display S | 26 / 32 | 600 (display serif) | Onboarding hero titles |
| Title L | 22 / 28 | 600 | App bar large title, screen H1 |
| Title M | 18 / 24 | 600 | Section headers, card titles |
| Title S | 16 / 22 | 600 | Sub-section, list group headers |
| Body L | 16 / 24 | 400 | Primary body, inputs |
| Body M | 14 / 20 | 400 | Default body, list items |
| Body S | 13 / 18 | 400 | Secondary descriptions |
| Label | 14 / 16 | 600 | Buttons, tab labels, chips |
| Caption | 12 / 16 | 500 | Meta, timestamps, helper text |
| Overline | 11 / 14 | 600, +0.06em, uppercase | Eyebrows, status labels |

### 4.3 Spacing scale
4px base. Tokens: `space-0:0`, `1:4`, `2:8`, `3:12`, `4:16`, `5:20`, `6:24`, `8:32`, `10:40`, `12:48`, `16:64`. Screen gutter = `space-4` (16px). Card padding = `space-4`. Section gap = `space-6`. Bottom-tab safe gap = `space-4 + safe-area`.

### 4.4 Border-radius scale
`radius-xs:6`, `sm:10`, `md:14` (default cards/inputs/buttons), `lg:20` (sheets, large cards), `xl:28` (bottom-sheet top corners, hero tiles), `full:9999` (pills, avatars, FAB).

### 4.5 Elevation / shadow levels
Warm-tinted shadows (not neutral gray) in light; near-black in dark. Borders carry more weight than shadows to keep it premium-flat.

| Level | Light | Dark | Use |
|---|---|---|---|
| `e0` | none (1px `--color-border`) | none (1px border) | flat cards |
| `e1` | `0 1px 2px rgba(80,50,10,.08)` | `0 1px 2px rgba(0,0,0,.5)` | resting cards |
| `e2` | `0 4px 12px rgba(80,50,10,.10)` | `0 4px 12px rgba(0,0,0,.55)` | raised/sticky app bar |
| `e3` | `0 12px 28px rgba(80,50,10,.14)` | `0 12px 28px rgba(0,0,0,.6)` | bottom sheets, modals |
| `e-fab` | `0 8px 20px rgba(245,158,11,.35)` | `0 8px 20px rgba(246,169,38,.28)` | primary FAB glow |

### 4.6 Motion / easing tokens
- Durations: `motion-fast:120ms`, `motion-base:200ms`, `motion-slow:320ms`, `motion-sheet:360ms`.
- Easing: `ease-standard: cubic-bezier(.2,0,0,1)`, `ease-emphasized: cubic-bezier(.2,0,0,1)` for sheet enter, `ease-exit: cubic-bezier(.4,0,1,1)`.
- Patterns: sheets slide up + scrim fade; toasts slide down from top of frame; tab change cross-fades content (`motion-fast`); skeleton shimmer 1.2s loop; button press scale `0.98`. **Respect `prefers-reduced-motion`** (disable transforms, keep opacity).

### 4.7 Component catalog (one-line specs)

- **Button** — primary (saffron fill, `on-primary` text), secondary (maroon outline/tonal), tertiary/ghost (text only), destructive (error), sizes sm/md/lg, states default/hover/pressed/disabled/loading(spinner), full-width variant for CTAs; min height 48px.
- **IconButton** — 44×44 tap target, lucide icon, variants ghost/tonal/filled; used for app-bar actions (back, chat, bell, search).
- **AppBar** — sticky top bar: leading (back/avatar/logo), centered or leading title, trailing actions (search, chat, notifications-with-badge); compact (56px) and large-title variants; transparent-over-hero variant for onboarding.
- **BottomTabBar** — 4–5 items, lucide icon + label, active item uses primary tint pill + accent indicator; safe-area padded; hidden on auth surface; per-role item sets.
- **BottomSheet** — radius-xl top corners, drag handle, scrim, snap points (peek/half/full), scrollable content; used for filters, slot pick, mode switch, confirmations.
- **Modal/Dialog** — centered within frame, e2/e3 elevation, title + body + action row; confirm/destructive/info variants; used for cancel-confirm, logout, errors.
- **PanditCard** — avatar, name, verified badge, specialization chips, rating + review count, city/distance, response time, from-price, favorite toggle; compact (list) and featured (carousel) variants; skeleton variant.
- **PujaCard** — puja name, category chip, icon/illustration, suggested duration, price range, "custom" flag variant (OQ5); grid + list density.
- **CategoryChip** — icon + label pill for categories (Katha, Jaap, Marriage…); selectable; horizontal scroller.
- **FilterChip** — toggleable filter pill with optional count badge and clear "×"; selected = primary tint.
- **FiltersSheet** — bottom sheet composing price range slider, rating, distance, availability, category, sort; apply/reset footer.
- **SlotPicker** — date strip + time-slot grid (available/booked/blocked states), single or multi-select; reads pandit availability; empty state when no slots.
- **Calendar** — month grid with per-day status dots (available/booked/blocked/leave), date selection, leave-block shading; week strip variant for compact pickers.
- **RatingStars** — read (fractional fill) and input (tap to set) modes, size sm/md/lg, optional numeric label.
- **ReviewItem** — reviewer avatar+name, stars, date, text, optional review images thumbnail row.
- **StatusStepper / Timeline** — horizontal stepper or vertical timeline of booking lifecycle (Requested→…→Rated) with current/done/upcoming/alt(cancelled/refunded) states.
- **MoneyBreakdown** — itemized rows (base, travel, emergency surcharge, custom-puja add-on, commission, total, advance, remaining, refund-minus-5%) with INR formatting and emphasized total.
- **Avatar** — circular image with initials fallback, sizes xs–xl, optional status ring (online/verified), stacked group variant for multi-pandit teams.
- **Badge / StatusPill** — small status token; semantic color mapping (e.g., Pending=warn, Accepted=info, Completed=success, Cancelled/Rejected=error, Verified=success, Custom=accent).
- **ListItem** — leading (icon/avatar), title + subtitle, trailing (chevron/value/toggle/badge); pressable + static variants; used in menus, settings, addresses.
- **SearchBar** — rounded input with leading search icon, optional voice/filter trailing, debounced; loading and clear states.
- **AddressPickerMap (mock)** — static map image with center pin + draggable stub, "use current location" button (canned coords), reverse-geocode mock fills address; label/type selector (Home/Parents/Relative/Temple/Custom).
- **ImageUploader** — tap-to-add tiles using local object URLs, multi-image grid with remove, progress/uploaded states (simulated), used for attachments, review images, optional pandit docs.
- **Toast** — transient top-of-frame notice, variants success/error/info/warn, auto-dismiss + action slot; queued via uiSlice.
- **EmptyState** — illustration/motif + title + body + optional CTA; reusable per screen empty condition.
- **SkeletonLoader** — shimmer placeholders matching card/list/detail layouts; composable primitives (line, circle, block).
- **Countdown** — live mm:ss / h:mm:ss timer to a deadline (OQ6 24h request expiry, OTP resend cooldown, cancellation window); urgent style when < threshold.
- **ModeSwitcher** — Jajman↔Pandit toggle (segmented or sheet); shows current mode, accent treatment per role; "Become a Pandit" entry when not entitled.
- **SegmentedControl** — 2–3 segment inline toggle (e.g., login method OTP/Password, list/grid, role tabs).
- **Stepper (wizard)** — top progress indicator for multi-step onboarding (Register → Role → Permissions → Profile); shows step n of m, back/continue.
- **KpiCard** — label + big tabular number + delta/trend chip + optional sparkline; used in dashboards (admin/pandit).
- **MiniChart** — recharts line/bar/area in a compact card; theme-aware colors; loading + empty states.
- **OtpInput** — 6-cell segmented numeric input, auto-advance/paste, error shake, resend link with cooldown (auth-specific primitive).

### 4.8 Devotional motif guidance
Motifs are **whisper-quiet, geometric, and optional** — never decorative clutter:
- **Soft gradient field** (`GradientField`): top-of-screen saffron→cream radial/linear wash behind heroes and the splash; ~6–10% opacity in body, stronger on splash/welcome.
- **Kalash/diya line motif** (`KalashLine`, `DiyaMark`): thin single-weight line-art SVGs at low opacity (8–12%) used as a corner watermark on empty states, splash, and section dividers — never behind body text that must be read.
- **Accent flourish**: a single gold hairline or small diya glyph as a divider or list-section marker; used sparingly (≤1 per screen region).
- Dark theme: motifs reduce opacity further and shift to gold-on-maroon so they glow rather than smudge.
- **Rule of restraint**: any screen should pass the "remove the motif and it still looks premium" test. Motif is seasoning, not structure.

---

## 5. Theming

### 5.1 Mechanism
- Tokens are **CSS custom properties** declared on `:root` (light) and overridden under `[data-theme="dark"]` in `theme/tokens.css`. The `<html>` (or PhoneFrame root) carries `data-theme`.
- **Tailwind** consumes the variables via `tailwind.preset.ts` extending the theme: `colors.primary = 'var(--color-primary)'`, etc. So Tailwind utility classes (`bg-primary`, `text-text-muted`, `border-border`) resolve through tokens — **no hex in components**.
- `theme/tokens.ts` mirrors the same tokens typed for occasional inline/JS access (e.g., recharts series colors, canvas/motif).
- **Theme resolution order**: explicit user choice (persisted in `uiSlice` / `localStorage` key `ps_theme`) → otherwise `prefers-color-scheme`. `ThemeProvider` sets `data-theme` and updates the mock status bar + scrollbar accordingly.

### 5.2 Token table (semantic groups)
| Group | Tokens |
|---|---|
| Surfaces | `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-surface-sunken` |
| Brand | `--color-primary`, `--color-primary-hover`, `--color-on-primary`, `--color-secondary`, `--color-on-secondary`, `--color-accent`, `--color-on-accent` |
| Text | `--color-text`, `--color-text-muted`, `--color-text-subtle` |
| Lines | `--color-border`, `--color-border-strong`, `--color-ring`, `--color-overlay` |
| Semantic | `--color-success(+bg)`, `--color-warn(+bg)`, `--color-error(+bg)`, `--color-info(+bg)` |
| Shape/motion | `--radius-*`, `--shadow-e0..e3`, `--motion-*`, `--ease-*` |
| Type | `--font-sans`, `--font-display`, `--font-deva` |

(Concrete light/dark hex values are defined in §4.1.)

### 5.3 Dark-mode toggle location(s)
- **Primary**: Profile → Settings → Appearance (System / Light / Dark segmented control). Available in Jajman, Pandit, and Admin profile/settings.
- **Onboarding**: a small theme toggle IconButton in the top-right of Splash/Welcome/Language so the demo can preview both early.
- **Dev**: DevToolbar quick-toggle (desktop, non-product).
- Toggle is instant (no reload); transition is a 200ms color cross-fade (suppressed under reduced-motion).

---

## 6. Navigation & App Shell

### 6.1 Surfaces and tabs
**Jajman (`/app`)** — BottomTabBar: **Home · Explore · Bookings · Favorites · Profile**. AppBar carries chat and notifications (bell with unread badge); search lives on Home/Explore.

**Pandit (`/pandit`)** — BottomTabBar: **Dashboard · Requests · Calendar · Earnings · Profile**. AppBar carries chat + notifications; Requests tab shows a count badge for pending requests.

**Admin (`/admin`, mobile)** — BottomTabBar: **Dashboard · Bookings · Users · More**. AppBar carries notifications + search. The **More** tab opens a menu (full screen or large sheet) listing: **Verifications · Pujas & Categories · Commission · Settlements · Withdrawals · Disputes · Reports · Settings**. Verifications shows a badge for pending pandit approvals (OQ1).

**Auth (`/…`)** — AuthShell: no bottom tab bar; minimal or transparent app bar (back + optional theme toggle). Wizard screens show the **Stepper** instead of tabs.

### 6.2 App bar patterns
- **Standard**: 56px, leading title, trailing 1–2 IconButtons.
- **Large title**: title scrolls from large (Title L) into the 56px bar on scroll (Home/Dashboard).
- **Search-in-bar**: SearchBar replaces title (Explore, Users).
- **Transparent-over-hero**: used on onboarding and detail heroes; back button on scrim.
- **Contextual/selection**: (later parts) for multi-select actions.

### 6.3 Mode switcher behavior
- Lives in **Profile** header and is reachable from the profile menu. Implemented as **ModeSwitcher** (segmented when entitled to both; otherwise a "Become a Pandit" ListItem CTA).
- Switching sets `activeRole`, persists it, and navigates to that role's landing (`resolveLanding`). The shell swaps tab set; a subtle accent shift signals the mode (Jajman = saffron-led, Pandit = maroon-led accent on tabs/app bar) while staying within the same palette.
- A small **mode pill** in the AppBar (e.g., "Jajman" / "Pandit") confirms current mode at a glance.

### 6.4 Deep-link / route map (foundation + auth)
```
/                         -> RootRedirect (resolveLanding)
/splash                   -> Splash (cold start)
/language                 -> LanguageSelect (first run)
/welcome                  -> WelcomeCarousel
/login                    -> MobileLogin (number entry)
/login/otp                -> OtpVerify
/login/password           -> PasswordLogin
/forgot                   -> ForgotPassword
/reset                    -> ResetPassword
/register                 -> Register
/onboarding/role          -> RoleSelect
/onboarding/permissions   -> PermissionsPriming
/onboarding/profile       -> ProfileSetup
/admin/login              -> AdminLogin

# Role group landings (specified in later parts; listed for guard targets)
/app/home  /app/explore  /app/bookings  /app/favorites  /app/profile
/pandit/dashboard  /pandit/requests  /pandit/calendar  /pandit/earnings  /pandit/profile
/pandit/pending-approval   /pandit/rejected
/admin/dashboard  /admin/bookings  /admin/users  /admin/more (+ sub-routes)
```
- **Unknown route** → friendly 404 inside the frame with "Go home" CTA (routes via `resolveLanding`).
- **Guarded route hit while unauthed** → redirect to `/welcome` preserving intended path for post-login return (prototype-level).

---

## 7. Mode Switching (single-account model UX)

- **One account, multiple capabilities.** `roles` records entitlement; `activeRole` records the current lens. The same profile (name, photo, mobile, language, notification prefs) is shared across modes; role-specific data (pandit public profile, charges, availability, wallet) attaches to the pandit capability.
- **Switching (entitled to both)**: tap ModeSwitcher in Profile → segmented Jajman/Pandit → instant switch with a confirming toast ("Switched to Pandit mode"). Tabs, home, and accent re-render. No re-login.
- **Becoming a Pandit (Jajman-only)**: Profile shows a **"Become a Pandit"** card/ListItem. Tapping it enters the **pandit onboarding** wizard (profile → supported pujas → charges → availability → submit). On submit, `panditStatus='pending'` and the account is routed to **Pending Admin Approval** (OQ1). `roles` gains `'pandit'` only after admin approval; until then Pandit mode shows the pending/rejected screen rather than the dashboard.
- **Pending/Rejected states (Pandit)**: `pending-approval` screen explains the 24-ish-hour review and lets the user keep using Jajman mode; `rejected` screen shows the admin's reason and a "resubmit" CTA.
- **Edge cases**: if a both-role user is in Pandit mode and gets un-entitled (admin revoke — admin-side, later), the guard falls back to Jajman with a toast. Admin sessions never expose the ModeSwitcher.

---

## 8. Screen Inventory — Auth & Onboarding (shared)

> Currency is INR (₹). All async is simulated via `mock/simulate.ts`. "Mock code" for OTP is `123456`.

---

### Splash
- **Route**: `/splash`
- **Surface/Tab**: Auth (AuthShell, no tabs)
- **Purpose**: Brand entry / cold-start boot while session and theme resolve.
- **Layout**: Full-bleed warm `GradientField` background with faint `KalashLine` watermark; centered wordmark ("Pandit Seva") in display serif + tagline ("Sacred ceremonies, trusted pandits"); subtle bottom loading indicator; top-right theme toggle.
- **Components**: GradientField, KalashLine motif, brand wordmark, SkeletonLoader/spinner, IconButton (theme).
- **States**: default (animated logo fade-in); loading (boot, ~600–900ms simulated); error (if store fixtures fail to seed → "Couldn't start" with Retry).
- **Data**: reads [`session.authed`, `session.isAdmin`, `session.activeRole`, `session.onboardingComplete`, `ui.theme`, `ui.language`]; writes [none].
- **Interactions**: auto-advance via `resolveLanding` → first-run (no language set) → `/language`; else unauthed → `/welcome`; authed → role/admin landing. Theme toggle → flips theme.
- **Notes**: Only shown on true cold start; subsequent in-app navigation skips it. Honors reduced-motion (no logo animation).

---

### Language Select (first run)
- **Route**: `/language`
- **Surface/Tab**: Auth
- **Purpose**: Pick app language on first launch (English / हिन्दी / संस्कृतम्).
- **Layout**: AppBar (transparent, title "Choose your language" / localized); body = three large selectable ListItem/cards each showing the language in its own script + English label + sample line; sticky **Continue** primary button.
- **Components**: AppBar, ListItem (selectable, radio-style), Button (primary), motif divider.
- **States**: default (English preselected); selected (highlighted card); no loading/empty/error (local).
- **Data**: reads [`ui.language`]; writes [`uiSlice.setLanguage(lang)`].
- **Interactions**: select a language → updates preview copy live (i18n stub); Continue → persists language, marks first-run language done → `/welcome`. Back is suppressed (first screen of first run).
- **Notes**: Switching to `hi`/`sa` activates the Devanagari font stack immediately, validating font fallback. Language is later editable in Profile.

---

### Welcome carousel
- **Route**: `/welcome`
- **Surface/Tab**: Auth
- **Purpose**: 3–4 slide value-prop intro; entry to login/register.
- **Layout**: Full-height swipeable carousel (each slide: illustration/motif, Title, Body); page dots; **Skip** (top-right). Bottom: primary **Get Started** (→ login) + secondary **I already have an account / Log in**; tiny "Admin" text link to `/admin/login`.
- **Components**: Carousel (swipe + dots), GradientField, motif art, Button (primary + ghost), text link.
- **States**: default; last-slide variant (Get Started emphasized); no loading/empty/error.
- **Data**: reads [`ui.language`]; writes [none].
- **Interactions**: swipe/dots → change slide; Skip → jump to last slide / login; Get Started → `/login`; Log in → `/login`; Admin link → `/admin/login`; theme toggle persists.
- **Notes**: Slides localized; restrained motif so it reads premium, not promotional.

---

### Mobile login (number entry)
- **Route**: `/login`
- **Surface/Tab**: Auth
- **Purpose**: Primary auth — enter mobile number to receive OTP; or switch to password.
- **Layout**: AppBar (back); hero title "Welcome / Log in or sign up"; country code selector (+91 default) + mobile input; helper text; **Continue** primary (sends OTP); SegmentedControl or link "Use password instead"; divider "or"; social buttons (Google/Apple) **disabled "coming soon"**; footer "New here? Create account" → register.
- **Components**: AppBar, Input (tel) with country-code prefix, SegmentedControl/link, Button, disabled social buttons, validation helper.
- **States**: default; invalid (inline error "Enter a valid 10-digit number"); loading (Continue spinner while OTP "sends"); error (simulated send failure → toast + retry); disabled Continue until valid.
- **Data**: reads [`session`]; writes [`sessionSlice.requestOtp(phone)` → sets `pendingPhone`, starts resend cooldown timer].
- **Interactions**: valid number + Continue → simulate send → `/login/otp`; "Use password" → `/login/password`; "Create account" → `/register`; back → `/welcome`.
- **Notes**: Uses `validation.ts` phone check. Existing vs new number both flow to OTP in the prototype (mock detects "registered" numbers from seed to decide post-OTP routing).

---

### OTP verification (mock)
- **Route**: `/login/otp`
- **Surface/Tab**: Auth
- **Purpose**: Verify the 6-digit OTP (mocked) to authenticate.
- **Layout**: AppBar (back); title "Verify your number"; subtitle showing masked phone (`+91 •••••• 4321`) with "Change" link; **OtpInput** (6 cells); **resend** link with **Countdown** cooldown; dev hint chip "Use mock code 123456"; **Verify** primary (auto-submits when 6 digits entered).
- **Components**: AppBar, OtpInput, Countdown, Button, Toast, helper/dev-hint chip.
- **States**: default; entering (auto-advance); loading (verifying spinner); error (wrong code → shake + inline "Incorrect code, try again", clears cells); locked (after N wrong attempts → cooldown message — prototype-light); resend states (cooldown active vs "Resend code").
- **Data**: reads [`session.pendingPhone`, resend deadline]; writes [`sessionSlice.verifyOtp(code)` → on success sets `authed`, resolves user; `sessionSlice.resendOtp()` resets cooldown].
- **Interactions**: correct code → if existing user → `resolveLanding` (Jajman/Pandit/landing); if new number → `/register` (prefilled phone) → onboarding; wrong → error state; Resend (after cooldown) → restart timer + toast; Change → back to `/login`.
- **Notes**: OTP entirely simulated (OQ/Out-of-scope). Resend cooldown modeled with in-store deadline; success path differentiates new vs returning to route into onboarding when needed.

---

### Password login
- **Route**: `/login/password`
- **Surface/Tab**: Auth
- **Purpose**: Alternate auth via mobile + password.
- **Layout**: AppBar (back); title "Log in with password"; mobile input; password input (show/hide toggle); "Forgot password?" link; **Log in** primary; link "Use OTP instead"; footer "Create account".
- **Components**: AppBar, Input (tel), Input (password + reveal IconButton), Button, validation helper.
- **States**: default; invalid (field-level errors); loading (verifying); error (wrong credentials → inline + toast "Incorrect mobile or password"); disabled until both filled.
- **Data**: reads [seed users for credential match]; writes [`sessionSlice.passwordLogin(phone,pw)` → on success sets `authed`/user].
- **Interactions**: valid creds → `resolveLanding`; "Forgot password?" → `/forgot`; "Use OTP instead" → `/login`; "Create account" → `/register`; back → `/login`.
- **Notes**: Mock credentials documented in seed (e.g., a demo Jajman, a demo both-role user). No real hashing.

---

### Forgot / Reset password
- **Route**: `/forgot` (request) → `/reset` (set new)
- **Surface/Tab**: Auth
- **Purpose**: Recover access: request reset code, then set a new password.
- **Layout**:
  - `/forgot`: AppBar (back); title "Reset your password"; mobile input; explanation ("We'll send a verification code"); **Send code** primary.
  - `/reset`: AppBar (back); title "Set a new password"; OtpInput (verify reset code) **or** code field; new password + confirm password (with strength helper); **Save & Log in** primary.
- **Components**: AppBar, Input, OtpInput, Button, password-strength meter, Toast.
- **States**: default; invalid (mismatch "Passwords don't match", weak password); loading (send/save); error (number not found → inline; reset failed → toast); success (toast "Password updated").
- **Data**: reads [seed users]; writes [`sessionSlice.requestPasswordReset(phone)`, `sessionSlice.resetPassword(code,newPw)` → may auto-authenticate].
- **Interactions**: `/forgot` Send code → simulate → `/reset` (prefilled phone); `/reset` Save → update mock credential → auto-login → `resolveLanding`; back chains to `/login/password`.
- **Notes**: Reset code is the same mock OTP simulation. Strength meter is presentational.

---

### Register / create account
- **Route**: `/register`
- **Surface/Tab**: Auth (Stepper begins here)
- **Purpose**: Create a new account (mobile + optional password) before onboarding.
- **Layout**: AppBar (back) + **Stepper** (step 1 of 4); title "Create your account"; fields: mobile (prefilled if arriving from OTP, read-only when verified), full name (can be deferred to profile setup — minimal here), set-password (optional, with toggle "Set up password / use OTP only"); consent checkbox (Terms & Privacy links — placeholder); **Continue** primary; footer "Already have an account? Log in".
- **Components**: AppBar, Stepper, Input(s), Checkbox, Button, links.
- **States**: default; invalid (field errors, consent required); loading (creating account); error (number already registered → inline "Account exists — log in instead" with link); disabled until valid + consent.
- **Data**: reads [`session.pendingPhone`]; writes [`sessionSlice.createAccount({phone, name?, password?})` → creates user, sets `authed`, `onboardingComplete=false`].
- **Interactions**: Continue → `/onboarding/role`; "Log in" → `/login`; back → `/login`.
- **Notes**: If arriving post-OTP, phone is verified and locked. Keeps friction low (name/photo can be captured in Profile setup, step 4).

---

### Role selection — "How will you use the app?"
- **Route**: `/onboarding/role`
- **Surface/Tab**: Auth (Stepper step 2 of 4)
- **Purpose**: Choose initial usage: Jajman, Pandit, or Both (single-account model).
- **Layout**: AppBar (back) + Stepper; hero title "How will you use Pandit Seva?"; three large selectable cards:
  - **Jajman** (Book pujas & pandits) — icon, blurb.
  - **Pandit** (Offer services & get bookings) — icon, blurb; note "Requires admin approval".
  - **Both** (Book and offer) — icon, blurb.
  Sticky **Continue** primary.
- **Components**: AppBar, Stepper, selectable role cards (ListItem/card with radio), Badge (info "Approval required" on Pandit/Both), Button.
- **States**: default (none selected → Continue disabled); selected; no loading/empty/error (local).
- **Data**: reads [none]; writes [`sessionSlice.setIntendedRoles(['jajman'] | ['pandit'] | ['jajman','pandit'])`, sets `activeRole` (defaults to Jajman if Both)].
- **Interactions**: select → enable Continue; Continue → `/onboarding/permissions`. Choosing Pandit/Both flags `panditStatus='pending'` to be set after profile completion (the pandit-specific config wizard is a later part; here we record intent and route the pandit setup afterward).
- **Notes (OQ1)**: Pandit/Both clearly communicate the **admin-approval gate**; document upload is optional and not the gate. A Both user lands in Jajman mode initially and can complete pandit setup from Profile → "Become a Pandit".

---

### Permissions priming (location + notifications)
- **Route**: `/onboarding/permissions`
- **Surface/Tab**: Auth (Stepper step 3 of 4)
- **Purpose**: Explain why location & notifications help, before any (simulated) system prompt.
- **Layout**: AppBar (back) + Stepper; two priming cards:
  - **Location** — "Find pandits near you & set accurate ceremony addresses." Allow / Not now.
  - **Notifications** — "Booking updates, requests & reminders (mobile + WhatsApp)." Allow / Not now.
  Sticky **Continue** primary.
- **Components**: AppBar, Stepper, priming cards with icon + Button pair, Toast.
- **States**: default; granted (card shows "Enabled" check); denied/"Not now" (muted, still continuable); loading (simulated prompt delay); no real error (simulated grant always resolves).
- **Data**: reads [none]; writes [`sessionSlice.setPermission('location'|'notifications', boolean)`].
- **Interactions**: Allow → simulate prompt → mark granted (toast); Not now → mark not-granted; Continue → `/onboarding/profile`; back → `/onboarding/role`.
- **Notes**: Purely simulated — no real `navigator.geolocation`/Notification API needed; denial is non-blocking (location can be set manually via AddressPickerMap later; notifications can be enabled in Profile prefs).

---

### Common profile setup
- **Route**: `/onboarding/profile`
- **Surface/Tab**: Auth (Stepper step 4 of 4 — final)
- **Purpose**: Capture shared profile (name, photo, language pref, notification prefs) to complete onboarding.
- **Layout**: AppBar (back) + Stepper (final); avatar uploader (tap to add photo, initials fallback); fields: full name (required), mobile (read-only, verified), language preference (English/Hindi/Sanskrit selector, prefilled from §Language); notification preferences toggles (Booking updates, Reminders, Promotions; channels Mobile/WhatsApp — WhatsApp simulated); **Finish** primary.
- **Components**: AppBar, Stepper, ImageUploader (single avatar mode), Input, language selector (SegmentedControl/ListItem), toggle switches, Button.
- **States**: default; invalid (name required); loading (saving profile); error (simulated save failure → toast + retry); success (toast "Welcome, {name}").
- **Data**: reads [`session.user`, `ui.language`]; writes [`sessionSlice.completeProfile({name, photo, language, notifPrefs})`, sets `onboardingComplete=true`; `uiSlice.setLanguage` if changed].
- **Interactions**: Finish → `resolveLanding`:
  - intended Jajman → `/app/home`;
  - intended Pandit/Both → set `panditStatus='pending'` and route into **pandit setup** (later part) or, for Both, land Jajman home with a "Finish pandit setup" prompt.
  Back → `/onboarding/permissions`.
- **Notes**: Photo stored as local object URL (out-of-scope: cloud upload). Profile is shared across modes (single-account). Language change re-applies Devanagari font stack.

---

### Admin login
- **Route**: `/admin/login`
- **Surface/Tab**: Auth (separate admin entry)
- **Purpose**: Authenticate the separate admin account into the admin (mobile) surface.
- **Layout**: AppBar (back to `/welcome`); distinct but on-brand header ("Admin Console") with a shield/lock motif; email/username input; password input (reveal toggle); **Log in** primary; subtle note "Admin access only"; no register/social.
- **Components**: AppBar, Input (text), Input (password + reveal), Button, validation helper, Toast.
- **States**: default; invalid (field errors); loading (verifying); error (wrong creds → inline + toast); disabled until filled.
- **Data**: reads [seed admin credential]; writes [`sessionSlice.adminLogin(user,pw)` → sets `authed` + `isAdmin=true`].
- **Interactions**: valid creds → `/admin/dashboard`; back → `/welcome`. Admin and end-user sessions are mutually exclusive; logging in as admin clears any end-user `activeRole`/`roles` context for the session.
- **Notes**: Visually signals "different surface" while staying within the warm-premium palette (cooler, more utilitarian accent usage, maroon-forward header). Demo admin credentials documented in seed.

---

### Cross-cutting auth/onboarding notes
- **Resume logic**: if `authed && !onboardingComplete`, `resolveLanding` resumes at the first incomplete onboarding step (role → permissions → profile), so a refresh mid-onboarding doesn't lose place.
- **Back-stack hygiene**: post-authentication screens replace (not push) auth routes so the device back gesture doesn't re-enter login.
- **Skeletons**: any screen reading seed/user data (post-login transitions) shows the matching SkeletonLoader during the simulated latency.
- **Errors**: every "server" call can be forced to fail via the DevToolbar "simulate failure" flag to demonstrate error states (toast + inline + retry) on login, OTP, register, reset, and profile save.
- **i18n**: all copy above flows through `t()`; `en` complete, `hi`/`sa` stubbed; Devanagari font fallback validated on Language select and Profile setup.

---

**End of Part 1 (Foundation & Shared Auth/Onboarding).** Subsequent parts specify the Jajman, Pandit, and Admin screen inventories on this foundation, reusing the design system (§4), theming (§5), navigation shell (§6), and the resolved open questions (OQ1–OQ6) referenced throughout.

---

## SCREEN INVENTORY — JAJMAN

This inventory covers the Jajman (devotee/family) surface of the Pandit Seva App. All screens render inside the centered phone-frame shell (~390–420px). Theme tokens (light/dark) and i18n stubs (EN/HI/SA) apply globally. Bottom tabs: **Home · Explore · Bookings · Favorites · Profile**; the app bar carries the chat and notifications entries.

---

### Design-system primitives referenced throughout
Reusable components cited by screens below (defined once here, not re-specified per screen):
- **AppBar** (title + leading/trailing actions; variants: home/transparent, standard, modal-close), **BottomNav** (5 tabs, active = saffron, badge dots), **PhoneShell** (frame wrapper).
- **PanditCard** (photo, name, rating, distance, price-from, response badge, favorite heart), **PanditCardSkeleton**.
- **CategoryChip / CategoryTile**, **PujaCard**, **AddressCard**, **AddressPickerRow**.
- **StatusStepper** (lifecycle), **StatusBadge** (Requested/Accepted/.../Refund Completed color-coded), **CountdownTimer** (24h response, cancellation window, urgent eligibility window).
- **MoneyBreakdown** (base, travel, surcharge, commission-hidden-from-jajman, advance, remaining, total), **PaymentMethodSelector** (UPI/Card/Netbanking/Wallet), **RatingStars**, **ReviewCard**.
- **BottomSheet**, **Modal/Dialog**, **Toast/Snackbar**, **Skeleton**, **EmptyState** (illustration + line motif + CTA), **ErrorState** (retry), **SegmentedTabs**, **ChipGroup**, **RangeSlider**, **DatePicker/SlotPicker**, **AttachmentUploader**, **NoteField**, **MapView** (mock map with pins), **Stepper/Wizard header**.
- Devotional motif tokens: soft saffron→amber gradient header wash, faint kalash/diya line motif watermark on empty states and headers.

---

## A. HOME / DASHBOARD

### Home
- Route: `/`
- Surface/Tab: Jajman · Home tab
- Purpose: Personalized launch surface for discovery and active bookings.
- Layout: Transparent gradient AppBar (left: AddressSelector pill "Home ▾"; right: notifications bell w/ badge, chat icon w/ unread badge). Body scroll regions top→bottom: (1) SearchBar (tap → Search); (2) Emergency/Urgent banner card (saffron-edged, "Need a Pandit today?"); (3) CategoryTiles horizontal scroll (Katha, Jaap, Marriage, Griha Pravesh, Festival Puja, Shradh, Temple Rituals, "All"); (4) "Featured Pandits near you" horizontal PanditCard rail; (5) "Upcoming Bookings" section (next 1–2 BookingMiniCards w/ StatusBadge + countdown if pending); (6) "Recent Bookings" + inline "Rebook" buttons; (7) Favorites strip (avatars, quick-rebook); (8) Quick-rebook suggestions ("Book Satyanarayan Katha again"); (9) Referral promo card. Bottom nav.
- Components: AppBar(home), AddressSelector, SearchBar, EmergencyBanner, CategoryTile rail, PanditCard rail, BookingMiniCard, FavoriteAvatarStrip, RebookCard, ReferralPromoCard, BottomNav.
- States: default; loading-skeleton (shimmer for each rail + cards); empty (new user: no bookings/favorites → show categories + featured + "Find your first Pandit" CTA, hide upcoming/recent/favorites sections); error (rails fail → per-section ErrorState with retry, rest still render).
- Data: reads [currentUser.name, addresses(default), categories, pandits(featured by distance/rating), bookings(upcoming,recent), favorites, notifications.unreadCount, chat.unreadCount, referral.code]; writes [none on load; favorite toggle writes favorites].
- Interactions: AddressSelector → AddressPicker sheet; bell → Notifications; chat icon → Chat list; SearchBar → Search; CategoryTile → Category browse; Emergency banner → Urgent booking flow; PanditCard → Pandit detail; heart on card → toggle favorite (optimistic + Toast); upcoming BookingMiniCard → Booking detail; "Rebook" → Rebook-same-puja flow; favorite avatar → Pandit detail; "See all" links → respective lists; Referral card → Referral program.
- Notes: If default address missing → AddressSelector shows "Set location" prompting Add address. Urgent banner only when within eligibility time window (OQ3); else shows generic "Book ahead". Quick-rebook only if ≥1 completed booking.

### Address Selector (sheet)
- Route: `/` (modal `?sheet=address`)
- Surface/Tab: Home (global header action)
- Purpose: Switch the active delivery address used for distance/booking defaults.
- Layout: BottomSheet; title "Deliver Seva to"; list of AddressCard (radio); "Use current location (GPS)" row with pin icon; "+ Add new address" row.
- Components: BottomSheet, AddressCard(radio), GPSRow, AddRow.
- States: default; loading (skeleton rows); empty (no saved addresses → only GPS + Add); error (GPS denied → inline message "Enable location or pick saved address").
- Data: reads [addresses, user.activeAddressId]; writes [user.activeAddressId; optional new address].
- Interactions: select address → set active + close + re-fetch nearby; GPS row → request mock geolocation → set ephemeral address; Add new → Add/edit address; backdrop → dismiss.
- Notes: Active address drives distance shown on PanditCards everywhere.

---

## B. DISCOVERY

### Search
- Route: `/search`
- Surface/Tab: Jajman · Explore tab (and entry from Home SearchBar)
- Purpose: Free-text + voice search across pandits, pujas, categories.
- Layout: AppBar (back, search input focused, mic icon, Filter icon w/ active-count badge). Body: when empty query → "Recent searches" chips + "Popular pujas" chips + "Browse by category" grid. When typing → live suggestion list (pandits, pujas, categories grouped). SegmentedTabs to toggle Results: List | Map.
- Components: AppBar(search-input), ChipGroup(recent/popular), SuggestionList, SegmentedTabs, FilterIconBadge.
- States: default (pre-query suggestions); loading (suggestion skeleton); empty (no recent → popular only); typing/results-loading; no-results ("No matches — try fewer filters" → opens Filters / Alternate suggestions).
- Data: reads [searchHistory, popularPujas, categories, suggestions(query)]; writes [searchHistory on submit].
- Interactions: submit/suggestion tap → Results list; mic → mock voice fill; Filter → Filters sheet; tab toggle → Map view; recent chip → run search; clear → reset.
- Notes: Persists last filters; filter badge shows count of active filters.

### Filters (sheet)
- Route: `/search` (modal `?sheet=filters`)
- Surface/Tab: Explore · Search
- Purpose: Refine results across all PRD facets.
- Layout: BottomSheet (drag handle, "Filters", "Reset"); sections: Category (chips multi), Puja name (search field), Date/Availability (DatePicker + "Available now" toggle), Price range (RangeSlider ₹min–₹max), Minimum rating (star chips 3+/4+/4.5+), City (dropdown/search), Distance radius (slider km), Travel preference (within radius / outside / anywhere), Language (chips). Sticky footer: "Show N results".
- Components: BottomSheet, ChipGroup, RangeSlider, DatePicker, ToggleSwitch, StarChips, Dropdown, StickyFooterButton.
- States: default (current filters reflected); live-count updating; error (count fetch fails → footer "Show results", apply anyway).
- Data: reads [categories, pujas, cities, priceBounds, filterState]; writes [filterState; result query].
- Interactions: change any control → debounced count update; Reset → clear; "Show N results" → apply + close → Results; backdrop → dismiss without apply.
- Notes: Date filter feeds availability badges in results; "Available now" surfaces emergency-eligible pandits.

### Results list
- Route: `/search/results`
- Surface/Tab: Explore · Search
- Purpose: Ranked list of matching pandits.
- Layout: AppBar (back, result count, Sort icon, Filter badge, Map toggle). Active-filter chips row (removable). Body: vertical PanditCard list (infinite scroll). FAB/segment to switch to Map.
- Components: AppBar, ActiveFilterChips, SortSheet, PanditCard list, MapToggle, PanditCardSkeleton.
- States: default; loading-skeleton (5–6 cards); empty/no-results (→ Alternate suggestions block embedded: similar/nearby/same-puja/similar-price); error (retry); end-of-list footer.
- Data: reads [pandits(filtered,sorted), filterState, sortState]; writes [favorites (heart), filterState (chip removal)].
- Interactions: card → Pandit detail; heart → toggle favorite; remove filter chip → re-query; Sort → SortSheet (distance/rating/price/response time); Map toggle → Map view; scroll → paginate.
- Notes: No-results triggers OQ-aligned Alternate suggestions inline.

### Sort (sheet)
- Route: `/search/results` (modal `?sheet=sort`)
- Surface/Tab: Explore · Results
- Purpose: Choose ranking.
- Layout: BottomSheet radio list: Relevance, Distance (near→far), Rating (high→low), Price (low→high / high→low), Response time (fast→slow), Most pujas completed.
- Components: BottomSheet, RadioList.
- States: default (current selected).
- Data: reads [sortState]; writes [sortState].
- Interactions: select → apply + close + re-sort.
- Notes: —

### Map view (nearby pandits)
- Route: `/explore/map`
- Surface/Tab: Explore · Map
- Purpose: Spatial discovery of nearby pandits.
- Layout: Full-bleed mock MapView with center pin (active address), pandit pins (price/rating mini-labels), top floating SearchBar + Filter chip, bottom draggable PanditCard carousel synced to selected pin. "List" toggle pill.
- Components: MapView, MapPin, FloatingSearchBar, BottomCarousel(PanditCard), Toggle.
- States: default; loading (map shimmer + "Locating…"); empty (no pandits in radius → "Expand radius" CTA); error (map/GPS fail → fallback to list with banner).
- Data: reads [pandits(geo within radius), activeAddress.coords]; writes [selectedPandit; favorites].
- Interactions: tap pin → focus + scroll carousel; carousel swipe → move map; card tap → Pandit detail; "Expand radius" → widen filter; List toggle → Results list.
- Notes: Mock map (static tiles/SVG) — no real map SDK.

### Category browse
- Route: `/category/:categoryId`
- Surface/Tab: Explore (from Home tiles / Search)
- Purpose: Browse pujas + pandits within a category (e.g., Katha).
- Layout: AppBar (back, category name). Header banner (category motif + description, suggested duration/amount range). Sections: "Pujas in this category" PujaCard grid; "Top Pandits for {category}" PanditCard rail.
- Components: AppBar, CategoryHeader, PujaCard grid, PanditCard rail.
- States: default; loading-skeleton; empty (no pandits yet → "Coming soon, get notified" / show pujas only); error (retry).
- Data: reads [category, pujas(byCategory), pandits(byCategory)]; writes [favorites].
- Interactions: PujaCard → Puja browse/detail; PanditCard → Pandit detail; "See all pandits" → Results list pre-filtered by category.
- Notes: —

### Puja browse / Puja detail
- Route: `/puja/:pujaId`
- Surface/Tab: Explore
- Purpose: Explain a puja type and route to qualified pandits.
- Layout: AppBar (back, puja name, share). Body: hero (puja icon/motif), about/significance, typical duration, suggested amount range, what's included/required (samagri note), multi-pandit indicator if applicable, "Pandits who perform this" PanditCard rail, primary CTA "Find Pandits".
- Components: AppBar, PujaHero, InfoBlocks, MultiPanditBadge, PanditCard rail, PrimaryCTA.
- States: default; loading; empty (no pandits → Alternate suggestions: same-puja experts elsewhere / nearby); error.
- Data: reads [puja(meta,duration,amountRange,isMultiPandit), pandits(supportingPuja)]; writes [favorites].
- Interactions: "Find Pandits" → Results filtered by puja; PanditCard → Pandit detail; share → share sheet (mock); if multi-pandit → "Book as team" routes to Multi-pandit intro.
- Notes: OQ4 — multi-pandit pujas surface the team-booking entry here.

### Alternate suggestions (booking-failed fallback)
- Route: `/suggestions?context=...` (also embedded in empty Results)
- Surface/Tab: Explore (post-failure)
- Purpose: Recover when a pandit rejects/expires or no results — show similar, nearby, same-puja experts, similar price.
- Layout: AppBar (back, "Other options for you"). Context banner ("Pandit Sharma is unavailable for this date"). Four labeled rails: Similar Pandits, Nearby Pandits, Same-Puja Experts, Similar Price Range. CTA "Adjust search".
- Components: AppBar, ContextBanner, PanditCard rails ×4, SecondaryCTA.
- States: default; loading; empty (truly none → "Try another date/city" with Filters CTA); error.
- Data: reads [originalRequest, pandits(similar,nearby,samePuja,similarPrice)]; writes [favorites; new booking start].
- Interactions: card → Pandit detail (pre-seeded puja/date); "Adjust search" → Filters; rail "See all" → Results.
- Notes: Reached automatically from Request-expired/rejected states (OQ6) and from no-results Results list.

---

## C. PANDIT PROFILE

### Pandit detail (public profile)
- Route: `/pandit/:panditId`
- Surface/Tab: Jajman (from anywhere)
- Purpose: Full public profile + booking entry.
- Layout: Collapsing header (cover gradient/motif, photo, name, verified badge, city + distance, favorite heart, share). Stat row: Rating(★+count) · Pujas completed · Experience(yrs) · Response rate% · Response time. SegmentedTabs/anchored sections: About; Languages; Specializations; Supported Pujas (list w/ price-from + duration, each tappable to start booking); Availability preview (next open slots mini-calendar); Service area (radius + travel preference); Charges summary; Reviews preview (top 2–3 + "See all"). Sticky bottom bar: "Chat" (secondary) + "Book" (primary).
- Components: CollapsingHeader, StatRow, SegmentedTabs/Sections, SupportedPujaRow, AvailabilityPreview, ServiceAreaBlock, ReviewCard, StickyBottomBar.
- States: default; loading-skeleton (header + stat shimmer); error (retry); variants: unavailable (greyed Book → "Currently unavailable" + suggestions link), pending-verification pandit hidden (not shown to jajman), multi-pandit-capable (lead-pandit badge), favorited vs not.
- Data: reads [pandit(all public fields), supportedPujas, availability(preview), reviews(top), favorites.includes]; writes [favorites toggle].
- Interactions: heart → toggle favorite (Toast); share → mock share; supported puja row → Booking: select puja (pre-selected); "Book" → Booking flow (puja chooser); "Chat" → Chat thread (creates/open thread, gated copy if no booking yet → "Chat opens after you send a request"); "See all reviews" → All reviews; availability "View calendar" → date/slot step.
- Notes: If hidden phone (user-controlled) → Chat-only note. Response rate/time per PRD shown prominently for trust.

### All reviews
- Route: `/pandit/:panditId/reviews`
- Surface/Tab: Jajman · Pandit
- Purpose: Full review list with filtering.
- Layout: AppBar (back, "Reviews"). Summary header (avg rating, distribution bars 5→1, total count). Filter chips (All, 5★…1★, With photos). ReviewCard list (avatar, name, stars, date, text, review images, puja tag).
- Components: AppBar, RatingSummary, DistributionBars, FilterChips, ReviewCard list.
- States: default; loading-skeleton; empty ("No reviews yet"); error (retry); paginated.
- Data: reads [reviews(byPandit, filter)]; writes [none].
- Interactions: filter chip → filter; review image → lightbox; scroll → paginate.
- Notes: —

---

## D. BOOKING — SINGLE PANDIT (wizard)

Shared wizard chrome: Stepper header (Puja → Date → Address → Details → Summary), back navigates step, persists draft in store.

### Booking — Select puja & duration
- Route: `/book/:panditId/puja`
- Surface/Tab: Jajman · Booking wizard (step 1)
- Purpose: Choose the puja and confirm/adjust duration.
- Layout: Stepper. Pandit mini-header (photo, name). Supported-puja radio list (name, base charge, suggested duration). Selected puja → duration selector (suggested default, +/- within min/max), optional samagri "included by pandit?" toggle (informational). "Custom puja" entry if pandit offers it. Sticky "Next".
- Components: StepperHeader, PanditMiniHeader, RadioPujaList, DurationStepper, CustomPujaRow, StickyNext.
- States: default; loading (puja list); empty (pandit has no configured pujas → block w/ message + back); error; variant: custom-puja flagged with "Additional charges" note (OQ5).
- Data: reads [pandit.supportedPujas(charge,duration min/max), pandit.customPujas]; writes [bookingDraft.pujaId, .duration, .isCustom].
- Interactions: select puja → expand duration; custom puja → shows extra-charge badge + note; Next → Select date/slot.
- Notes: OQ5 — custom puja clearly flagged with additional charges in MoneyBreakdown later.

### Booking — Select date & slot
- Route: `/book/:panditId/date`
- Surface/Tab: Booking wizard (step 2)
- Purpose: Pick date + available time slot.
- Layout: Stepper. Month calendar (available dates highlighted, blocked/leave dates disabled). Selected date → slot chips (from pandit availability/recurring). "Urgent same-day?" hint if today within emergency window. Sticky "Next".
- Components: StepperHeader, Calendar, SlotChipGroup, UrgentHint, StickyNext.
- States: default; loading (availability fetch skeleton); empty (no slots in month → "Next available: {date}" jump + suggestions); error; variant: emergency-eligible (banner → switch to Urgent flow with surcharge).
- Data: reads [pandit.availability(slots, recurring, leave/blocked)]; writes [bookingDraft.date, .slotId].
- Interactions: pick date → load slots; pick slot → enable Next; "Next available" → jump month; urgent hint → Emergency flow; Next → Select address.
- Notes: OQ3 — same-day selection routes to surcharge path.

### Booking — Select address
- Route: `/book/:panditId/address`
- Surface/Tab: Booking wizard (step 3)
- Purpose: Choose venue address (drives travel charge).
- Layout: Stepper. AddressCard radio list (Home/Parents/Temple/Custom) + "Use current GPS" + "+ Add new address". Distance-from-pandit + estimated travel note per card. Sticky "Next".
- Components: StepperHeader, AddressCard(radio), GPSRow, AddRow, TravelEstimateChip, StickyNext.
- States: default; loading; empty (no addresses → force Add); error (GPS/distance calc fail → allow manual).
- Data: reads [addresses, pandit.serviceRadius, pandit.travelPreference]; writes [bookingDraft.addressId].
- Interactions: select address → travel estimate; Add new → Add/edit address (returns); out-of-radius address + travel pref "within radius only" → warning + "Request anyway?" or pick another; Next → Add details.
- Notes: Travel charges finalized at pandit acceptance per PRD; shown as estimate here.

### Booking — Add attachments (images/docs/notes)
- Route: `/book/:panditId/details`
- Surface/Tab: Booking wizard (step 4)
- Purpose: Attach venue photos, documents, and notes.
- Layout: Stepper. Sections: Photos uploader (house/temple/venue, grid + add), Documents uploader (invitation card/details), Notes field (parking, contact person, special requests), Contact person field, "Share my phone number" toggle (phone-visibility control). Sticky "Next".
- Components: StepperHeader, AttachmentUploader(images), AttachmentUploader(docs), NoteField, TextField, ToggleSwitch, StickyNext.
- States: default; uploading (per-thumb progress, mock); error (upload fail → retry/remove); empty (all optional → Next always enabled).
- Data: reads [bookingDraft.attachments]; writes [bookingDraft.images, .docs, .notes, .contactPerson, .sharePhone].
- Interactions: add photo/doc → mock upload; remove → delete; toggle phone → sets visibility; Next → Summary.
- Notes: Phone-visibility ties to chat (hidden → chat-only).

### Booking — Summary & MoneyBreakdown
- Route: `/book/:panditId/summary`
- Surface/Tab: Booking wizard (step 5)
- Purpose: Review everything; show money math; send request.
- Layout: Stepper. Review cards (Pandit, Puja+duration, Date+slot, Address, Attachments count, Notes). MoneyBreakdown (Base charge, Custom-puja additional [if any], Travel estimate, Emergency surcharge [if urgent], Subtotal, Advance amount [highlighted], Remaining due after completion, Total). Policy note (cancellation window + 5% refund cut, 24h pandit response). Sticky primary "Send Request".
- Components: StepperHeader, ReviewCard set, MoneyBreakdown, PolicyNote, StickyPrimary.
- States: default; loading (price calc); error (calc fail → retry); variant: urgent surcharge row; custom-puja additional row.
- Data: reads [bookingDraft(all), pandit.charges, pricing rules(advance%, surcharge)]; writes [booking(create, status=Requested), bookingDraft cleared].
- Interactions: edit any card → jump to step; "Send Request" → create booking (status Requested) → Request-sent/waiting; respects OQ6 24h.
- Notes: Advance not charged yet — payment happens after pandit Accepts (lifecycle: Requested → Accepted → Advance Paid).

### Booking — Request sent / waiting
- Route: `/book/request/:bookingId/sent`
- Surface/Tab: Jajman (post-create)
- Purpose: Confirm request submitted; show 24h response countdown.
- Layout: Centered success motif (diya/kalash), "Request sent to {Pandit}", StatusBadge=Requested, CountdownTimer "Responds within 24h", summary chips. Buttons: "View Booking", "Message Pandit". Secondary: "Browse more pandits".
- Components: SuccessMotif, StatusBadge, CountdownTimer, SummaryChips, Buttons.
- States: default; variant: auto-expired (if timer ends → "Request expired" → Alternate suggestions CTA); accepted-while-viewing (live → "Accepted! Pay advance" CTA); rejected (→ reason + suggestions).
- Data: reads [booking(status, expiresAt), pandit]; writes [none directly; mock timer may advance status].
- Interactions: View Booking → Booking detail; Message → Chat thread; on accept → Advance payment; on expire/reject → Alternate suggestions.
- Notes: OQ6 24h auto-expire; OQ-aligned recovery via suggestions.

---

## E. BOOKING — MULTI-PANDIT (OQ4)

### Multi-pandit puja intro
- Route: `/book-team/:pujaId/intro`
- Surface/Tab: Jajman · Multi-pandit booking
- Purpose: Explain team booking and offer the two paths.
- Layout: AppBar (back, puja name). Hero explaining multi-pandit puja (e.g., Maha Mrityunjaya Jaap / Yagna / Marriage), recommended team size. Two large choice cards: (A) "Build your own team — pick each pandit", (B) "Book a lead pandit — they bring the team". CTA on each.
- Components: AppBar, IntroHero, ChooserCard ×2.
- States: default; loading; error.
- Data: reads [puja(isMultiPandit, recommendedTeamSize)]; writes [bookingDraft.mode = teamA|teamB].
- Interactions: Card A → Team builder; Card B → Lead-pandit pick.
- Notes: OQ4 — both A & B supported; chooser required.

### Team builder (Path A — pick each pandit)
- Route: `/book-team/:pujaId/build`
- Surface/Tab: Multi-pandit · Path A
- Purpose: Assemble a team by selecting multiple pandits.
- Layout: AppBar (back, "Build Team — {n}/{recommended}"). Selected-team strip (avatars w/ remove). Search/filter bar + PanditCard list with "Add to team" toggle on each (only same-puja-capable pandits). Running cost preview footer. Sticky "Continue" (enabled at min team size).
- Components: AppBar, SelectedTeamStrip, SearchFilterBar, PanditCard(add toggle), CostPreviewFooter, StickyContinue.
- States: default; loading; empty (not enough pandits for team → suggest Path B or expand radius); error; variant: schedule-conflict warning if dates differ.
- Data: reads [pandits(samePuja, available), pricePerPandit]; writes [bookingDraft.team[]].
- Interactions: add/remove pandit → update strip + cost; card → Pandit detail (returns); Continue → Date/Address/Details (shared steps) → Multi summary.
- Notes: Each pandit may have own charge; aggregated in MoneyBreakdown.

### Lead-pandit pick (Path B)
- Route: `/book-team/:pujaId/lead`
- Surface/Tab: Multi-pandit · Path B
- Purpose: Pick one lead pandit who arranges the team.
- Layout: AppBar (back, "Choose Lead Pandit"). PanditCard list filtered to lead-capable pandits (badge "Leads teams", team-size they manage, package price). Selecting one → expand "Team package details" (what's included, est. team size). Sticky "Continue".
- Components: AppBar, PanditCard(lead badge), TeamPackagePanel, StickyContinue.
- States: default; loading; empty (no lead pandits → fallback to Path A); error.
- Data: reads [pandits(leadCapable, teamPackagePrice)]; writes [bookingDraft.leadPanditId, .mode=teamB].
- Interactions: select lead → package panel; Continue → shared Date/Address/Details → Multi summary.
- Notes: Team composition handled by lead; jajman pays package.

### Multi summary
- Route: `/book-team/:pujaId/summary`
- Surface/Tab: Multi-pandit (both paths)
- Purpose: Review team booking + aggregate money; send request(s).
- Layout: AppBar/Stepper. Team review (Path A: list each pandit + per-head charge; Path B: lead + package). Date/slot, address, attachments review. MoneyBreakdown (sum of pandit charges OR package, travel, surcharge, advance, total). Policy note. Sticky "Send Request(s)".
- Components: TeamReviewCard, MoneyBreakdown, PolicyNote, StickyPrimary.
- States: default; loading; error; variant: partial-acceptance note (Path A — "If some pandits decline, we'll suggest replacements").
- Data: reads [bookingDraft.team/lead, pricing]; writes [booking(create, multi, status=Requested per pandit or one parent)].
- Interactions: edit → jump step; Send → create multi-booking → Request-sent/waiting (shows per-pandit status for Path A).
- Notes: Path A waiting screen tracks each pandit's accept/reject; declines route to per-slot Alternate suggestions.

---

## F. EMERGENCY / URGENT BOOKING (OQ3)

### Urgent same-day booking
- Route: `/urgent`
- Surface/Tab: Jajman (from Home banner / date step)
- Purpose: Fast same-day booking with surcharge during eligibility window.
- Layout: AppBar (back, "Urgent Booking"). Eligibility banner with CountdownTimer ("Same-day booking open until {time}"). Compact wizard: (1) Puja quick-pick, (2) "Available now" pandit list (only those open today, surcharge badge shown), (3) Address quick-pick, (4) condensed Summary with Emergency surcharge line. Sticky "Book Now (Urgent)".
- Components: AppBar, EligibilityBanner+Countdown, QuickPujaPicker, AvailableNowPanditList, AddressQuickPick, MoneyBreakdown(surcharge), StickyPrimary.
- States: default; loading; empty (no pandits available now → "No urgent availability — schedule for tomorrow" → normal flow / suggestions); error; variant: window-closed (countdown ended → disable, show next-day option).
- Data: reads [pandits(availableNow, urgentEnabled), emergencyRules(surcharge, windowEnd), addresses]; writes [booking(urgent=true, surcharge applied, status=Requested)].
- Interactions: pick puja/pandit/address → Summary; Book Now → create urgent booking → Request-sent (shorter response expectation copy); window-closed → reroute.
- Notes: OQ3 — surcharge + time-window eligibility both enforced and visible.

---

## G. LIFECYCLE & PAYMENTS

### Bookings list
- Route: `/bookings`
- Surface/Tab: Jajman · Bookings tab
- Purpose: All bookings grouped by lifecycle stage.
- Layout: AppBar ("My Bookings", filter/search icon). SegmentedTabs: Upcoming · Ongoing · Completed · Cancelled. Body: BookingCard list per tab (pandit, puja, date, StatusBadge, countdown if pending, primary contextual action: Pay advance / View / Rate / Rebook).
- Components: AppBar, SegmentedTabs, BookingCard list, BookingCardSkeleton.
- States: default; loading-skeleton; empty per tab (Upcoming: "No upcoming pujas — Explore"; Completed: "Your completed pujas appear here"; etc.); error (retry).
- Data: reads [bookings(byStatusGroup)]; writes [none directly].
- Interactions: tab switch → filter; card → Booking detail; contextual action → respective flow (Pay → Advance payment; Rate → Rate pandit; Rebook → Rebook flow).
- Notes: Ongoing = Advance Paid/Scheduled/In Progress; Cancelled groups Cancelled/Refund states.

### Booking detail (StatusStepper + actions)
- Route: `/bookings/:bookingId`
- Surface/Tab: Jajman · Bookings
- Purpose: Single source of truth for one booking; drive every lifecycle action.
- Layout: AppBar (back, "Booking #id", overflow: Cancel, Raise dispute, Share). StatusStepper (Requested → Accepted → Advance Paid → Scheduled → In Progress → Completed → Rated; alt branches Rejected/Cancelled/Refund shown contextually). Pandit summary card (chat/call icons per phone-visibility). Puja/date/slot/address blocks. Attachments + notes. MoneyBreakdown (paid advance / remaining due). CountdownTimer when status=Requested (24h). Contextual primary action bar.
- Components: AppBar(overflow), StatusStepper, PanditSummaryCard, InfoBlocks, AttachmentList, MoneyBreakdown, CountdownTimer, ActionBar.
- States: per-status variants — Requested (Cancel + countdown; auto-expire), Accepted (Pay Advance CTA), Advance Paid/Scheduled (Chat, Cancel within window, View address), In Progress (live indicator), Completed (Pay Remaining → then Rate), Rated (read-only + view review), Rejected (reason + Suggestions), Cancelled (refund status), Refund Initiated/Completed; loading-skeleton; error.
- Data: reads [booking(all fields, status, timeline, money, cancellationWindow), pandit]; writes [status transitions via actions, payments, cancellation, dispute, rating].
- Interactions: Pay Advance → Advance payment; Pay Remaining → Remaining payment; Chat → Chat thread; Call → reveal if shared else hidden; Cancel (overflow, only within window) → Cancel flow; Raise dispute → Raise dispute; Rate → Rate pandit; Rejected/expired → Alternate suggestions; address → Map.
- Notes: OQ2 cancellation window shown; OQ6 24h countdown; cancel disabled outside window with explanation.

### Advance payment
- Route: `/bookings/:bookingId/pay/advance`
- Surface/Tab: Jajman · Payment (mock)
- Purpose: Pay advance after pandit accepts.
- Layout: AppBar (close, "Pay Advance"). Amount header (advance ₹, of total ₹). PaymentMethodSelector: UPI (id/intent mock), Card (mock fields), Netbanking (bank list), Wallet (balance + use). Promo/coupon field (stub). Secure-pay note. Sticky "Pay ₹{advance}".
- Components: AppBar(modal), AmountHeader, PaymentMethodSelector, CouponField, SecureNote, StickyPay.
- States: default; method-form variants; processing (spinner overlay, mock 2s); success → Payment success; failure → Payment failure; error (network mock).
- Data: reads [booking.advanceAmount, wallet.balance, paymentMethods]; writes [payment(create), booking.status=Advance Paid→Scheduled, wallet (if used)].
- Interactions: select method → form; Pay → processing → success/failure; close → back to detail (unpaid).
- Notes: All gateways simulated; wallet path decrements mock wallet.

### Payment success
- Route: `/bookings/:bookingId/pay/success`
- Surface/Tab: Jajman · Payment result
- Purpose: Confirm payment + next steps.
- Layout: Centered success motif, "Advance Paid ₹{x}", new StatusBadge=Scheduled, receipt summary, buttons "View Booking", "Download receipt (mock)", "Message Pandit".
- Components: SuccessMotif, ReceiptSummary, Buttons.
- States: default; variant: remaining-payment success copy.
- Data: reads [payment, booking]; writes [none].
- Interactions: View Booking → detail; receipt → mock PDF/toast; Message → chat.
- Notes: Reused for advance & remaining (copy swap).

### Payment failure
- Route: `/bookings/:bookingId/pay/failure`
- Surface/Tab: Jajman · Payment result
- Purpose: Communicate failure + retry.
- Layout: Centered error motif, "Payment failed", reason line (mock: "Bank declined"), buttons "Retry payment", "Change method", "Back to booking".
- Components: ErrorMotif, ReasonLine, Buttons.
- States: default; variants by reason (declined/timeout/cancelled-by-user).
- Data: reads [payment(failed)]; writes [none (booking stays unpaid)].
- Interactions: Retry → Payment screen (same method); Change method → selector; Back → detail.
- Notes: Booking status unchanged on failure.

### Remaining payment
- Route: `/bookings/:bookingId/pay/remaining`
- Surface/Tab: Jajman · Payment (post-completion)
- Purpose: Pay balance after Completed.
- Layout: Same chrome as Advance payment; AmountHeader shows remaining ₹ (total − advance). Method selector. Sticky "Pay ₹{remaining}".
- Components: AppBar(modal), AmountHeader, PaymentMethodSelector, StickyPay.
- States: default; processing; success (→ unlocks Rate prompt); failure; error.
- Data: reads [booking(total, advancePaid, remaining)]; writes [payment, booking.status (Completed→ enable Rated)].
- Interactions: Pay → success → prompt Rate pandit; failure → Payment failure.
- Notes: Appears only when status=Completed and remaining>0.

### Cancel flow + refund breakdown
- Route: `/bookings/:bookingId/cancel`
- Surface/Tab: Jajman · Cancellation
- Purpose: Cancel within window with transparent refund math (OQ2).
- Layout: AppBar (close, "Cancel Booking"). Cancellation-window status (CountdownTimer "Free-window logic / window closes {time}"). Reason selector (radio + "Other" note). RefundBreakdown card: Amount paid, Platform cut −5% (jajman-initiated), Refund to you = paid −5%; note "If Pandit cancels → full refund". Confirm checkbox "I understand the 5% cut". Sticky "Confirm Cancellation".
- Components: AppBar(modal), WindowStatus+Countdown, ReasonSelector, RefundBreakdown, ConfirmCheckbox, StickyDestructive.
- States: default (within window); variant out-of-window (cancel disabled / different terms message); no-advance-paid (no refund math, simple cancel); loading; error.
- Data: reads [booking(paidAmount, cancellationWindow, status)]; writes [booking.status=Cancelled → Refund Initiated, refund record (−5%), wallet/refund mock].
- Interactions: pick reason → enable; Confirm → process → Refund status; close → back.
- Notes: OQ2 exactly — jajman refund = amount −5%, no penalty, window shown; pandit-cancel path (full refund) reflected if reaching this screen via pandit cancellation notice.

### Refund status
- Route: `/bookings/:bookingId/refund`
- Surface/Tab: Jajman · Cancellation result
- Purpose: Track refund progression.
- Layout: AppBar (back, "Refund Status"). Mini-stepper: Refund Initiated → Processing → Refund Completed. Amount + method (to source/wallet), timeline timestamps, reference id. Button "View Booking".
- Components: AppBar, RefundStepper, AmountBlock, Timeline, Button.
- States: Initiated; Processing (mock auto-advances); Completed; error (failed → "Contact support" / raise dispute).
- Data: reads [refund(status, amount, timeline), booking]; writes [none (mock advances status)].
- Interactions: View Booking → detail; failed → Raise dispute.
- Notes: Pandit-cancel → full-refund amount shown (no 5% cut).

### Rate pandit
- Route: `/bookings/:bookingId/rate`
- Surface/Tab: Jajman · Post-completion
- Purpose: Star rating + written review + images.
- Layout: AppBar (close, "Rate your experience"). Pandit header. RatingStars (1–5, large). Quick-tag chips (Punctual, Knowledgeable, Polite, Value). Review text field. Image uploader (review photos). "Post anonymously" toggle (optional). Sticky "Submit Review".
- Components: AppBar(modal), PanditHeader, RatingStars, TagChips, NoteField, AttachmentUploader, ToggleSwitch, StickyPrimary.
- States: default; validation (min star required); submitting; success (→ booking status=Rated, Toast, back to detail); error (retry).
- Data: reads [booking, pandit]; writes [review(create), booking.status=Rated, pandit.rating recompute (mock)].
- Interactions: set stars + (optional) text/photos → Submit → success → My reviews/detail.
- Notes: Both parties rate per PRD; this is the jajman→pandit direction.

---

## H. REPEAT & REBOOK

### Rebook same pandit / same puja
- Route: `/rebook?panditId=&pujaId=`
- Surface/Tab: Jajman (from Home/Favorites/Booking detail)
- Purpose: Fast re-entry into booking with pre-filled context.
- Layout: Confirmation/prefill sheet showing prior pandit + puja; choice chips: "Same puja" / "Different puja with this pandit". Then routes into Booking wizard pre-seeded (puja step skipped if same). For same-puja-different-pandit → Results filtered by puja.
- Components: PrefillSheet, ChoiceChips → Booking wizard.
- States: default; variant: pandit now unavailable (→ Alternate suggestions); error.
- Data: reads [pastBooking(pandit,puja,address)]; writes [bookingDraft prefilled].
- Interactions: choose → wizard (Date step) ; unavailable → suggestions.
- Notes: Two PRD modes (rebook pandit / rebook puja) unified via chooser.

### Set recurring booking
- Route: `/rebook/recurring`
- Surface/Tab: Jajman · Repeat
- Purpose: Configure recurring puja (monthly/quarterly/annual).
- Layout: AppBar (back, "Set Recurring"). Frequency selector (Monthly/Quarterly/Annual), start date, preferred slot, pandit (locked from context or chooser), end condition (count or until-date), preview of next 3 dates. MoneyBreakdown (per-occurrence). Sticky "Create Recurring".
- Components: AppBar, FrequencySelector, DatePicker, SlotPref, OccurrencePreview, MoneyBreakdown, StickyPrimary.
- States: default; loading (availability check); error; variant: some future dates unavailable (warn + suggest adjust).
- Data: reads [pandit.availability, pricing]; writes [recurringBooking(create) → generates first booking Requested].
- Interactions: set freq/dates → preview; Create → schedule series → confirmation → Bookings list.
- Notes: Each occurrence becomes a normal booking entering the standard lifecycle.

---

## I. FAVORITES & ADDRESSES

### Favorites list
- Route: `/favorites`
- Surface/Tab: Jajman · Favorites tab
- Purpose: Saved pandits with quick rebook.
- Layout: AppBar ("Favorites", optional filter). PanditCard list (each w/ heart-filled, "Rebook"/"Book" quick action, last-booked tag).
- Components: AppBar, PanditCard(favorite), QuickActionButton.
- States: default; loading-skeleton; empty ("No favorites yet — tap ♥ on a pandit"); error.
- Data: reads [favorites → pandits]; writes [favorites (remove)].
- Interactions: card → Pandit detail; heart → remove (with undo Toast); Rebook → Rebook flow.
- Notes: —

### Addresses list
- Route: `/profile/addresses`
- Surface/Tab: Jajman · Profile
- Purpose: Manage saved addresses.
- Layout: AppBar (back, "My Addresses"). AddressCard list (type icon, label, full address, default badge, edit/delete). "+ Add new address" button.
- Components: AppBar, AddressCard, AddButton.
- States: default; loading; empty ("Add your first address"); error.
- Data: reads [addresses]; writes [delete, setDefault].
- Interactions: card overflow → Edit/Delete/Set default; Add → Add/edit address.
- Notes: Default address syncs with Home AddressSelector.

### Add / edit address
- Route: `/profile/addresses/new` · `/profile/addresses/:id/edit`
- Surface/Tab: Jajman · Profile
- Purpose: Create/update an address with map pin + notes.
- Layout: AppBar (back, "Add/Edit Address", Save). Address-type selector (Home / Parents Home / Relative Home / Temple / Custom → custom label field). Mock MapView with draggable pin + "Use current location". Fields: full address (autofill from pin mock), landmark, notes (parking/contact). "Set as default" toggle. Sticky "Save".
- Components: AppBar, TypeSelector, MapPinPicker, TextFields, NoteField, ToggleSwitch, StickyPrimary.
- States: default(new)/prefilled(edit); validation (address required); saving; error.
- Data: reads [address(edit)]; writes [address(create/update, coords, type, notes, isDefault)].
- Interactions: drag pin/GPS → fill address; Save → back to list (Toast); type=Custom → reveal label.
- Notes: Coords power distance/travel everywhere (PRD address mgmt).

---

## J. COMMUNICATION & NOTIFICATIONS

### Chat list
- Route: `/chat`
- Surface/Tab: Jajman (app bar entry, global)
- Purpose: All booking-linked conversations.
- Layout: AppBar (back, "Messages", search). Thread list (pandit avatar, name, last message, time, unread badge, linked booking tag).
- Components: AppBar, ThreadListItem.
- States: default; loading-skeleton; empty ("Chats appear after you send a booking request"); error.
- Data: reads [chatThreads(byUser)]; writes [none].
- Interactions: thread → Chat thread; search → filter.
- Notes: Chat available only after booking request (PRD).

### Chat thread
- Route: `/chat/:threadId`
- Surface/Tab: Jajman · Chat
- Purpose: Converse with pandit; control phone visibility; send attachments.
- Layout: AppBar (back, pandit name + online/last-seen mock, call icon [enabled only if phone shared], overflow: "Phone visibility", "View booking"). Linked-booking banner (status + tap → detail). Message list (bubbles, timestamps, attachment thumbs, system messages e.g. "Pandit accepted"). Composer: text, attach (image/doc), send. Phone-visibility control surfaced as overflow + inline prompt.
- Components: AppBar(call,overflow), BookingBanner, MessageBubble, SystemMessage, Composer, AttachmentPicker.
- States: default; loading (history skeleton); empty ("Say namaste 🙏"); error (send-fail → retry tick); variant: phone-hidden (call disabled, "Number hidden — chat only").
- Data: reads [thread.messages, booking(linked), user.phoneVisibility]; writes [message(send), attachments, user.phoneVisibility].
- Interactions: send → append (optimistic); attach → upload mock; call → dial reveal if shared; phone-visibility → toggle sheet; booking banner → detail.
- Notes: Phone-visibility control per PRD/communication; hidden ⇒ chat-only enforced.

### Notifications center
- Route: `/notifications`
- Surface/Tab: Jajman (bell, global)
- Purpose: All system/booking notifications.
- Layout: AppBar (back, "Notifications", "Mark all read"). Grouped list (Today/Earlier): icon by type (booking accepted, payment due, request expiring [countdown], refund, review reminder, promo). Tap → deep link.
- Components: AppBar, NotificationItem(grouped), Badge.
- States: default; loading-skeleton; empty ("You're all caught up"); error.
- Data: reads [notifications]; writes [markRead, markAllRead].
- Interactions: item → deep link (booking/payment/dispute/etc.); mark read; mark all read.
- Notes: Mirrors PRD notification types; WhatsApp/push simulated as in-app entries.

---

## K. REFERRAL

### Referral program
- Route: `/referral`
- Surface/Tab: Jajman · Profile/menu
- Purpose: Refer jajmans/pandits; share code; view rewards.
- Layout: AppBar (back, "Refer & Earn"). Hero (reward promise). Tabs/cards: "Refer a Jajman" / "Refer a Pandit". Personal code box (copy) + Share buttons (WhatsApp/SMS/Generic — mock). "How it works" steps. Rewards section (wallet credits/cashback/coupons — future-flagged "Coming soon"). Referral history list (invited, status, reward).
- Components: AppBar, RewardHero, SegmentedCards, CodeBox(copy), ShareButtons, StepsList, RewardsPanel, ReferralHistoryList.
- States: default; loading; empty history ("No referrals yet"); error.
- Data: reads [referral.code, referral.history, rewards]; writes [share events (mock), copy].
- Interactions: copy code → Toast; share → mock share sheet; tab → switch jajman/pandit copy; history item → status detail.
- Notes: Rewards future per PRD — visually present but flagged.

---

## L. DISPUTES

### Disputes list
- Route: `/disputes`
- Surface/Tab: Jajman · Profile/menu
- Purpose: Track raised disputes.
- Layout: AppBar (back, "Disputes"). List (booking ref, reason, StatusBadge: Open/Under Review/Resolved, date). "Raise new dispute" requires booking context (from booking detail).
- Components: AppBar, DisputeListItem.
- States: default; loading; empty ("No disputes — we hope it stays that way"); error.
- Data: reads [disputes(byUser)]; writes [none].
- Interactions: item → Dispute detail.
- Notes: Raise entry primarily via Booking detail overflow.

### Raise dispute
- Route: `/bookings/:bookingId/dispute/new`
- Surface/Tab: Jajman · Disputes
- Purpose: File a dispute with reason + evidence.
- Layout: AppBar (close, "Raise Dispute"). Linked-booking summary. Reason selector (Jajman reasons: Pandit didn't arrive, Puja incomplete, Quality issue, Payment issue, Other → note). Description field. Evidence uploader (images/docs). Desired-resolution hint (refund/redo). Sticky "Submit Dispute".
- Components: AppBar(modal), BookingSummary, ReasonSelector, NoteField, AttachmentUploader, StickyPrimary.
- States: default; validation (reason+desc required); submitting; success (→ Dispute detail, status Open); error.
- Data: reads [booking]; writes [dispute(create, status=Open, evidence)].
- Interactions: pick reason + evidence → Submit → Dispute detail.
- Notes: PRD jajman reasons exactly; flows to admin review.

### Dispute detail
- Route: `/disputes/:disputeId`
- Surface/Tab: Jajman · Disputes
- Purpose: Track status, admin review, resolution.
- Layout: AppBar (back, "Dispute #id"). Status stepper (Created → Evidence → Under Admin Review → Resolved). Linked booking card. Your evidence gallery. Activity/comments thread (admin messages, requests for more info). Resolution panel (outcome: refund/redo/declined + settlement note) when resolved. Action: "Add more evidence" (while open).
- Components: AppBar, DisputeStepper, BookingCard, EvidenceGallery, ActivityThread, ResolutionPanel, AddEvidenceButton.
- States: Open; Under Review; Resolved (outcome variants); loading; error.
- Data: reads [dispute(status, evidence, activity, resolution), booking]; writes [add evidence/comment].
- Interactions: add evidence → uploader; comment → append; resolved → view settlement; booking card → detail.
- Notes: Resolution may trigger refund (links to Refund status).

---

## M. PROFILE, SETTINGS & ACCOUNT

### Profile view
- Route: `/profile`
- Surface/Tab: Jajman · Profile tab
- Purpose: Account hub + navigation to all account screens + mode switch.
- Layout: AppBar ("Profile", settings gear). Header (photo, name, mobile, language pref). Mode switcher card ("You're in Jajman mode" → "Switch to Pandit" / "Become a Pandit" if not a pandit). Menu list: My Bookings, Favorites, Addresses, Payment history, My reviews, Referral, Disputes, Notification preferences, Language, Settings, Help/Support, Logout.
- Components: AppBar, ProfileHeader, ModeSwitcherCard, MenuList.
- States: default; loading-skeleton; error; variants: dual-role (Switch to Pandit) vs jajman-only (Become a Pandit).
- Data: reads [currentUser, roles, language]; writes [none here].
- Interactions: each menu row → respective screen; mode switch → switch active role (re-renders Pandit shell) or Become-a-Pandit; gear → Settings; edit (tap header) → Edit profile.
- Notes: Single-account model — mode switch lives here (per nav spec).

### Edit profile
- Route: `/profile/edit`
- Surface/Tab: Jajman · Profile
- Purpose: Update common profile fields.
- Layout: AppBar (back, "Edit Profile", Save). Photo picker (avatar + change). Fields: full name, mobile (verify badge), email (optional), language pref (EN/HI/SA), about (optional). Sticky "Save".
- Components: AppBar, AvatarPicker, TextFields, LanguageSelect, StickyPrimary.
- States: default; validation; saving; error.
- Data: reads [currentUser]; writes [user(name, photo, email, language)].
- Interactions: change photo → mock upload; Save → Toast → back; change mobile → OTP re-verify stub.
- Notes: Language change applies i18n stub globally.

### Notification preferences
- Route: `/profile/notifications`
- Surface/Tab: Jajman · Profile
- Purpose: Manage channel + type preferences.
- Layout: AppBar (back, "Notification Preferences"). Channel toggles (Mobile/SMS, WhatsApp; Email/Push "coming soon" disabled). Type toggles (Booking updates, Payment reminders, Promotions, Referral, Reviews). Save auto/inline.
- Components: AppBar, ToggleRows(grouped).
- States: default; loading; saving (inline); error.
- Data: reads [user.notificationPrefs]; writes [user.notificationPrefs].
- Interactions: toggle → persist (optimistic).
- Notes: Preference-based notifications per PRD; future channels disabled.

### Language preference
- Route: `/profile/language`
- Surface/Tab: Jajman · Profile
- Purpose: Choose app language.
- Layout: AppBar (back, "Language"). Radio list: English, हिन्दी (Hindi), संस्कृत (Sanskrit) — Devanagari font fallback. Note "Hindi/Sanskrit partially translated (preview)".
- Components: AppBar, RadioList(Devanagari).
- States: default (current); applying; error.
- Data: reads [user.language]; writes [user.language → i18n].
- Interactions: select → apply globally (re-render strings) + back.
- Notes: i18n stub; Devanagari-capable font ensured.

### Payment history
- Route: `/profile/payments`
- Surface/Tab: Jajman · Profile
- Purpose: All payments & refunds.
- Layout: AppBar (back, "Payment History", filter). List grouped by month: each row (booking ref, puja, amount, type [Advance/Remaining/Refund], status, date). Tap → receipt detail.
- Components: AppBar, FilterChips, PaymentRow(grouped).
- States: default; loading-skeleton; empty ("No payments yet"); error.
- Data: reads [payments, refunds (byUser)]; writes [none].
- Interactions: row → receipt detail (mock); filter → type/date.
- Notes: Refunds shown alongside payments.

### My reviews
- Route: `/profile/reviews`
- Surface/Tab: Jajman · Profile
- Purpose: Reviews the jajman has written.
- Layout: AppBar (back, "My Reviews"). ReviewCard list (pandit, puja, stars, text, images, date, edit/delete within window).
- Components: AppBar, ReviewCard(editable).
- States: default; loading; empty ("You haven't reviewed any puja yet"); error.
- Data: reads [reviews(byAuthor=user)]; writes [edit/delete review].
- Interactions: edit → Rate screen (prefilled); delete → confirm; card → Pandit detail.
- Notes: —

### Settings
- Route: `/settings`
- Surface/Tab: Jajman · Profile (gear)
- Purpose: App-level controls.
- Layout: AppBar (back, "Settings"). Sections: Appearance (Theme: System/Light/Dark toggle), Privacy (Phone visibility: Share/Hide default), Security (Change password stub, biometric stub), About (version, terms, privacy), Account (Logout, Delete account stub).
- Components: AppBar, ThemeSelector, ToggleRows, LinkRows, DestructiveRow.
- States: default; saving (inline); error; logout-confirm dialog.
- Data: reads [settings(theme, phoneVisibility), appInfo]; writes [theme token, phoneVisibility, session(logout)].
- Interactions: theme → switch tokens live; phone visibility → default for chats; Logout → confirm → auth screen; Delete → confirm stub.
- Notes: Dark mode + phone visibility per locked decisions; logout clears mock session.

### Become a Pandit (entry)
- Route: `/become-pandit`
- Surface/Tab: Jajman · Profile (mode card)
- Purpose: Convert jajman-only account toward pandit onboarding.
- Layout: AppBar (back, "Become a Pandit"). Value-prop hero (earn, set charges, reach devotees). Steps preview (profile → pujas → availability → admin approval). Eligibility note. CTA "Start Pandit Onboarding".
- Components: AppBar, ValueHero, StepsPreview, PrimaryCTA.
- States: default; variant: already-pandit (→ "Switch to Pandit mode" instead); pending-approval (→ "Your pandit profile is awaiting admin approval" status).
- Data: reads [user.roles, panditOnboardingStatus]; writes [initiate pandit onboarding → handoff to Pandit surface].
- Interactions: Start → Pandit onboarding (Pandit surface); already-pandit → switch mode.
- Notes: OQ1 — onboarding ends in "Pending Admin Approval"; this is the jajman-side entry/handoff into that flow.

---

### Cross-cutting state coverage (applies to all lists/detail/forms)
- **Loading**: skeleton shimmer matching final layout (cards, rails, steppers).
- **Empty**: devotional line-motif illustration + one-line explainer + primary CTA, per screen above.
- **Error**: inline ErrorState with cause line + "Retry"; non-blocking per-section where rails are independent (Home, Pandit detail).
- **Auth/session**: any 401-equivalent (mock) → redirect to login (auth screens are out-of-scope for this surface but referenced by Logout/OTP stubs).
- **Theme/i18n**: every screen reads design tokens (light/dark) and i18n strings (EN/HI/SA); Devanagari fallback font applied where HI/SA active.

**Screen/state count: 44** (Home, Address selector, Search, Filters, Results, Sort, Map, Category browse, Puja browse, Alternate suggestions, Pandit detail, All reviews, Booking puja, Booking date, Booking address, Booking details, Booking summary, Request sent, Multi intro, Team builder, Lead pick, Multi summary, Urgent booking, Bookings list, Booking detail, Advance payment, Payment success, Payment failure, Remaining payment, Cancel flow, Refund status, Rate pandit, Rebook, Recurring, Favorites, Addresses list, Add/edit address, Chat list, Chat thread, Notifications, Referral, Disputes list, Raise dispute, Dispute detail, Profile, Edit profile, Notification prefs, Language, Payment history, My reviews, Settings, Become a Pandit) — covering all required flows plus OQ1–OQ6 tie-ins.

---

## SCREEN INVENTORY — PANDIT

> **Surface conventions (apply to all Pandit screens):** Mobile-only, rendered inside the centered phone-frame shell (~390–420px). Bottom tab bar (`PanditTabBar`): **Dashboard · Requests · Calendar · Earnings · Profile**. App bar (`AppBar`) carries screen title + contextual actions; the global app bar also exposes a **chat** icon (`MessageCircle`, with unread badge) and **notifications** bell (`Bell`, with unread badge). Theme: Warm premium hybrid (saffron/amber primary, deep maroon secondary, gold accent, cream/sand surfaces; light + dark via tokens). All copy English-first with i18n stub (`t()` keys; Devanagari fallback font for Hindi/Sanskrit). Skeleton/empty/error states use shared `Skeleton`, `EmptyState`, `ErrorState` components. "Pending Admin Approval" gating (OQ1): a pandit who has submitted but is not yet approved sees a **gate banner** on Dashboard and locked Requests/Calendar/Earnings until approved.

---

### A. ONBOARDING — BECOMING A PANDIT

---

### A1. Become-a-Pandit Intro
- Route: `/pandit/onboarding`
- Surface/Tab: Pandit onboarding (entered from Jajman Profile → "Become a Pandit", or first-run if account flagged pandit-eligible). No bottom tab bar.
- Purpose: Sell the value of becoming a pandit and start the multi-step onboarding wizard.
- Layout: App bar (back arrow only, title "Become a Pandit"); body top→bottom: hero with soft saffron→gold gradient + light kalash/diya line motif, headline "Offer your seva to families near you", 3 value bullets (Get booking requests · Set your own charges · Withdraw earnings anytime), a horizontal "How it works" stepper preview (Profile → Pujas → Availability → Approval), a short trust note ("Admin verifies every pandit"); primary CTA "Get Started" pinned bottom, secondary text link "Maybe later" (returns to prior surface).
- Components: `AppBar`, `HeroGradient`, `MotifLine`, `ValueBullet`, `StepperPreview`, `PrimaryButton`, `TextLink`.
- States: default; loading-skeleton (hero + bullets shimmer while checking existing onboarding draft); variant: **resume** banner if a draft exists ("Continue where you left off — Step 2 of 5"); error (couldn't load draft → ErrorState with Retry).
- Data: reads [`user.id`, `user.name`, `panditOnboardingDraft.step?`]; writes [none here].
- Interactions: "Get Started" → `/pandit/onboarding/profile` (creates/loads `panditOnboardingDraft`); "Continue where you left off" → resumes draft's saved step route; "Maybe later"/back → previous surface (Jajman Profile).
- Notes: Single-account model — does not log the user out of Jajman. OQ1 tie-in: copy sets expectation that submission goes to admin approval, not instant activation.

---

### A2. Onboarding — Profile Setup
- Route: `/pandit/onboarding/profile`
- Surface/Tab: Pandit onboarding wizard (Step 1 of 5). No bottom tab bar; top progress indicator.
- Purpose: Capture pandit public profile basics.
- Layout: App bar (back, title "Your Profile", "Step 1 of 5" + segmented progress bar); body: avatar uploader (camera/gallery, circular crop) with default monogram; fields — Display name (prefilled from account, editable), About/bio (multiline, char counter ~500), Years of experience (numeric stepper), Languages spoken (multi-select chips: Hindi, Sanskrit, English, +regional), Specializations (multi-select chips: Katha, Jaap, Marriage, Griha Pravesh, Festival Puja, Shradh, Temple Rituals, Custom), City (typeahead) + auto-detect location button; sticky footer "Save & Continue" + "Save draft" link.
- Components: `AppBar`, `ProgressSegments`, `AvatarUploader`, `TextField`, `Textarea` (counter), `Stepper`, `ChipMultiSelect`, `CityTypeahead`, `PrimaryButton`, `TextLink`.
- States: default; loading-skeleton (form fields shimmer); empty (fresh draft, defaults shown); validation errors (inline: name required, about min length, at least 1 language, at least 1 specialization); error (photo upload failed → inline retry); variant: editing an existing draft (fields prefilled).
- Data: reads [`panditOnboardingDraft.profile`, `user.name`, `masterData.languages`, `masterData.specializations`]; writes [`panditOnboardingDraft.profile.{photo,name,about,experienceYears,languages,specializations,city,geo}`].
- Interactions: avatar tap → image source sheet (mock picker) → crop → set photo; "Save & Continue" (validate) → `/pandit/onboarding/service`; "Save draft" → persists & returns to A1 resume; back → A1.
- Notes: City + geo feed distance calculations later. Devanagari font fallback verified on name/about for Hindi/Sanskrit input.

---

### A3. Onboarding — Service Configuration
- Route: `/pandit/onboarding/service`
- Surface/Tab: Onboarding wizard (Step 2 of 5).
- Purpose: Configure travel/service area and travel charges.
- Layout: App bar (back, "Service Area", "Step 2 of 5" + progress); body: service-radius slider (km, live value label) with a simple radius preview ring over a static mock map tile; Travel preference radio group (Within radius only / Outside radius / Anywhere on request) each with helper text; conditional Travel charges block — base travel fee + per-km rate (toggle "Charge for travel"), note "Final travel charge confirmed at booking acceptance" (OQ-aligned with accept flow); sticky footer "Save & Continue" + "Back".
- Components: `AppBar`, `ProgressSegments`, `RadiusSlider`, `MapPreviewStatic`, `RadioGroup`, `Toggle`, `CurrencyField`, `HelperText`, `PrimaryButton`.
- States: default; loading-skeleton; variant: "Anywhere on request" hides radius enforcement but keeps slider as default suggestion; validation (radius > 0; if charge-for-travel on, fee/rate required); error (geo unavailable → fallback to manual city radius, banner).
- Data: reads [`panditOnboardingDraft.service`]; writes [`panditOnboardingDraft.service.{radiusKm, travelPreference, chargeForTravel, baseTravelFee, perKmRate}`].
- Interactions: slider drag → updates radius ring; radio select → toggles charge block visibility; "Save & Continue" → `/pandit/onboarding/pujas`; back → A2.
- Notes: Travel charges here are defaults; the actual amount is added per booking at Accept (see C4). Mock map only — no real GPS routing.

---

### A4. Onboarding — Add Supported Pujas (from Master)
- Route: `/pandit/onboarding/pujas`
- Surface/Tab: Onboarding wizard (Step 3 of 5).
- Purpose: Select pujas from the admin master catalog and configure charge + duration per puja.
- Layout: App bar (back, "Your Pujas", "Step 3 of 5"); body: search field + category filter chips (Katha/Jaap/Marriage/Griha Pravesh/Festival/Shradh/Temple Rituals); master puja list grouped by category, each row = puja name + suggested duration + suggested min–max amount + add toggle; "Selected (N)" summary chip; CTA row: "+ Create custom puja" (→ A5) and sticky footer "Save & Continue" (enabled when ≥1 selected) + "Skip for now" link.
- Components: `AppBar`, `ProgressSegments`, `SearchField`, `FilterChips`, `PujaMasterRow` (with `Toggle`), `SelectionSummaryBar`, `PrimaryButton`, `TextLink`.
- States: default; loading-skeleton (rows shimmer while master loads); empty (no master pujas for a filter → EmptyState "No pujas in this category"); error (master fetch failed → ErrorState retry); variant: search no-results.
- Data: reads [`masterPujas[].{id,name,category,suggestedDurationMin,minAmount,maxAmount}`, `panditOnboardingDraft.supportedPujas`]; writes [`panditOnboardingDraft.supportedPujas[]` add/remove stub].
- Interactions: tap puja row toggle → opens **per-puja config sheet** (A4a) to set charge + duration before confirming add; search/filter → narrows list; "+ Create custom puja" → A5; "Save & Continue" → `/pandit/onboarding/documents`; "Skip for now" → A6 (availability) with empty puja set (allowed but flagged).
- Notes: Admin owns the master (min/max bounds); pandit's charge must fall within/near master range with a soft warning if outside.

---

### A4a. Per-Puja Charge & Duration Sheet
- Route: `/pandit/onboarding/pujas` (bottom sheet overlay; no separate URL — modal state)
- Surface/Tab: Onboarding wizard (within Step 3). Reused later in Profile (see N2).
- Purpose: Configure charge and (optionally) override suggested duration for one selected puja.
- Layout: Bottom sheet: puja name + category header, "Suggested: {dur}, ₹{min}–₹{max}"; Charge field (currency) with min/max guardrail hint; Duration override stepper (defaults to suggested); optional per-puja notes; "Add this puja" CTA + "Cancel".
- Components: `BottomSheet`, `CurrencyField`, `RangeHint`, `DurationStepper`, `Textarea`, `PrimaryButton`, `GhostButton`.
- States: default; validation (charge required; soft warning if charge < min or > max: "Below suggested range — admin may review"); variant: editing an already-added puja (prefilled, CTA "Save changes").
- Data: reads [`masterPujas[id]`]; writes [`panditOnboardingDraft.supportedPujas[].{pujaId, charge, durationMin, notes}`].
- Interactions: "Add this puja" → confirms selection, closes sheet, row shows configured charge; "Cancel" → discards.
- Notes: Out-of-range charge is allowed (early stage) but flagged for admin awareness.

---

### A5. Onboarding — Create Custom Puja
- Route: `/pandit/onboarding/pujas/custom`
- Surface/Tab: Onboarding wizard (within Step 3; full screen).
- Purpose: Let a pandit define a puja not present in the admin master, with additional charges clearly flagged (OQ5).
- Layout: App bar (back, "Create Custom Puja"); body: prominent **"Custom puja — additional charges apply"** badge/banner; fields — Puja name, Category (select from master categories or "Other"), Description, Duration, Charge, Additional charge line items (repeatable: label + amount, e.g. "Extra samagri ₹500"); a computed "Total quoted" readout; footer "Add Custom Puja" + "Cancel".
- Components: `AppBar`, `CustomBadge`, `TextField`, `CategorySelect`, `Textarea`, `DurationStepper`, `CurrencyField`, `RepeatableLineItems`, `TotalReadout`, `PrimaryButton`.
- States: default; validation (name + charge required; at least the base charge); variant: editing existing custom puja; error (none network — local validation only).
- Data: reads [`masterCategories`]; writes [`panditOnboardingDraft.supportedPujas[]` with `isCustom:true`, `additionalCharges[]`].
- Interactions: "+ Add charge line" → new line-item row; "Add Custom Puja" → returns to A4 with the custom puja in Selected list (visually tagged "Custom"); back/Cancel → A4.
- Notes: OQ5 — custom pujas are always visibly flagged (badge persists everywhere this puja appears: requests, bookings, profile). Additional charges surface to Jajman at booking.

---

### A6. Onboarding — Optional Document Upload
- Route: `/pandit/onboarding/documents`
- Surface/Tab: Onboarding wizard (Step 4 of 5).
- Purpose: Optionally attach credentials/ID; explicitly NOT the approval gate (OQ1).
- Layout: App bar (back, "Documents (optional)", "Step 4 of 5"); body: explainer "Optional — speeds up admin review but isn't required"; upload tiles (ID proof, Certificate/credential, Other) each accepting image/PDF, with thumbnail + remove; uploaded list; sticky footer "Save & Continue" + "Skip" (both proceed).
- Components: `AppBar`, `ProgressSegments`, `InfoBanner`, `UploadTile`, `FileThumb`, `PrimaryButton`, `TextLink`.
- States: default; empty (no docs — fully valid to proceed); uploading (per-tile progress); error (upload failed → per-file retry/remove); variant: oversized/unsupported file (inline error).
- Data: reads [`panditOnboardingDraft.documents`]; writes [`panditOnboardingDraft.documents[]` add/remove (mock URLs)].
- Interactions: tile tap → mock file picker → adds thumb; remove → deletes; "Save & Continue"/"Skip" → `/pandit/onboarding/availability`; back → A4.
- Notes: OQ1 — documents are optional; approval is admin decision regardless of docs. Uses cloud-storage-stub (mock URLs).

---

### A7. Onboarding — Availability Setup
- Route: `/pandit/onboarding/availability`
- Surface/Tab: Onboarding wizard (Step 5 of 5).
- Purpose: Define initial availability — manual slots and/or a recurring weekly schedule.
- Layout: App bar (back, "Availability", "Step 5 of 5"); body: two tabs — **Recurring** (weekday rows Mon–Sun, each with toggle + time range chips; "every Monday 09:00–17:00" pattern) and **Specific dates** (list of manual slots: date + start–end, "+ Add slot"); helper note "You can change this anytime later"; sticky footer "Review & Submit" + "Save draft".
- Components: `AppBar`, `ProgressSegments`, `TabSwitch`, `WeekdayScheduleRow`, `TimeRangeChip`, `SlotListItem`, `AddSlotSheet`, `PrimaryButton`.
- States: default; empty (no availability set — allowed but warning "Add at least one slot so families can book"); loading-skeleton; validation (end > start; no overlapping slots → inline error); variant: recurring vs specific.
- Data: reads [`panditOnboardingDraft.availability`]; writes [`panditOnboardingDraft.availability.{recurring[], slots[]}`].
- Interactions: weekday toggle → enables time range; "+ Add slot" → AddSlotSheet (date + time picker) → appends; delete slot → removes; "Review & Submit" → A8 submission; back → A6.
- Notes: Shared availability model reused by Manage Availability (F2). Overlap detection prevents double-listing.

---

### A8. Onboarding — Submit / Pending Admin Approval
- Route: `/pandit/onboarding/submit`  →  on submit transitions to `/pandit/onboarding/pending`
- Surface/Tab: Onboarding wizard final step → approval status screen.
- Purpose: Review summary, submit for admin approval, then show the "Pending Admin Approval" state (OQ1).
- Layout (Review, `/submit`): App bar (back, "Review & Submit"); body: collapsible summary cards — Profile, Service area, Pujas (count + custom-flag note), Documents (count), Availability (count); each card has "Edit" deep-link to its step; consent checkbox "Information is accurate"; CTA "Submit for Approval". **(Pending, `/pending`):** centered status illustration (hourglass + soft motif), big "Pending Admin Approval", subtext "Admin usually reviews within 24 hours" + submitted timestamp; read-only summary of what was submitted; CTA "Go to Dashboard" (Dashboard shows gated state); secondary "Edit submission" (allowed while pending).
- Components: `AppBar`, `SummaryCard` (collapsible, with Edit), `Checkbox`, `PrimaryButton`, `StatusIllustration`, `Timestamp`, `ReadOnlySummary`.
- States: review default; submitting (button spinner); pending default; loading-skeleton (pending fetch); error (submit failed → ErrorState retry); variant: **edit-while-pending** (re-opens wizard, resubmission keeps pending).
- Data: reads [full `panditOnboardingDraft`]; writes [creates `panditProfile` with `status:'pending'`, `submittedAt`; clears draft; mutates `user.roles += 'pandit'`].
- Interactions: card "Edit" → corresponding step route; "Submit for Approval" → sets pending, → `/pending`; "Go to Dashboard" → `/pandit` (gated); "Edit submission" → reopen wizard at A2.
- Notes: OQ1 core screen. The matching admin action (approve/reject queue) lives in the Admin surface; this screen only reflects the resulting status.

---

### A9. Onboarding — Approval Result (Approved / Rejected)
- Route: `/pandit/onboarding/result` (rendered based on `panditProfile.status`; also surfaced as a notification + Dashboard banner)
- Surface/Tab: Post-submission status screen (reached from notification tap or auto-redirect when status changes in mock store).
- Purpose: Communicate admin decision and route the pandit forward.
- Layout: App bar ("Application Status"); **Approved variant:** success illustration (gold check + diya motif), "You're approved!", subtext "You can now receive bookings", CTA "Open Pandit Dashboard"; optional "Complete your profile" nudges if anything thin. **Rejected variant:** muted illustration, "Application needs changes", a **reason card** (admin-provided reason text) + checklist of items to fix, CTA "Edit & Resubmit", secondary "Contact support".
- Components: `AppBar`, `StatusIllustration`, `ReasonCard`, `ChecklistHints`, `PrimaryButton`, `GhostButton`.
- States: approved; rejected (with reason); loading-skeleton (status check); error (status fetch fail → retry); variant: rejected with multiple reason tags.
- Data: reads [`panditProfile.status`, `panditProfile.rejectionReason`, `panditProfile.rejectionItems[]`]; writes [on "Edit & Resubmit" → reopens wizard, resets status to draft/pending on resubmit].
- Interactions: "Open Pandit Dashboard" → `/pandit`; "Edit & Resubmit" → `/pandit/onboarding/profile` (A2) preloaded; "Contact support" → Disputes/Support stub or notifications.
- Notes: OQ1 — rejection always carries a reason. Approved unlocks gated tabs (Requests/Calendar/Earnings).

---

### B. CORE

---

### B1. Pandit Dashboard
- Route: `/pandit`
- Surface/Tab: Pandit · **Dashboard** tab.
- Purpose: At-a-glance command center — today's work, pending requests, money, ratings, availability toggle.
- Layout: App bar (greeting "Namaste, {name}" + avatar, chat icon, notifications bell); body scroll: **Approval gate banner** (only if status≠approved — pending/rejected CTA); **Availability quick-toggle** card ("Accepting bookings" master switch + "Today: 2 slots open"); **Today's bookings** horizontal cards (time, puja, jajman, location); **Pending requests** card (count + 24h-soonest-expiry mini, "View all" → Requests); **Earnings snapshot** (available balance, this-month earnings, sparkline); **Wallet** mini (available/pending); **Ratings** mini (avg stars + total reviews); **Calendar peek** (next 3 days strip); quick actions row (Manage availability, Add puja). Bottom nav.
- Components: `AppBar`, `GateBanner`, `AvailabilityToggleCard`, `BookingCardH`, `PendingRequestsCard`, `EarningsSnapshotCard` (`Sparkline`), `WalletMiniCard`, `RatingMiniCard`, `CalendarStrip`, `QuickActionRow`, `PanditTabBar`.
- States: default; loading-skeleton (each card shimmer); empty (new approved pandit: "No bookings yet — make sure your availability is set"); error (dashboard aggregate fetch fail → ErrorState retry, with cached sections if available); variant: **gated** (pending/rejected — money & requests cards locked with overlay + "Awaiting approval").
- Data: reads [`bookings` filtered today/pending, `wallet.{available,pending}`, `earnings.month`, `ratings.{avg,count}`, `availability.acceptingToggle`, `requests.pendingCount`, `panditProfile.status`]; writes [`availability.acceptingToggle` (master accept on/off)].
- Interactions: availability master toggle → mutates accepting flag (off shows confirm "Pause new bookings?"); "View all" pending → `/pandit/requests`; today's booking card → `/pandit/bookings/:id`; earnings card → `/pandit/earnings`; wallet mini → `/pandit/wallet`; ratings mini → `/pandit/ratings`; calendar peek → `/pandit/calendar`; quick actions → respective screens; gate banner → A8/A9.
- Notes: OQ1 gating enforced here. Master availability toggle ≠ deleting slots; it's a global pause.

---

### B2. Requests List
- Route: `/pandit/requests`
- Surface/Tab: Pandit · **Requests** tab.
- Purpose: All incoming booking requests awaiting accept/reject, each with a 24h approval countdown (OQ6).
- Layout: App bar ("Requests" + filter icon); optional segmented filter (All / Single-pandit / Multi-pandit / Urgent); list of `RequestCard`: jajman avatar+name, puja name (+Custom/Urgent badges), requested date+slot, city + distance, advance/amount preview, and a **24h countdown chip** (turns amber <6h, red <1h); pull-to-refresh. Bottom nav.
- Components: `AppBar`, `SegmentedFilter`, `RequestCard`, `CountdownChip`, `Badge` (Urgent/Custom/Multi), `PullToRefresh`, `PanditTabBar`.
- States: default; loading-skeleton (request cards); empty ("No pending requests"); error (fetch fail → retry); variant: **urgent/emergency** request highlighted with surcharge tag (OQ3); **expiring soon** sort-to-top; **expired** request auto-removed (toast "A request expired").
- Data: reads [`requests[].{id,jajman,puja,isCustom,isUrgent,assignmentType,date,slot,city,distanceKm,amount,advance,expiresAt}`]; writes [auto-expire mutation when `now > expiresAt` → status `Expired`].
- Interactions: tap card → `/pandit/requests/:id` (B3); filter → narrows; countdown reaching 0 → card flips to "Expired" then removed; pull-to-refresh → re-evaluates expiries.
- Notes: OQ6 — 24h timeout drives countdown + auto-expire. OQ3 urgent badge. OQ4 multi-pandit assignment type shown (lead vs team-member request differ in detail).

---

### B3. Request Detail
- Route: `/pandit/requests/:id`
- Surface/Tab: Pandit · Requests (detail).
- Purpose: Full request context to decide accept/reject.
- Layout: App bar (back, "Request" + 24h countdown in subtitle); body: **Jajman card** (name, rating as jajman, phone visibility status — call button if shared, else "Chat only"); **Puja card** (name, category, Custom/Urgent badges, duration, base charge, any additional charges if custom); **Schedule card** (date, slot, urgent same-day note + surcharge line if urgent); **Address card** (address label, full address, distance from you, mini static map, navigate stub); **Attachments** (venue photos thumbnails, documents like invitation card); **Notes** (parking/contact/special requests); **Multi-pandit context** (if assignmentType: shows whether this is "lead pandit" request or "team-member" request, and team composition if known); sticky footer: **Accept** (primary) + **Reject** (ghost) + "Chat" link.
- Components: `AppBar`, `CountdownChip`, `JajmanCard`, `PujaCard`, `ScheduleCard`, `AddressCard` (`MapPreviewStatic`), `AttachmentGallery`, `NotesBlock`, `MultiPanditContext`, `PrimaryButton`, `GhostButton`.
- States: default; loading-skeleton; error (fetch fail → retry); variant: **urgent** (surcharge eligibility window note, OQ3), **custom puja** (additional charges flagged, OQ5), **multi-pandit lead** vs **team-member** (OQ4), **expired** (footer disabled, "This request expired"), **out-of-radius** (banner "Outside your service radius" if travel pref limits it).
- Data: reads [`request.*`, `jajman.{name,rating,phoneShared,phone}`, `attachments[]`, `notes`, `assignmentType`, `team[]`]; writes [none until accept/reject].
- Interactions: "Accept" → `/pandit/requests/:id/accept` (B4); "Reject" → reject sheet (B5); "Chat" → chat thread (O? — Notifications/Chat stub, opens `/pandit/chat/:bookingId`); call button (if phone shared) → tel: stub; navigate → opens map stub; attachment tap → lightbox.
- Notes: OQ3/4/5/6 all converge here. Phone visibility honored (chat-only if hidden). Distance vs service radius surfaces travel-charge necessity.

---

### B4. Accept Flow (Travel & Additional Charges → Confirm)
- Route: `/pandit/requests/:id/accept`
- Surface/Tab: Pandit · Requests (accept).
- Purpose: Add travel/additional charges on acceptance, then confirm — advancing the booking to Accepted.
- Layout: App bar (back, "Accept Request"); body: order summary (puja base charge, custom additional charges read-only); **Travel charges** section (auto-suggested from service config + distance; editable base + per-km; toggle "Add travel charge"); **Additional charges** repeatable line items (label + amount, e.g. extra samagri); **Urgent surcharge** line shown read-only if urgent (OQ3); **Total to jajman** + **advance amount** computed; confirmation note "Jajman will be asked to pay advance"; sticky footer "Confirm & Accept".
- Components: `AppBar`, `ChargeSummaryRow`, `TravelChargeBlock` (`Toggle`,`CurrencyField`), `RepeatableLineItems`, `SurchargeRow`, `TotalReadout`, `PrimaryButton`.
- States: default; submitting (spinner); validation (charge amounts ≥0; total ≥ base); error (accept failed → retry); variant: no-travel-charge (within radius / pref off → travel block collapsed), urgent (surcharge auto-included).
- Data: reads [`request.*`, `panditProfile.service.{baseTravelFee,perKmRate}`, `request.distanceKm`, `urgentSurchargeRate`]; writes [`booking.status='Accepted'`, `booking.charges.{travel,additional[],surcharge,total,advance}`, removes from requests, adds to bookings, fires notification to jajman (mock)].
- Interactions: edit travel/additional → recompute total; "Confirm & Accept" → mutates store → success toast → navigates to `/pandit/bookings/:id` (B7) or back to Requests with confirmation.
- Notes: OQ-aligned: travel charges finalized at acceptance (PRD travel mgmt). OQ3 surcharge surfaced. After accept, lifecycle: Accepted → (jajman) Advance Paid → Scheduled.

---

### B5. Reject Flow
- Route: `/pandit/requests/:id` (reject bottom sheet) — `?action=reject`
- Surface/Tab: Pandit · Requests (reject sheet).
- Purpose: Capture a reason and reject the request.
- Layout: Bottom sheet: "Reject this request?"; reason radio list (Not available that day / Outside my service area / Puja not offered / Charges not feasible / Other) + optional note; suggestion note "We'll suggest other pandits to the jajman"; CTA "Confirm Reject" (destructive) + "Cancel".
- Components: `BottomSheet`, `RadioGroup`, `Textarea`, `InfoNote`, `DangerButton`, `GhostButton`.
- States: default; submitting; validation (reason required; note required if "Other"); error (reject failed → retry).
- Data: reads [`request.id`]; writes [`request.status='Rejected'`, `request.rejectReason`, removes from active requests, fires alternate-suggestion flow to jajman (mock)].
- Interactions: "Confirm Reject" → mutate → toast "Request rejected" → back to Requests list; "Cancel" → close sheet.
- Notes: Ties to Jajman "alternate suggestions if booking fails" (similar/nearby/same-puja experts). No penalty to pandit (early stage).

---

### C. CALENDAR & AVAILABILITY

---

### F1. Calendar (Month / Week / Day)
- Route: `/pandit/calendar`
- Surface/Tab: Pandit · **Calendar** tab.
- Purpose: Unified view of bookings, available slots, and leaves across time.
- Layout: App bar ("Calendar" + view switch Month/Week/Day + "+" add); body: view-dependent — **Month**: grid with dots (booking=maroon, open slot=saffron, leave=grey) + selected-day agenda below; **Week**: 7-column time grid with blocks; **Day**: hourly timeline with booking/slot/leave blocks; legend chip row; FAB-style "+ Add availability / leave" action. Bottom nav.
- Components: `AppBar`, `ViewSwitch`, `MonthGrid`, `WeekGrid`, `DayTimeline`, `EventBlock`, `Legend`, `AgendaList`, `Fab`, `PanditTabBar`.
- States: default; loading-skeleton (grid shimmer); empty (no events on selected day → "Nothing scheduled"); error (fetch fail → retry); variant: month vs week vs day; conflict highlight (overlapping booking+slot).
- Data: reads [`bookings[].{date,slot,puja,status}`, `availability.slots[]`, `availability.recurring[]`, `leaves[]`]; writes [navigation only].
- Interactions: view switch → re-renders; tap day (month) → day agenda; tap booking block → `/pandit/bookings/:id`; tap open slot → edit in Manage Availability; "+" → action sheet (Add slot / Add recurring / Add leave) → F2/F3; swipe → prev/next period.
- Notes: Recurring schedule expands into displayed slots; leaves visually subtract availability.

---

### F2. Manage Availability (Manual Slot + Recurring)
- Route: `/pandit/calendar/availability`
- Surface/Tab: Pandit · Calendar (sub-screen).
- Purpose: Create/edit manual one-off slots and the recurring weekly schedule.
- Layout: App bar (back, "Availability"); tabs — **Recurring** (Mon–Sun rows, toggle + multiple time ranges per day, "+ time range"; copy-to-all helper) and **Specific dates** (list of one-off slots with date+range, "+ Add slot", swipe-to-delete); master "Accepting bookings" toggle at top (mirrors Dashboard); save handled inline (autosave) with toast. 
- Components: `AppBar`, `TabSwitch`, `WeekdayScheduleRow`, `TimeRangeChip`, `SlotListItem`, `AddSlotSheet`, `MasterToggle`, `SwipeAction`.
- States: default; loading-skeleton; empty (no recurring/slots → "Add your first slot"); validation (end>start, no overlap, not in the past); error (save fail → retry); variant: recurring vs specific.
- Data: reads [`availability.{recurring[],slots[],acceptingToggle}`]; writes [add/edit/delete `availability.recurring[]`, `availability.slots[]`, `acceptingToggle`].
- Interactions: weekday toggle/range edits → autosave; "+ Add slot" → AddSlotSheet → append; swipe slot → delete (confirm); master toggle → global pause confirm.
- Notes: Same model as onboarding A7. Overlap with existing bookings warns rather than blocks (booking wins).

---

### F3. Leave Management
- Route: `/pandit/calendar/leave`
- Surface/Tab: Pandit · Calendar (sub-screen).
- Purpose: Block dates or time slots; categorize leave (vacation/festival/personal).
- Layout: App bar (back, "Leave & Blocks" + "+"); body: tabs — **Block dates** (date or date-range picker + leave type select + reason note; list of existing blocks) and **Block time slots** (date + start–end + type; list); each list item shows type chip + dates + delete. 
- Components: `AppBar`, `TabSwitch`, `DateRangePicker`, `LeaveTypeSelect` (Vacation/Festival/Personal), `TimeRangePicker`, `Textarea`, `LeaveListItem`, `Chip`, `SwipeAction`.
- States: default; loading-skeleton; empty ("No leaves scheduled"); validation (range valid, no leave over an existing accepted booking → warning "You have a booking on this day"); error (save fail → retry); variant: date-block vs slot-block.
- Data: reads [`leaves[].{id,type,startDate,endDate,slot?,reason}`, `bookings` for conflict check]; writes [add/delete `leaves[]`].
- Interactions: "+" → block sheet; save → appends, reflects in Calendar as grey; delete → removes; conflict → warning modal (proceed/cancel).
- Notes: Leaves subtract from displayed availability and prevent new requests on blocked times (mock-enforced).

---

### D. BOOKINGS

---

### D1. Bookings List (Today / Upcoming / Completed)
- Route: `/pandit/bookings`
- Surface/Tab: Pandit · (reached from Dashboard / Calendar; no dedicated tab — surfaced via Dashboard "Bookings" and Calendar). 
- Purpose: List the pandit's confirmed/active/past bookings by time bucket.
- Layout: App bar ("My Bookings" + filter); segmented tabs **Today / Upcoming / Completed**; list of `BookingCard`: puja, jajman, date+slot, status chip (StatusStepper-mini), amount, distance; pull-to-refresh.
- Components: `AppBar`, `SegmentedTabs`, `BookingCard`, `StatusChip`, `PullToRefresh`.
- States: default; loading-skeleton; empty per tab ("No bookings today"); error (retry); variant: in-progress booking highlighted; cancelled/refund entries appear in Completed with status.
- Data: reads [`bookings[].{id,puja,jajman,date,slot,status,amount,distanceKm}`]; writes [none].
- Interactions: tab switch → filters; card tap → `/pandit/bookings/:id` (D2); pull-to-refresh → re-fetch mock.
- Notes: Status lifecycle drives chip: Accepted → Advance Paid → Scheduled → In Progress → Completed → Rated; plus Cancelled/Refund states.

---

### D2. Booking Detail
- Route: `/pandit/bookings/:id`
- Surface/Tab: Pandit · Bookings (detail).
- Purpose: Manage a single booking through its lifecycle, with all actions.
- Layout: App bar (back, "Booking", overflow ⋮ for cancel/dispute); body: **StatusStepper** (Requested→Accepted→Advance Paid→Scheduled→In Progress→Completed→Rated); **Jajman card** (name, phone if shared / chat); **Puja card** (name, badges, charges breakdown: base + travel + additional + surcharge + total + advance paid + remaining); **Schedule card** (date/slot); **Address card** with **Navigate** button (map stub) + distance; **Attachments/Notes**; **Action zone** (context by status): mark **In Progress**, mark **Completed**, **Request remaining payment**, **Chat**; multi-pandit team panel if applicable. Sticky primary action reflects next valid step.
- Components: `AppBar`, `OverflowMenu`, `StatusStepper`, `JajmanCard`, `ChargeBreakdown`, `ScheduleCard`, `AddressCard` (`NavigateButton`,`MapPreviewStatic`), `AttachmentGallery`, `NotesBlock`, `MultiPanditTeamPanel`, `PrimaryButton`, `GhostButton`.
- States: per-status variants (Accepted→awaiting advance / Advance Paid→can schedule-confirm / Scheduled→can mark In Progress on the day / In Progress→can mark Completed / Completed→request remaining + rate prompt / Rated); loading-skeleton; error (action fail → retry); empty (n/a); variant: **cancelled/refund** (read-only with refund status), **dispute open** banner.
- Data: reads [`booking.*`, `jajman.*`, `charges.*`, `address.*`, `attachments[]`, `team[]`]; writes [`booking.status` transitions; `booking.remainingRequestedAt`].
- Interactions: "Mark In Progress" → status→In Progress (guard: only on/after date) ; "Mark Completed" → status→Completed → prompt "Rate the jajman" (J2) + "Request remaining"; "Request remaining payment" → fires mock request to jajman, sets flag; "Chat" → `/pandit/chat/:id`; "Navigate" → map stub; overflow → **Cancel** (D3) / **Raise dispute** (I-screens).
- Notes: Completion gates remaining-payment + ratings. Marking complete moves wallet pending→available per settlement model (see money screens).

---

### D3. Pandit-Initiated Cancel (Full Refund to Jajman)
- Route: `/pandit/bookings/:id/cancel` (bottom sheet/confirm)
- Surface/Tab: Pandit · Bookings (cancel).
- Purpose: Let the pandit cancel a booking — triggering a FULL refund to the jajman (OQ2).
- Layout: Bottom sheet: "Cancel this booking?"; **cancellation window** indicator (whether within free window — though pandit cancel = full refund regardless); reason radio (Emergency / Double-booked / Health / Other) + note; **refund notice** prominent: "Jajman will receive a FULL refund (₹{advance})"; impact note "May affect your reliability"; CTA "Confirm Cancellation" (destructive) + "Keep booking".
- Components: `BottomSheet`, `CancellationWindowChip`, `RadioGroup`, `Textarea`, `RefundNotice`, `DangerButton`, `GhostButton`.
- States: default; submitting; validation (reason required); error (retry); variant: within-window vs outside-window (both full refund for pandit-cancel per OQ2, but window shown for transparency).
- Data: reads [`booking.charges.advance`, `booking.cancellationWindowEndsAt`]; writes [`booking.status='Cancelled'` → `Refund Initiated` → `Refund Completed` (mock auto-advance), `jajman.wallet/refund += full advance`, notification to jajman].
- Interactions: "Confirm Cancellation" → mutate (full refund), toast, → back to Bookings; "Keep booking" → close.
- Notes: OQ2 — Pandit cancel = full refund (vs Jajman cancel = amount minus 5%). Cancellation window surfaced in UI per OQ2 even though pandit-side is always full refund.

---

### E. MONEY

---

### M1. Earnings Overview
- Route: `/pandit/earnings`
- Surface/Tab: Pandit · **Earnings** tab.
- Purpose: Summarize earnings with mini charts and entry points to wallet/withdraw/history.
- Layout: App bar ("Earnings" + period selector This Week/Month/Year); body: KPI cards (Total earnings, This-period earnings, Completed pujas count, Avg per puja); **mini bar/line chart** (earnings over period, recharts-lite); **breakdown** (gross vs commission deducted vs net); shortcut cards → Wallet, Withdraw, Transaction history; recent earning rows. Bottom nav.
- Components: `AppBar`, `PeriodSelector`, `KpiCard`, `MiniChart` (recharts), `BreakdownBar`, `ShortcutCard`, `EarningRow`, `PanditTabBar`.
- States: default; loading-skeleton (KPIs + chart shimmer); empty (new pandit: "No earnings yet"); error (retry); variant: gated (pre-approval — locked).
- Data: reads [`earnings.{total,period,completedCount,avg,series[]}`, `commission.rate`, `wallet.*`]; writes [period selection (UI only)].
- Interactions: period selector → re-chart; "Wallet" → M2; "Withdraw" → M3; "Transactions" → M5; earning row → related `/pandit/bookings/:id`.
- Notes: Commission deduction reflects platform settlement model. Chart is the only place recharts is used on pandit surface.

---

### M2. Wallet
- Route: `/pandit/wallet`
- Surface/Tab: Pandit · Earnings (sub-screen).
- Purpose: Show wallet balances and launch withdrawal.
- Layout: App bar (back, "Wallet"); body: hero balance card (**Available balance** large, with "Withdraw" CTA); secondary stat row (Pending balance, Total earnings, Withdrawn amount); explainer "Pending clears after booking completion & settlement"; recent transactions preview (→ history); security note.
- Components: `AppBar`, `BalanceHeroCard`, `StatRow`, `InfoNote`, `TransactionPreviewList`, `PrimaryButton`.
- States: default; loading-skeleton; empty (zero balances → "Your earnings will appear here"); error (retry); variant: available=0 (Withdraw disabled with hint), pending>0 highlighted.
- Data: reads [`wallet.{available,pending,total,withdrawn}`, `transactions[] (recent)`]; writes [none].
- Interactions: "Withdraw" → M3 (disabled if available=0); "View all transactions" → M5; transaction row → M5 detail.
- Notes: Settlement model: booking payment → platform wallet → commission deduction → pandit wallet (available) → withdrawal.

---

### M3. Withdraw Flow
- Route: `/pandit/wallet/withdraw`
- Surface/Tab: Pandit · Earnings/Wallet (sub-screen).
- Purpose: Request a withdrawal — amount, bank selection, confirm.
- Layout: App bar (back, "Withdraw"); body: available balance reminder; **amount field** (with "Withdraw all" chip; min/max validation); **bank selector** (list of saved banks, radio; "+ Add bank account" if none → M6); fee/eta note ("Processed in 1–2 business days"); review summary; sticky footer "Confirm Withdrawal".
- Components: `AppBar`, `BalanceReminder`, `CurrencyField`, `Chip` ("Withdraw all"), `BankSelector`, `InfoNote`, `ReviewSummary`, `PrimaryButton`.
- States: default; submitting; validation (amount ≤ available, ≥ min, bank required); empty (no bank → inline "Add a bank to withdraw" → M6); error (request failed → retry); variant: no-funds (blocked).
- Data: reads [`wallet.available`, `banks[]`, `withdrawal.minAmount`]; writes [creates `withdrawal{amount,bankId,status:'requested',createdAt}`; decrements `wallet.available`, increments a pending-withdrawal line].
- Interactions: "Withdraw all" → fills amount; select bank; "Confirm Withdrawal" → creates withdrawal → success → M4 status; "+ Add bank" → M6.
- Notes: Mock processing; status auto-advances for demo (requested→processing→paid).

---

### M4. Withdrawal Status
- Route: `/pandit/wallet/withdraw/:withdrawalId`
- Surface/Tab: Pandit · Earnings/Wallet (status).
- Purpose: Track a single withdrawal across its status lifecycle.
- Layout: App bar (back, "Withdrawal"); body: status illustration + **status stepper** (Requested → Processing → Paid; or Failed branch); amount, destination bank (masked acct), timestamps per step; if **Failed**: reason + "Retry withdrawal" CTA; "Back to Wallet".
- Components: `AppBar`, `StatusIllustration`, `WithdrawalStepper`, `DetailRow`, `ReasonCard`, `PrimaryButton`, `GhostButton`.
- States: requested; processing; paid; failed (with reason + retry); loading-skeleton; error (fetch fail → retry).
- Data: reads [`withdrawal.{amount,bank,status,timeline[],failReason?}`]; writes [on Failed retry → new withdrawal request, restores balance].
- Interactions: "Retry withdrawal" (failed) → M3 prefilled; "Back to Wallet" → M2.
- Notes: Withdrawal statuses per PRD: requested/processing/paid/failed.

---

### M5. Settlement / Transaction History
- Route: `/pandit/wallet/transactions`
- Surface/Tab: Pandit · Earnings/Wallet (sub-screen).
- Purpose: Full ledger of credits (booking settlements), debits (withdrawals), commission deductions, refunds.
- Layout: App bar (back, "Transactions" + filter); filter chips (All / Earnings / Withdrawals / Refunds / Commission); transaction list grouped by date: type icon, label, related booking, amount (+/−), running note; tap → detail sheet.
- Components: `AppBar`, `FilterChips`, `TransactionRow`, `GroupHeader`, `DetailSheet`.
- States: default; loading-skeleton; empty per filter ("No transactions"); error (retry); variant: refund entries (negative/neutral), commission entries.
- Data: reads [`transactions[].{id,type,amount,bookingId?,withdrawalId?,createdAt,note}`]; writes [none].
- Interactions: filter → narrows; row tap → detail sheet (full breakdown, link to booking/withdrawal); infinite scroll/paginate (mock).
- Notes: Reflects settlement chain; commission line visible for transparency.

---

### M6. Bank Management (List / Add / Update)
- Route: `/pandit/wallet/banks` ; add: `/pandit/wallet/banks/new` ; edit: `/pandit/wallet/banks/:bankId/edit`
- Surface/Tab: Pandit · Earnings/Wallet (sub-screen).
- Purpose: Manage bank accounts used for settlements/withdrawals.
- Layout: **List:** App bar (back, "Bank Accounts" + "+"); list of `BankCard` (bank name, masked acct, "Default" chip, edit/delete); empty state; settlement-history link. **Add/Edit form:** fields — Account holder name, Account number (+confirm), IFSC, Bank name (auto from IFSC stub), "Set as default" toggle; "Save".
- Components: `AppBar`, `BankCard`, `Chip`, `TextField`, `Toggle`, `PrimaryButton`, `SwipeAction`, `EmptyState`.
- States: list default / empty ("No bank accounts — add one to withdraw"); form default / validation (acct match, IFSC format) / submitting / error (retry); variant: editing existing, delete-confirm.
- Data: reads [`banks[].{id,holder,acctMasked,ifsc,bankName,isDefault}`]; writes [add/update/delete `banks[]`, set default].
- Interactions: "+" → add form; card edit → edit form; delete → confirm; "Set as default" → updates; "Save" → persists → back to list.
- Notes: Wallet-security NFR — account numbers masked in list, full only in edit. Settlement history accessible from here and M5.

---

### F. RATINGS

---

### J1. Ratings Received
- Route: `/pandit/ratings`
- Surface/Tab: Pandit · (reached from Dashboard ratings mini / Profile).
- Purpose: Show ratings and reviews received from jajmans.
- Layout: App bar (back, "My Ratings"); body: summary header (big avg star, total reviews, **distribution bars** 5→1, response rate / response time stats); review list: jajman name+avatar, stars, written review, optional review image, puja + date; filter (All / With photos / by stars).
- Components: `AppBar`, `RatingSummary`, `DistributionBars`, `ReviewCard`, `FilterChips`, `ImageThumb`.
- States: default; loading-skeleton; empty ("No reviews yet — complete bookings to receive ratings"); error (retry); variant: with-photo reviews, low-rating highlight.
- Data: reads [`ratings.{avg,count,distribution,responseRate,responseTime}`, `reviews[].{jajman,stars,text,image?,puja,date}`]; writes [none].
- Interactions: filter → narrows; review image tap → lightbox; review row → related booking (read-only).
- Notes: Pandit cannot edit jajman reviews; reply feature out of scope (stub-able later).

---

### J2. Rate Jajman (After Completion)
- Route: `/pandit/bookings/:id/rate`
- Surface/Tab: Pandit · Bookings (post-completion).
- Purpose: Let the pandit rate the jajman after a completed booking.
- Layout: App bar (back, "Rate Jajman"); body: jajman card; **star input** (1–5); written review (multiline, optional); optional image upload (e.g. event photo); tag chips (Punctual / Respectful / Clear info / Hospitable); CTA "Submit Rating".
- Components: `AppBar`, `JajmanCard`, `StarInput`, `Textarea`, `ImageUploader`, `TagChips`, `PrimaryButton`.
- States: default; submitting; validation (stars required); empty (none); error (retry); variant: **already-rated** (read-only summary + "Edit" within window), prompt-on-completion entry.
- Data: reads [`booking.id`, `jajman.*`]; writes [creates `jajmanRating{stars,text,image?,tags[]}`; sets `booking.status='Rated'`].
- Interactions: select stars; "Submit Rating" → mutate → status→Rated → toast → back to booking; image add → thumb.
- Notes: Both parties rate per PRD; pandit rating completes the lifecycle's Rated state.

---

### G. OTHER

---

### N1. Own Profile (Pandit)
- Route: `/pandit/profile`
- Surface/Tab: Pandit · **Profile** tab.
- Purpose: Hub for editing public info, managing pujas/charges, service config, ratings, mode switch, settings.
- Layout: App bar ("Profile" + settings gear); body: profile header (photo, name, city, avg rating, total pujas completed, response rate/time, verification/approval badge); **"Preview public profile"** button; menu list — Edit public info (N1a), Manage supported pujas & charges (N2), Service configuration (N3), Bank accounts (M6), Ratings received (J1), Disputes (I1), Notifications, Settings (S1), **Switch to Jajman mode** (T1); logout. Bottom nav.
- Components: `AppBar`, `ProfileHeader`, `BadgeApproved`, `MenuList`, `MenuItem`, `PrimaryButton` (preview), `PanditTabBar`.
- States: default; loading-skeleton; error (retry); variant: **pending/rejected** (approval badge differs, some items gated); incomplete-profile nudges.
- Data: reads [`panditProfile.*`, `ratings.{avg}`, `stats.completedCount`, `user.roles`]; writes [none here].
- Interactions: each menu item → its route; "Preview public profile" → read-only public profile (as a jajman would see, N1b); gear → S1; "Switch to Jajman mode" → T1; logout → confirm → auth.
- Notes: Single-account: mode switch present here per locked nav decision.

---

### N1a. Edit Public Info
- Route: `/pandit/profile/edit`
- Surface/Tab: Pandit · Profile (sub-screen).
- Purpose: Edit the public-facing profile fields.
- Layout: App bar (back, "Edit Profile" + Save); form mirroring A2 (photo, name, about, experience, languages, specializations, city) plus availability summary link; sticky "Save".
- Components: `AppBar`, `AvatarUploader`, `TextField`, `Textarea`, `Stepper`, `ChipMultiSelect`, `CityTypeahead`, `PrimaryButton`.
- States: default; loading-skeleton; validation (same as A2); submitting; error (retry); variant: dirty-form unsaved-changes guard.
- Data: reads [`panditProfile.profile.*`]; writes [updates `panditProfile.profile.*`].
- Interactions: edit fields; "Save" → persist → toast → back; back with unsaved → confirm discard.
- Notes: Edits may re-trigger admin review for sensitive fields (flag, but not gating per OQ1).

---

### N1b. Public Profile Preview (read-only)
- Route: `/pandit/profile/preview`
- Surface/Tab: Pandit · Profile (preview of jajman-facing view).
- Purpose: Show the pandit exactly what jajmans see.
- Layout: Read-only render of the Jajman pandit-detail layout: hero photo, name, about, experience, languages, specializations, supported pujas + charges, ratings & reviews, total completed, city/distance placeholder, availability, response rate/time; "Looks good"/back.
- Components: `AppBar`, `PublicProfileView` (reused jajman component), `GhostButton`.
- States: default; loading-skeleton; error (retry).
- Data: reads [`panditProfile.*`, `supportedPujas[]`, `ratings.*`]; writes [none].
- Interactions: back → N1; any "edit" affordance → relevant edit screen.
- Notes: Reuses the Jajman surface's public-profile component for consistency.

---

### N2. Manage Supported Pujas & Charges
- Route: `/pandit/profile/pujas` (add-from-master reuses A4 pattern; custom reuses A5; per-puja edit reuses A4a)
- Surface/Tab: Pandit · Profile (sub-screen).
- Purpose: Add/remove supported pujas, edit charges & durations, manage custom pujas post-approval.
- Layout: App bar (back, "My Pujas" + "+"); list of supported pujas grouped by category, each `SupportedPujaRow`: name (+Custom badge), charge, duration, edit/remove; "+ Add from catalog" and "+ Create custom"; empty state.
- Components: `AppBar`, `SupportedPujaRow`, `Badge` (Custom), `SwipeAction`, `PrimaryButton`, `EmptyState`.
- States: default; loading-skeleton; empty ("No pujas configured — add one"); validation (charge in/near master range, soft warn); error (retry); variant: custom puja with additional-charges flag.
- Data: reads [`supportedPujas[]`, `masterPujas[]`, `masterCategories[]`]; writes [add/edit/remove `supportedPujas[]`, charge/duration updates].
- Interactions: row edit → A4a sheet; remove → confirm; "+ Add from catalog" → A4-style picker; "+ Create custom" → A5-style form; save → persist.
- Notes: OQ5 — custom pujas remain flagged with additional charges anywhere shown.

---

### N3. Service Configuration (Profile)
- Route: `/pandit/profile/service`
- Surface/Tab: Pandit · Profile (sub-screen).
- Purpose: Edit service radius, travel preference, and travel charges after onboarding.
- Layout: Same controls as A3 (radius slider + map preview, travel-preference radios, travel-charge block) with "Save"; shows current values; note that changes apply to future requests only.
- Components: `AppBar`, `RadiusSlider`, `MapPreviewStatic`, `RadioGroup`, `Toggle`, `CurrencyField`, `PrimaryButton`.
- States: default; loading-skeleton; validation (as A3); submitting; error (retry); variant: anywhere-on-request.
- Data: reads [`panditProfile.service.*`]; writes [updates `panditProfile.service.*`].
- Interactions: edit → "Save" → persist → toast → back.
- Notes: Mirrors onboarding A3; travel charges still finalized at accept (B4).

---

### I1. Disputes — List
- Route: `/pandit/disputes`
- Surface/Tab: Pandit · Profile/More (sub-screen).
- Purpose: View disputes the pandit is involved in (raised by or against).
- Layout: App bar (back, "Disputes" + "+ Raise"); filter chips (All / Open / Under review / Resolved); list of `DisputeCard`: type (Wrong info / Payment issue / Jajman no-show etc.), related booking, status chip, last update, raised-by indicator.
- Components: `AppBar`, `FilterChips`, `DisputeCard`, `StatusChip`, `PrimaryButton`.
- States: default; loading-skeleton; empty ("No disputes"); error (retry); variant: open vs resolved, raised-against-me highlighted.
- Data: reads [`disputes[].{id,type,bookingId,status,raisedBy,updatedAt}`]; writes [none].
- Interactions: "+ Raise" → I2; card → I3 detail; filter → narrows.
- Notes: Both parties can raise (PRD). Admin resolves; pandit sees status only.

---

### I2. Disputes — Raise (Wrong Info / Payment Issue)
- Route: `/pandit/disputes/new` (optionally `?bookingId=`)
- Surface/Tab: Pandit · Disputes (raise).
- Purpose: File a dispute with category + evidence.
- Layout: App bar (back, "Raise Dispute"); body: booking selector (if not preset); **category** radio (Wrong information provided / Payment issue / Jajman didn't show / Other); description (multiline, required); **evidence upload** (images/docs); expected resolution note; CTA "Submit Dispute".
- Components: `AppBar`, `BookingSelector`, `RadioGroup`, `Textarea`, `EvidenceUploader`, `PrimaryButton`.
- States: default; submitting; validation (booking + category + description required); error (retry); variant: evidence upload progress/failure.
- Data: reads [`bookings[]` (eligible)]; writes [creates `dispute{bookingId,type,description,evidence[],status:'open',raisedBy:'pandit'}`].
- Interactions: select booking/category; add evidence; "Submit Dispute" → create → toast → I3.
- Notes: Pandit-side dispute types per PRD (wrong info / payment issue). Flow: created → evidence → admin review → resolution.

---

### I3. Disputes — Detail + Evidence
- Route: `/pandit/disputes/:id`
- Surface/Tab: Pandit · Disputes (detail).
- Purpose: Track a dispute, add evidence, view resolution.
- Layout: App bar (back, "Dispute"); body: status stepper (Open → Under review → Resolved); summary (type, related booking link, parties); description; **evidence gallery** (+ "Add evidence" while open); admin **resolution card** (when resolved: outcome + settlement/refund note); message/timeline thread; CTA contextual ("Add evidence" / read-only when resolved).
- Components: `AppBar`, `DisputeStepper`, `SummaryBlock`, `EvidenceGallery`, `ResolutionCard`, `TimelineThread`, `PrimaryButton`.
- States: open; under-review; resolved (with outcome); loading-skeleton; error (retry); variant: resolved-in-favor vs against, settlement/refund applied.
- Data: reads [`dispute.{type,status,evidence[],timeline[],resolution?}`, `booking` link]; writes [add `dispute.evidence[]` while open].
- Interactions: "Add evidence" → uploader; booking link → D2; image tap → lightbox.
- Notes: Resolution may trigger settlement/refund reflected in wallet/transactions.

---

### O1. Notifications Center
- Route: `/pandit/notifications`
- Surface/Tab: Pandit · global (app-bar bell).
- Purpose: Chronological notifications across requests, bookings, money, disputes, approval.
- Layout: App bar (back, "Notifications" + "Mark all read"); grouped list (Today/Earlier): icon by type, title, snippet, timestamp, unread dot; tap routes to source.
- Components: `AppBar`, `NotificationRow`, `GroupHeader`, `TextButton` (mark all read), `EmptyState`.
- States: default; loading-skeleton; empty ("You're all caught up"); error (retry); variant: unread vs read; type variants (new request w/ countdown, booking status change, advance paid, withdrawal status, approval result, dispute update).
- Data: reads [`notifications[].{id,type,title,body,refId,read,createdAt}`]; writes [mark read / mark all read].
- Interactions: row tap → deep link (request/booking/withdrawal/dispute/approval) + mark read; "Mark all read" → clears unread.
- Notes: Notification prefs honored (PRD: mobile + WhatsApp simulated). Push-ready architecture stub.

---

### S1. Settings (Pandit)
- Route: `/pandit/settings`
- Surface/Tab: Pandit · Profile (settings).
- Purpose: App-level preferences and logout.
- Layout: App bar (back, "Settings"); grouped list: **Appearance** (Dark mode toggle), **Privacy** (Phone visibility: Share / Hide → chat-only), **Language** (English / Hindi / Sanskrit — Devanagari fallback), **Notifications** (channel/type prefs: mobile, WhatsApp), **Availability** (master accepting toggle shortcut), **Account** (Switch to Jajman mode → T1), **About** (version, terms), **Logout** (destructive).
- Components: `AppBar`, `SettingsGroup`, `Toggle`, `RadioGroup`, `LanguageSelect`, `MenuItem`, `DangerButton`.
- States: default; saving (per-toggle); error (save fail → revert + toast); variant: dark vs light live preview, phone-hidden (forces chat-only across app).
- Data: reads [`settings.{theme,phoneVisibility,language,notificationPrefs}`, `user.roles`]; writes [updates `settings.*`; logout clears session].
- Interactions: toggle dark mode → theme tokens swap instantly; phone visibility → updates jajman-facing call/chat affordance; language → i18n switch (Devanagari font activates); "Switch to Jajman mode" → T1; "Logout" → confirm → auth.
- Notes: Theme + i18n are locked global requirements; this is their control surface on the pandit side.

---

### T1. Switch to Jajman Mode
- Route: `/pandit/switch` (action sheet/confirm; resolves to Jajman home `/`)
- Surface/Tab: Pandit · Profile/Settings (mode switch).
- Purpose: Toggle the single account from Pandit mode into Jajman mode.
- Layout: Confirm sheet: "Switch to Jajman mode?", brief note "Your pandit account stays active — switch back anytime from your profile"; current-mode indicator; CTA "Switch to Jajman" + "Cancel". If user lacks a Jajman setup (always exists in single-account), proceeds directly.
- Components: `BottomSheet` / `ConfirmSheet`, `ModeIndicator`, `PrimaryButton`, `GhostButton`.
- States: default; switching (spinner); error (retry); variant: pandit-only edge (if somehow not yet a jajman → minimal jajman init, but single-account makes both available).
- Data: reads [`user.roles`, `appMode`]; writes [`appMode='jajman'`].
- Interactions: "Switch to Jajman" → sets mode → navigate to Jajman Home `/` (Jajman bottom tabs); "Cancel" → close.
- Notes: Locked decision — mode switcher lives in Profile/menu; reciprocal "Switch to Pandit" lives on the Jajman surface.

---

**Coverage summary (35 screens/states):** Onboarding A1–A9 (incl. A4a sheet) = 10; Core B1–B5 = 5; Calendar/Availability F1–F3 = 3; Bookings D1–D3 = 3; Money M1–M6 = 6; Ratings J1–J2 = 2; Other N1 (+N1a, N1b), N2, N3, I1–I3, O1, S1, T1 = 11. All resolved open questions are tied in: OQ1 (A8/A9 approval gate + Dashboard/Profile badges), OQ2 (D3 pandit-cancel full refund + cancellation window), OQ3 (urgent surcharge in B2/B3/B4), OQ4 (multi-pandit lead/team context in B3/D2), OQ5 (custom puja flag A5/N2/A4a), OQ6 (24h countdown + auto-expire in B2/B3).

---

## SCREEN INVENTORY — ADMIN (MOBILE)

> **Surface conventions.** Admin renders in the same centered phone-frame shell (~390–420px) as the other roles. Admin uses a **separate login** (not the single-account mode switcher). Persistent **bottom tab bar**: Dashboard · Bookings · Users · More. The **More** tab opens a menu hub routing to Verifications, Pujas & Categories, Commission, Settlements, Withdrawals, Disputes, Reports, Settings. A shared **AdminAppBar** (screen title left, optional context actions right: search, filter, date-range, broadcast bell) sits atop every screen. All money is mock INR (₹). All charts use a lightweight lib (recharts) sized for narrow width: single-column, max-height ~180px, horizontal-scroll wrapper where a chart would overflow. Theme tokens drive light/dark (saffron/amber primary, deep maroon secondary, gold accent, cream/sand surfaces). Every list defines loading-skeleton / empty / error; destructive/financial actions use a confirm sheet with an audit-log note.

---

### Admin Login
- Route: `/admin/login`
- Surface/Tab: Admin (unauthenticated; no bottom nav)
- Purpose: Authenticate an administrator into the separate admin app.
- Layout: No app bar. Top: small kalash/diya line motif + "Pandit Seva — Admin" wordmark on cream gradient. Body: card with email/mobile field, password field (show/hide toggle), "Sign in" primary CTA (saffron), inline "Forgot password?" link (opens stub sheet). Footer: build/version label, theme toggle, language stub selector.
- Components: PhoneFrame, BrandLockup, TextField, PasswordField, PrimaryButton, InlineLink, ThemeToggle, Toast.
- States: default; loading (CTA spinner, fields disabled); error (invalid credentials banner under card; field-level errors); locked variant (mock "too many attempts — try later" note); success (redirect to Dashboard).
- Data: reads [`adminUsers.email`, `adminUsers.passwordHash(mock)`]; writes [`session.adminAuth=true`, `auditLog.append(login)`].
- Interactions: Sign in -> validate against mock admin -> on success route `/admin/dashboard`; Forgot password -> stub confirmation sheet ("reset link simulated"); theme toggle -> persist token; language selector -> set i18n stub.
- Notes: This is the only place the admin/role boundary is enforced; the Jajman↔Pandit mode switcher is intentionally absent here.

---

### Admin Dashboard / Analytics
- Route: `/admin/dashboard`
- Surface/Tab: Admin · Dashboard
- Purpose: At-a-glance platform health across users, bookings, revenue, and disputes.
- Layout: AppBar (title "Dashboard"; actions: date-range chip, broadcast bell with unread dot). Body top→bottom: (1) **Date-range filter bar** — segmented chips [Today · 7D · 30D · MTD · Custom]; Custom opens a date-range sheet. (2) **Users analytics** section: 2×2 stacked KPI cards (Total Users, Pandits, Jajmans, Active) each with value, delta vs prior period (▲/▼ %), tiny sparkline. (3) **Bookings analytics**: KPI row (Today, Upcoming, Completed, Cancelled) + a compact horizontal **status bar chart**. (4) **Revenue analytics**: KPIs (Gross Revenue, Commission, Settlements, Withdrawals) + a small **area/line chart** of revenue over the selected range (horizontal-scroll wrapper). (5) **Dispute analytics**: KPIs (Open, Resolved) + thin donut/ratio bar. (6) **Quick actions** row: chips -> Verifications (badge count), Disputes (badge), Withdrawals (badge). Bottom nav.
- Components: DateRangeChips, DateRangeSheet, KpiCard (with delta + sparkline), MiniBarChart, MiniAreaChart, MiniDonut, SectionHeader, BadgeChip, ChartScrollWrapper, BottomNav.
- States: loading-skeleton (shimmer KPI cards + ghost charts); default (populated); empty (range with no data -> "No activity in this range" per section, charts show baseline); error (per-section retry banner; rest of page still renders); zero-delta variant (neutral dash instead of arrow).
- Data: reads [`analytics.users{total,pandits,jajmans,active}`, `analytics.bookings{today,upcoming,completed,cancelled}`, `analytics.revenue{gross,commission,settlements,withdrawals,series[]}`, `analytics.disputes{open,resolved}`, `queues.{verifications,disputes,withdrawals}.count`]; writes [`filters.dateRange`].
- Interactions: date chip / Custom -> recompute all sections from store; KPI card tap -> deep-link (e.g. Pandits card -> Users filtered role=pandit; Cancelled -> Bookings filtered status=cancelled; Commission -> Commission screen; Open disputes -> Dispute queue); broadcast bell -> Settings broadcast section; quick-action chips -> respective queues.
- Notes: Charts are mobile-first (single column, capped height). Deltas are computed against the immediately prior equal-length window from mock data.

---

### Bookings — List
- Route: `/admin/bookings`
- Surface/Tab: Admin · Bookings
- Purpose: Monitor and triage all platform bookings.
- Layout: AppBar (title "Bookings"; actions: search, filter). Body: (1) Sticky **filter bar** — status chips [All · Requested · Accepted · Advance Paid · Scheduled · In Progress · Completed · Rated · Rejected · Cancelled · Refund Initiated · Refund Completed], horizontally scrollable; secondary filters in sheet (date range, category, city, urgent-only). (2) **Booking cards** list: each shows booking ID, puja name + category icon, Jajman ↔ Pandit names (or "+team" pill for multi-pandit), status badge (color-coded), date/time, amount, urgent/emergency tag if applicable. Infinite-scroll/paginated. Bottom nav.
- Components: SearchBar, FilterSheet, StatusChipRow, BookingCard, StatusBadge, TeamPill, UrgentTag, EmptyState, ErrorState, SkeletonList, BottomNav.
- States: loading-skeleton; default; empty (filter yields none -> "No bookings match these filters" + Clear filters); error (retry); active-filter variant (filter button shows count badge).
- Data: reads [`bookings[]{id,puja,category,jajman,pandit|team,status,scheduledAt,amount,isUrgent,city}`]; writes [`filters.bookings`].
- Interactions: chip/filter -> refine list; search -> match by ID/puja/party name; card tap -> Booking detail; pull-to-refresh -> reload mock.
- Notes: Multi-pandit bookings (OQ4) surface a team pill; urgent same-day bookings (OQ3) carry the emergency tag.

---

### Booking — Detail (with Intervene/Override)
- Route: `/admin/bookings/:id`
- Surface/Tab: Admin · Bookings (detail)
- Purpose: Full booking record with admin intervention controls.
- Layout: AppBar (title "Booking #ID"; action: overflow menu). Body: (1) **Status header** — current status badge + horizontal **lifecycle stepper** (Requested→Accepted→Advance Paid→Scheduled→In Progress→Completed→Rated; alt branches Rejected/Cancelled/Refund shown when relevant). (2) **Parties** card: Jajman (name, contact-visibility note, link to user) and Pandit / **team list** (lead flagged for OQ4-B) with link to each profile. (3) **Puja details**: type, category, custom-puja flag + additional charges if OQ5, duration, address (Home/Temple/etc), attachments thumbnails, notes. (4) **Money breakdown**: base, travel charge, emergency surcharge (OQ3), commission, advance paid, remaining, refund status; cancellation window indicator (OQ2). (5) **Timeline/audit** of events. (6) **Admin actions** sticky footer: "Intervene / Override" -> action sheet [Force-cancel (full/partial refund), Reassign pandit, Adjust amount, Resolve linked dispute, Add admin note]. Bottom nav.
- Components: LifecycleStepper, StatusBadge, PartyCard, TeamList, AttachmentThumb, MoneyBreakdown, RefundIndicator, CancellationWindowBadge, TimelineList, ActionSheet, ConfirmSheet, BottomNav.
- States: loading-skeleton; default; error (not found / load fail); variants per status (e.g. show refund block only when cancelled/refunding; show emergency surcharge only when urgent; show team block only when multi-pandit); override-in-progress (confirm sheet + audit note required).
- Data: reads [`booking{full}`, `users{by id}`, `disputes{linked}`, `commissionRules{applied}`]; writes [`booking.status`, `booking.refund`, `booking.assignment`, `booking.amountAdjustments`, `auditLog.append`].
- Interactions: stepper is read-only; party links -> User detail; override actions -> confirm sheet -> mutate store -> status/wallet/refund propagate to all role views; "Resolve linked dispute" -> Dispute detail.
- Notes: Force-cancel honors OQ2 rules (Jajman-side 5% cut vs Pandit-side full refund), but admin can override to full refund with a logged reason.

---

### Users — List
- Route: `/admin/users`
- Surface/Tab: Admin · Users
- Purpose: Browse, search, and filter all platform accounts.
- Layout: AppBar (title "Users"; actions: search, filter). Body: (1) **Role filter chips** [All · Jajman · Pandit · Both] + status sub-filter (Active/Inactive/Pending) in sheet. (2) **User rows**: avatar, name, role badge(s), city, status dot, key stat (pandit: rating/completed; jajman: bookings count). Bottom nav.
- Components: SearchBar, FilterSheet, RoleChipRow, UserRow, RoleBadge, StatusDot, EmptyState, ErrorState, SkeletonList, BottomNav.
- States: loading-skeleton; default; empty ("No users match"); error (retry); pending-verification variant (pandit rows show "Pending Approval" pill linking to Verification detail).
- Data: reads [`users[]{id,name,avatar,roles,city,status,rating,completedCount,bookingsCount}`]; writes [`filters.users`].
- Interactions: chip/filter/search -> refine; row tap -> User detail; pending pill -> Verification detail.
- Notes: A "Both"-role user shows two role badges; the single-account model is reflected here, not split into two records.

---

### User — Detail (Activate/Deactivate)
- Route: `/admin/users/:id`
- Surface/Tab: Admin · Users (detail)
- Purpose: Inspect a user's profile/activity and toggle account status.
- Layout: AppBar (title name; action: overflow). Body: (1) **Profile header**: avatar, name, role badge(s), status, city, joined date, language pref. (2) **Tabs / segmented**: Profile · Activity · Wallet (pandit). Profile = contact, addresses (jajman), pandit public profile fields (about, experience, languages, specializations, supported pujas, service radius/travel pref, charges, response rate/time) when applicable. Activity = recent bookings, reviews given/received, disputes. Wallet = available/pending/total/withdrawn (pandit only). (3) Sticky footer: **Activate/Deactivate** toggle button. Bottom nav.
- Components: ProfileHeader, RoleBadge, SegmentedTabs, KeyValueList, AddressList, SpecializationChips, ActivityList, WalletSummary, ToggleButton, ConfirmSheet, BottomNav.
- States: loading-skeleton; default; error; variants (jajman vs pandit vs both -> conditional sections); deactivated variant (muted header + "Reactivate" CTA); confirm (deactivate sheet requires reason -> audit log).
- Data: reads [`user{full}`, `bookings{by user}`, `reviews{by user}`, `disputes{by user}`, `wallet{by pandit}`]; writes [`user.status`, `auditLog.append`].
- Interactions: tab switch -> section; activity item -> Booking/Dispute detail; toggle -> confirm sheet -> set status (deactivated user blocked from new bookings across app); overflow -> "View as pandit profile preview".
- Notes: Deactivation is reversible; status change ripples to discovery/search in Jajman views in the live mock store.

---

### More — Menu Hub
- Route: `/admin/more`
- Surface/Tab: Admin · More
- Purpose: Entry point to all secondary admin tools.
- Layout: AppBar (title "More"). Body: grouped menu list with leading icons, labels, and **badge counts** where actionable: Verifications (N pending), Pujas & Categories, Commission, Settlements (N pending), Withdrawals (N requested), Disputes (N open), Reports, Settings. Footer mini-section: theme toggle, language stub, "Signed in as <admin>", Logout. Bottom nav.
- Components: MenuList, MenuRow (icon+label+badge+chevron), SectionDivider, ThemeToggle, LanguageStub, LogoutButton, ConfirmSheet, BottomNav.
- States: default; loading (badge counts shimmer); error (badges show "—" with silent retry).
- Data: reads [`queues.*.count`, `session.admin`]; writes [`session.adminAuth=false` on logout].
- Interactions: each row -> its screen; Logout -> confirm sheet -> clear session -> `/admin/login`; theme/language -> persist tokens.
- Notes: Badge counts mirror Dashboard quick-action badges for consistency.

---

### Verification Queue — Pending Pandits
- Route: `/admin/verifications`
- Surface/Tab: Admin · More → Verifications
- Purpose: List pandits awaiting admin approval (OQ1).
- Layout: AppBar (title "Verifications"; action: search). Body: (1) Filter chips [Pending · Approved · Rejected]. (2) **Pandit cards**: photo, name, city, claimed specializations, submitted date, "docs attached" indicator (optional, not the gate), age-in-queue. Bottom nav.
- Components: StatusChipRow, VerificationCard, DocIndicator, QueueAgeBadge, EmptyState, ErrorState, SkeletonList, BottomNav.
- States: loading-skeleton; default; empty ("No pending verifications — all clear"); error (retry).
- Data: reads [`pandits[]{verificationStatus='pending',profile,docs?,submittedAt}`]; writes [`filters.verifications`].
- Interactions: chip -> filter by status; card tap -> Verification detail.
- Notes: OQ1 — onboarding completion lands here as "Pending Admin Approval"; documents are optional context, not a requirement to approve.

---

### Verification — Detail (Approve / Reject)
- Route: `/admin/verifications/:panditId`
- Surface/Tab: Admin · More → Verifications (detail)
- Purpose: Review a pandit's profile/docs and approve or reject with reason.
- Layout: AppBar (title "Review Pandit"). Body: (1) Profile header (photo, name, city, experience). (2) **Profile review** sections: about, languages, specializations, supported pujas + configured charges, service radius/travel preference, suggested-duration overrides. (3) **Documents** (optional): thumbnail grid, tap to zoom; "No documents submitted" allowed. (4) Sticky footer: **Approve** (saffron) + **Reject** (maroon outline). Reject opens reason sheet (preset reasons + free text, required).
- Components: ProfileHeader, KeyValueList, SpecializationChips, ChargesTable, DocGrid, Lightbox, PrimaryButton, DangerButton, ReasonSheet, ConfirmSheet.
- States: loading-skeleton; default; error; no-docs variant; submitting (CTA spinner); post-decision (status flips, footer replaced by "Approved/Rejected on <date>" + Undo within session).
- Data: reads [`pandit{full,docs?}`]; writes [`pandit.verificationStatus`, `pandit.verificationReason`, `pandit.isPublic`, `auditLog.append`, `notifications.toPandit(mock)`].
- Interactions: Approve -> confirm -> status=approved, pandit becomes discoverable in Jajman search, mock notification queued; Reject -> reason sheet -> status=rejected with reason shown to pandit (mock); doc thumb -> lightbox.
- Notes: OQ1 gate. Approval makes the pandit visible across discovery in the live store; rejection keeps them hidden with the recorded reason.

---

### Pujas & Categories — Overview
- Route: `/admin/catalog`
- Surface/Tab: Admin · More → Pujas & Categories
- Purpose: Manage the master catalog and review custom pujas.
- Layout: AppBar (title "Pujas & Categories"; action: add ⊕). Body: **Segmented tabs** [Categories · Puja Types · Custom (N)]. Categories tab = list of categories. Puja Types tab = list of puja types. Custom tab = pandit-created custom pujas pending review (OQ5). Floating "+" creates in the active tab's context. Bottom nav.
- Components: SegmentedTabs, ListWithFab, BottomNav (sub-screens below).
- States: per active tab (see sub-screens).
- Data: reads [`categories[]`, `pujaTypes[]`, `customPujas[]`]; writes [`ui.catalogTab`].
- Interactions: tab switch; FAB -> create sheet matching tab; rows -> respective detail/edit.
- Notes: Container for the three sub-lists below.

#### Categories — List + Create/Edit
- Route: `/admin/catalog/categories` (sheet: `/admin/catalog/categories/new`, `/admin/catalog/categories/:id/edit`)
- Surface/Tab: Admin · More → Pujas & Categories → Categories
- Purpose: CRUD puja categories (Katha, Jaap, Marriage, Griha Pravesh, Festival Puja, Shradh, Temple Rituals).
- Layout: List rows (icon + name + #puja types + active toggle). Create/Edit = bottom sheet: name field, **icon picker** (lucide grid), active toggle, Save/Delete.
- Components: CategoryRow, IconPicker, TextField, SwitchToggle, PrimaryButton, DangerButton, EmptyState, SkeletonList, ConfirmSheet.
- States: loading-skeleton; default; empty ("No categories yet — add one"); error; saving; delete-blocked variant ("Category in use by N pujas — deactivate instead").
- Data: reads [`categories[]{id,name,icon,active,pujaCount}`]; writes [`categories.create/update/deactivate`, `auditLog.append`].
- Interactions: row tap -> edit sheet; FAB -> new sheet; Save -> upsert; Delete -> confirm (block if in use).
- Notes: Deactivation preferred over delete when referenced.

#### Puja Types — List + Create/Edit
- Route: `/admin/catalog/pujas` (sheet: `/admin/catalog/pujas/new`, `/admin/catalog/pujas/:id/edit`)
- Surface/Tab: Admin · More → Pujas & Categories → Puja Types
- Purpose: CRUD master puja types with suggested duration and min/max amount.
- Layout: List rows (puja name, category chip, suggested duration, min–max ₹ range, active toggle). Create/Edit sheet: name, category select, suggested duration (h/m), **min amount**, **max amount** (validate min ≤ max), active toggle, Save/Delete.
- Components: PujaRow, CategorySelect, DurationStepper, CurrencyField, SwitchToggle, PrimaryButton, DangerButton, EmptyState, SkeletonList, ConfirmSheet, ValidationBanner.
- States: loading-skeleton; default; empty; error; saving; validation-error variant (min>max, missing category).
- Data: reads [`pujaTypes[]{id,name,categoryId,suggestedDuration,minAmount,maxAmount,active}`, `categories[]`]; writes [`pujaTypes.create/update/deactivate`, `auditLog.append`].
- Interactions: row -> edit; FAB -> new; Save -> validate -> upsert; Delete -> confirm.
- Notes: Min/max bound the charges pandits may configure in their own service setup.

#### Custom Pujas — Review (OQ5)
- Route: `/admin/catalog/custom` (detail: `/admin/catalog/custom/:id`)
- Surface/Tab: Admin · More → Pujas & Categories → Custom
- Purpose: Review pandit-created custom pujas not in the master, flagged with additional charges.
- Layout: List of custom pujas (name, creating pandit, proposed category, additional-charge flag, status). Detail: full description, proposed duration, base + **additional charges (clearly flagged)**, creating pandit link; footer **Approve into master** / **Allow as custom-only** / **Reject (reason)**.
- Components: CustomPujaRow, FlagBadge, KeyValueList, ChargesTable, ActionSheet, ReasonSheet, ConfirmSheet, EmptyState, SkeletonList.
- States: loading-skeleton; default; empty ("No custom pujas to review"); error; submitting; post-decision (status flips).
- Data: reads [`customPujas[]{id,name,panditId,proposedCategory,baseAmount,additionalCharges,status,description,duration}`]; writes [`customPuja.status`, optional `pujaTypes.create(promote)`, `auditLog.append`, `notifications.toPandit(mock)`].
- Interactions: row -> detail; Approve into master -> create a master puja type + mark resolved; Allow custom-only -> keep flagged, bookable; Reject -> reason sheet.
- Notes: OQ5 — additional charges always rendered with a distinct flag badge in both admin and downstream booking views.

---

### Commission — Rules List
- Route: `/admin/commission`
- Surface/Tab: Admin · More → Commission
- Purpose: View and manage commission rules (global / per-category / per-pandit).
- Layout: AppBar (title "Commission"; action: add ⊕). Body: (1) **Effective global rate** banner card. (2) Scope filter chips [All · Global · Category · Pandit]. (3) **Rule rows**: scope badge, target (category/pandit name or "Global"), percentage, active toggle, priority indicator (pandit > category > global). Bottom nav.
- Components: RateBanner, ScopeChipRow, CommissionRuleRow, ScopeBadge, PercentPill, SwitchToggle, ListWithFab, EmptyState, SkeletonList, BottomNav.
- States: loading-skeleton; default; empty (only global exists -> show single rule + hint); error; conflict variant (overlapping rules -> resolution-order note).
- Data: reads [`commissionRules[]{id,scope,targetId,percent,active,priority}`, `categories[]`, `pandits[]`]; writes [`filters.commission`].
- Interactions: chip -> filter; row -> Commission detail/edit; FAB -> create sheet.
- Notes: Precedence (pandit-specific overrides category overrides global) is surfaced so admins understand applied rate at booking time.

#### Commission — Create/Edit/View
- Route: `/admin/commission/new`, `/admin/commission/:id`
- Surface/Tab: Admin · More → Commission (detail)
- Purpose: Configure a commission rule.
- Layout: Sheet/screen: **scope selector** (Global / Category / Pandit) -> conditional target picker (category select or pandit search) -> **percentage field** (0–100, slider + numeric) -> effective-from date (stub) -> active toggle -> Save/Delete. View mode shows read-only summary + "applies to N bookings (mock)".
- Components: ScopeSelector, CategorySelect, PanditSearchSelect, PercentSlider, CurrencyPercentField, DatePickerStub, SwitchToggle, PrimaryButton, DangerButton, ValidationBanner, ConfirmSheet.
- States: default; loading (edit); saving; validation-error (no target for non-global, percent out of range); error.
- Data: reads [`commissionRule{full}`, `categories[]`, `pandits[]`]; writes [`commissionRules.create/update/deactivate`, `auditLog.append`].
- Interactions: scope change -> show/hide target picker; Save -> validate -> upsert (affects settlement math downstream); Delete -> confirm (global cannot be deleted, only edited).
- Notes: Global rule is protected from deletion to guarantee a baseline rate.

---

### Settlements — Pending List
- Route: `/admin/settlements`
- Surface/Tab: Admin · More → Settlements
- Purpose: Process movement of completed-booking funds into pandit wallets.
- Layout: AppBar (title "Settlements"; action: filter). Body: (1) Tabs [Pending · History]. (2) Pending: summary card (total pending ₹, count) + **settlement rows**: pandit, booking ref, gross, commission deducted, net payable, status (queued). Optional "Settle all" bulk action. Bottom nav.
- Components: SegmentedTabs, SummaryCard, SettlementRow, MoneyChip, StatusBadge, BulkActionBar, EmptyState, SkeletonList, BottomNav.
- States: loading-skeleton; default; empty ("Nothing to settle"); error; processing variant (rows show in-progress spinner).
- Data: reads [`settlements[]{id,panditId,bookingId,gross,commission,net,status}`]; writes [`filters.settlements`].
- Interactions: tab switch; row -> Settlement detail; "Settle all" -> confirm -> batch process.
- Notes: Reflects model: booking payment → platform wallet → commission deduction → pandit wallet.

#### Settlement — Detail + Process
- Route: `/admin/settlements/:id`
- Surface/Tab: Admin · More → Settlements (detail)
- Purpose: Review and execute a single settlement.
- Layout: AppBar (title "Settlement #ID"). Body: pandit card (link), linked booking (link), **money breakdown** (gross, commission %/₹ from applied rule, platform fees, net payable), pandit bank account (mock), current status. Sticky footer: **Process Settlement** -> confirm sheet.
- Components: PartyCard, BookingRefCard, MoneyBreakdown, BankAccountCard, StatusBadge, PrimaryButton, ConfirmSheet, Toast.
- States: loading-skeleton; default; error; already-settled variant (footer replaced by "Settled on <date>", receipt link); processing (spinner).
- Data: reads [`settlement{full}`, `pandit{bank}`, `booking{ref}`, `commissionRules{applied}`]; writes [`settlement.status='paid'`, `wallet.pandit.available += net`, `wallet.pandit.pending -= net`, `auditLog.append`].
- Interactions: Process -> confirm -> mutate pandit wallet (available↑, pending↓), status→paid; party/booking links -> respective details.
- Notes: On process, pandit's Earnings/Wallet views update live in the mock store.

#### Settlement — History
- Route: `/admin/settlements?tab=history`
- Surface/Tab: Admin · More → Settlements → History
- Purpose: Audit completed settlements.
- Layout: List rows (pandit, date, net, status=paid/failed), date-range filter, total settled summary.
- Components: SettlementHistoryRow, StatusBadge, DateRangeChips, SummaryCard, EmptyState, SkeletonList.
- States: loading-skeleton; default; empty; error; failed variant (failed rows offer Retry).
- Data: reads [`settlements[]{status in paid,failed}`]; writes [optional `settlement.retry`].
- Interactions: row -> detail; retry -> reprocess; export hook -> Reports.
- Notes: Shares row/detail components with the pending list.

---

### Withdrawals — Requests List
- Route: `/admin/withdrawals`
- Surface/Tab: Admin · More → Withdrawals
- Purpose: Manage pandit withdrawal requests through their status lifecycle.
- Layout: AppBar (title "Withdrawals"; action: filter). Body: (1) Tabs [Requested · Processing · History]. (2) Summary card (total requested ₹). (3) **Withdrawal rows**: pandit, amount, requested date, available-balance check indicator, status (requested/processing/paid/failed). Bottom nav.
- Components: SegmentedTabs, SummaryCard, WithdrawalRow, BalanceCheckBadge, StatusBadge, EmptyState, SkeletonList, BottomNav.
- States: loading-skeleton; default; empty ("No withdrawal requests"); error; insufficient-balance variant (row flagged red, action disabled).
- Data: reads [`withdrawals[]{id,panditId,amount,requestedAt,status,balanceOk}`]; writes [`filters.withdrawals`].
- Interactions: tab switch; row -> Withdrawal detail.
- Notes: Withdrawal statuses mirror PRD: requested → processing → paid / failed.

#### Withdrawal — Detail (Approve/Process)
- Route: `/admin/withdrawals/:id`
- Surface/Tab: Admin · More → Withdrawals (detail)
- Purpose: Approve/process or reject a withdrawal and advance its status.
- Layout: AppBar (title "Withdrawal #ID"). Body: pandit card (link), requested amount vs **available wallet balance**, bank account (mock), status timeline (requested→processing→paid/failed). Sticky footer actions by state: **Approve → Process** (sets processing), **Mark Paid**, **Mark Failed (reason)**, or **Reject (reason)** while still requested.
- Components: PartyCard, BalanceCompare, BankAccountCard, StatusTimeline, ActionSheet, ReasonSheet, ConfirmSheet, PrimaryButton, DangerButton.
- States: loading-skeleton; default; error; insufficient-balance variant (process disabled + warning); processing; terminal variant (paid/failed footer collapsed to receipt/reason).
- Data: reads [`withdrawal{full}`, `wallet.pandit{available,withdrawn}`, `pandit{bank}`]; writes [`withdrawal.status`, `wallet.pandit.available -= amount`, `wallet.pandit.withdrawn += amount` (on paid), `auditLog.append`].
- Interactions: Approve→Process -> status=processing; Mark Paid -> deduct available, increment withdrawn, status=paid (pandit wallet updates live — ties to the "withdraw → wallet updates" requirement); Mark Failed/Reject -> reason sheet, funds returned/untouched.
- Notes: Balance guard prevents paying more than available in the mock store.

#### Withdrawal — History
- Route: `/admin/withdrawals?tab=history`
- Surface/Tab: Admin · More → Withdrawals → History
- Purpose: Audit past withdrawals (paid/failed).
- Layout: List rows (pandit, amount, date, status), date filter, totals.
- Components: WithdrawalHistoryRow, StatusBadge, DateRangeChips, SummaryCard, EmptyState, SkeletonList.
- States: loading-skeleton; default; empty; error; failed variant (reason shown).
- Data: reads [`withdrawals[]{status in paid,failed}`]; writes [—].
- Interactions: row -> detail; export hook -> Reports.
- Notes: Shares components with the requests list.

---

### Disputes — Queue
- Route: `/admin/disputes`
- Surface/Tab: Admin · More → Disputes
- Purpose: Triage disputes raised by either party.
- Layout: AppBar (title "Disputes"; action: filter). Body: (1) Tabs/chips [Open · Under Review · Resolved]. (2) **Dispute rows**: raised-by badge (Jajman/Pandit), reason category (e.g. "pandit didn't arrive", "payment issue"), linked booking ref, opened date, age, status, severity hint. Bottom nav.
- Components: StatusChipRow, DisputeRow, RaisedByBadge, SeverityDot, QueueAgeBadge, EmptyState, SkeletonList, BottomNav.
- States: loading-skeleton; default; empty ("No open disputes"); error; aging variant (rows past SLA flagged).
- Data: reads [`disputes[]{id,raisedBy,reason,bookingId,openedAt,status}`]; writes [`filters.disputes`].
- Interactions: chip -> filter; row -> Dispute detail.
- Notes: Both-party raising supported per PRD; raised-by badge distinguishes source.

#### Dispute — Detail (Evidence + Context)
- Route: `/admin/disputes/:id`
- Surface/Tab: Admin · More → Disputes (detail)
- Purpose: Review parties, evidence, and booking context before resolving.
- Layout: AppBar (title "Dispute #ID"). Body: (1) Status header + raised-by. (2) **Parties** (Jajman & Pandit/team, links). (3) **Linked booking** summary card (status, amounts, link). (4) **Reason + description**. (5) **Evidence** thumbnail grid (images/docs, lightbox). (6) **Chat/context** transcript (read-only mock of in-app chat). (7) Sticky footer: **Resolve** -> outcome sheet. 
- Components: StatusBadge, RaisedByBadge, PartyCard, BookingRefCard, EvidenceGrid, Lightbox, ChatTranscript, PrimaryButton, OutcomeSheet, ConfirmSheet.
- States: loading-skeleton; default; error; no-evidence variant; resolved variant (footer replaced by outcome summary + audit).
- Data: reads [`dispute{full}`, `booking{ref}`, `users{parties}`, `chat{by booking}`]; writes [`dispute.status='under_review'` on open].
- Interactions: party/booking links -> details; evidence -> lightbox; Resolve -> outcome sheet.
- Notes: Opening a dispute auto-advances it to Under Review (logged).

#### Dispute — Resolve (Outcome)
- Route: `/admin/disputes/:id/resolve` (sheet)
- Surface/Tab: Admin · More → Disputes (resolution sheet)
- Purpose: Record an outcome and trigger settlement/refund.
- Layout: Outcome sheet: **outcome selector** [Refund Jajman (full/partial) · Release to Pandit · Split · No action], conditional amount field, resolution-note field (required), notify-both toggle, confirm CTA.
- Components: OutcomeSelector, CurrencyField, NoteField, SwitchToggle, PrimaryButton, ConfirmSheet, Toast.
- States: default; validation-error (amount required for refund/split); submitting; success (dispute→resolved, linked booking/refund/settlement updated).
- Data: reads [`dispute{full}`, `booking{money}`]; writes [`dispute.status='resolved'`, `dispute.outcome`, conditional `booking.refund`/`settlement`/`wallet`, `auditLog.append`, `notifications.toBoth(mock)`].
- Interactions: outcome change -> show/hide amount; Confirm -> mutate store (refund updates Jajman/pandit views, settlement adjusts wallet) -> back to detail showing resolved.
- Notes: Outcome math respects commission and the OQ2 refund framework but admin can override amounts with a logged note.

---

### Reports — Hub (Generate/Export)
- Route: `/admin/reports`
- Surface/Tab: Admin · More → Reports
- Purpose: Generate and export platform reports (mock export).
- Layout: AppBar (title "Reports"). Body: (1) **Date-range + scope filters** (range chips, optional category/city/role). (2) **Report-type cards**: Bookings, Revenue, Settlements, Users — each card shows a quick stat + "Generate" then "Export" (CSV/PDF mock). (3) **Recent exports** list (name, range, generated-at, "Download" stub). Bottom nav.
- Components: DateRangeChips, ScopeFilters, ReportTypeCard, GenerateButton, ExportMenu (CSV/PDF), RecentExportsList, EmptyState, SkeletonList, Toast, BottomNav.
- States: loading-skeleton; default; empty (no recent exports); error; generating (card spinner/progress); export-ready (toast "Export ready — download simulated" + entry added to Recent).
- Data: reads [`analytics.*`, `bookings[]`, `settlements[]`, `users[]`]; writes [`reports.exports.append(mock file)`].
- Interactions: filters -> scope reports; Generate -> compute preview from mock; Export CSV/PDF -> simulate file, add to Recent, toast; Recent item Download -> mock download toast.
- Notes: No real file I/O; exports are convincing mock artifacts listed in Recent.

---

### Settings — Admin
- Route: `/admin/settings`
- Surface/Tab: Admin · More → Settings
- Purpose: Configure platform-level admin options and account.
- Layout: AppBar (title "Settings"). Body grouped sections: (1) **Platform config**: Booking approval timeout — display "24 hours" with editable note/stub (OQ6); cancellation-window note (OQ2); emergency-surcharge note (OQ3). (2) **Broadcast / notifications** (placeholder): compose broadcast (title + message + audience: all/jajmans/pandits) -> "Send (simulated)"; notification channel prefs stub (mobile/WhatsApp). (3) **Admin profile**: name, email, change password (stub), theme toggle, language stub. (4) **Logout** (maroon). Bottom nav.
- Components: SectionHeader, ConfigRow (label+value+edit), TimeoutNote, BroadcastComposer, AudienceSelect, NotificationPrefsStub, ProfileFields, ThemeToggle, LanguageStub, LogoutButton, ConfirmSheet, Toast.
- States: default; loading (config fetch); saving (config edit); broadcast-sending (spinner) -> success toast ("Broadcast simulated to N users"); error; validation-error (empty broadcast).
- Data: reads [`config{approvalTimeout=24h,cancellationWindow,emergencySurcharge}`, `session.admin`]; writes [`config.*`, `broadcasts.append(mock)`, `session.adminAuth=false` (logout), `auditLog.append`].
- Interactions: edit config -> save (timeout countdown on pending requests references this value); Send broadcast -> confirm -> simulated send + toast; theme/language -> persist; Logout -> confirm -> `/admin/login`.
- Notes: OQ6 — the 24h approval timeout shown here is the source value for the pending-request countdowns in the Pandit Requests surface.

---

**Coverage summary (24 screens/states):** Admin Login · Dashboard/Analytics · Bookings List · Booking Detail · Users List · User Detail · More Hub · Verification Queue · Verification Detail · Catalog Overview · Categories CRUD · Puja Types CRUD · Custom Pujas Review · Commission List · Commission Create/Edit/View · Settlements Pending · Settlement Detail · Settlement History · Withdrawals List · Withdrawal Detail · Withdrawal History · Disputes Queue · Dispute Detail · Dispute Resolve · Reports Hub · Admin Settings. All OQ tie-ins covered: OQ1 (Verification approve/reject + reason), OQ2 (cancellation window + refund math in Booking/Dispute), OQ3 (emergency surcharge surfaced in Booking detail + Settings note), OQ4 (multi-pandit team rendering in Bookings), OQ5 (custom puja review with flagged additional charges), OQ6 (24h timeout config in Settings feeding Pandit countdowns).

---

## Cross-Cutting Specification — Data Model, State & Flows

> Companion to the per-surface screen specs. Defines the data model, state architecture, end-to-end flows, theming, i18n, responsive shell, accessibility, and build phasing for the interactive prototype. Stack: Vite + React + TS + Tailwind + zustand + react-router + lucide-react (+ recharts for admin). All data is in-memory mock; all side effects (SMS/payment/sockets) are simulated.

---

## Mock Data Model

All entities live in the in-memory `dataStore`. IDs are string ULIDs (`usr_…`, `bkg_…`, etc.). Money is integer **paise** internally, formatted to ₹ at the view layer to avoid float drift. Timestamps are ISO-8601 strings. Foreign keys are suffixed `Id`/`Ids`. The notation below is "TypeScript-ish" for spec clarity — not shipped code.

### Enums (shared vocabulary)

```
Role            = 'jajman' | 'pandit' | 'admin'
AppMode         = 'jajman' | 'pandit'                 // admin is a separate login, not a mode
Language        = 'en' | 'hi' | 'sa'                  // English / Hindi / Sanskrit
ThemePref       = 'light' | 'dark' | 'system'

BookingType     = 'single' | 'multi'
AssignmentMode  = 'build_team' | 'lead_brings_team'   // OQ4 A / B  (multi only)
BookingStatus   =
  | 'requested' | 'accepted' | 'advance_paid' | 'scheduled'
  | 'in_progress' | 'completed' | 'rated'             // happy path
  | 'rejected' | 'expired'                            // pre-acceptance terminal
  | 'cancelled' | 'refund_initiated' | 'refund_completed' // cancel path
  | 'disputed'                                         // dispute overlay state

RequestDecision = 'pending' | 'accepted' | 'rejected' | 'expired'

PanditVerifyState = 'incomplete' | 'pending_approval' | 'approved' | 'rejected' // OQ1

SlotKind        = 'manual' | 'recurring'
Weekday         = 0..6
LeaveType       = 'vacation' | 'festival' | 'personal' | 'block_dates' | 'block_slots'
TravelPref      = 'within_radius' | 'outside_radius' | 'anywhere_on_request'

AddressLabel    = 'home' | 'parents_home' | 'relative_home' | 'temple' | 'custom'

TxnType         = 'booking_credit' | 'commission_debit' | 'settlement_credit'
                | 'withdrawal_debit' | 'refund_debit' | 'referral_credit' | 'surcharge_credit'
TxnStatus       = 'pending' | 'cleared' | 'reversed'

WithdrawalStatus= 'requested' | 'processing' | 'paid' | 'failed'
SettlementStatus= 'pending' | 'settled' | 'on_hold'

DisputeStatus   = 'open' | 'evidence' | 'under_review' | 'resolved' | 'rejected'
DisputeParty    = 'jajman' | 'pandit'
ResolutionType  = 'refund_full' | 'refund_partial' | 'release_to_pandit' | 'split' | 'no_action'

NotifType       = 'booking' | 'payment' | 'request' | 'dispute' | 'system' | 'referral' | 'review'
NotifChannel    = 'in_app' | 'mobile' | 'whatsapp'    // mobile/whatsapp simulated

PhoneVisibility = 'shared' | 'hidden'                 // controls chat-only fallback
PujaCategoryKey = 'katha' | 'jaap' | 'marriage' | 'griha_pravesh' | 'festival' | 'shradh' | 'temple_ritual'
```

### User
The single-account root. One row per human; roles[] + modes drive what the app shows.
```
User {
  id: string
  fullName: string
  mobile: string                 // E.164-ish, used for OTP
  passwordSet: boolean           // mobile+password login supported; OTP always works
  photoUrl?: string
  roles: Role[]                  // e.g. ['jajman'] | ['jajman','pandit'] | ['admin']
  activeMode: AppMode            // current rendering mode (ignored for admin)
  languagePref: Language
  themePref: ThemePref
  notificationPrefs: { inApp: boolean; mobile: boolean; whatsapp: boolean; byType: Record<NotifType, boolean> }
  phoneVisibility: PhoneVisibility
  jajmanProfileId?: string       // 1:1
  panditProfileId?: string       // 1:1, present iff 'pandit' in roles
  referralCode: string           // own code to share
  referredByCode?: string
  createdAt: string
}
```

### JajmanProfile
```
JajmanProfile {
  id: string
  userId: string                 // 1:1 back-ref
  addressIds: string[]           // -> Address[]
  defaultAddressId?: string
  favoriteIds: string[]          // -> Favorite[] (or pandit ids; see Favorite)
  completedBookingsCount: number
  averageRatingGiven?: number
}
```

### PanditProfile
Public profile + service config + supported/custom pujas + derived reputation.
```
PanditProfile {
  id: string
  userId: string                 // 1:1
  verifyState: PanditVerifyState // OQ1 gate
  verifyRejectionReason?: string
  about: string
  experienceYears: number
  languages: Language[]
  specializations: string[]      // free-text tags e.g. 'Vedic', 'Rudrabhishek'
  city: string
  baseLocation: { lat: number; lng: number }
  // Service config
  serviceRadiusKm: number
  travelPref: TravelPref
  travelChargePerKm?: number      // applied at acceptance (OQ travel mgmt)
  // Supported pujas (from admin master)
  supportedPujas: SupportedPuja[]
  // Custom pujas (OQ5)
  customPujas: CustomPuja[]
  // Reputation (derived, but stored for prototype simplicity)
  ratingAvg: number
  ratingCount: number
  totalPujasCompleted: number
  responseRatePct: number         // % of requests answered before expiry
  responseTimeMins: number        // median accept/reject latency
  // Availability + leave
  availabilitySlotIds: string[]
  leaveIds: string[]
  // Emergency (OQ3)
  acceptsEmergency: boolean
  emergencySurchargePct: number   // e.g. 25
  emergencyWindowHours: number    // eligibility window before puja start (e.g. same-day <= 12h)
}

SupportedPuja {                   // pandit's config of a master PujaType
  pujaTypeId: string              // -> PujaType
  charge: number                  // pandit's price (within min/max of PujaType)
  durationMins: number            // may override PujaType.suggestedDurationMins
  enabled: boolean
}

CustomPuja {                      // OQ5 — not in admin master
  id: string
  name: string
  categoryKey: PujaCategoryKey
  description: string
  charge: number
  additionalCharge: number        // clearly flagged surcharge for being custom
  durationMins: number
  isCustom: true                  // flag for "Custom" badge in UI
}
```

### PujaCategory
```
PujaCategory {
  id: string
  key: PujaCategoryKey
  nameKey: string                 // i18n key
  iconKey: string                 // maps to lucide icon / motif
  pujaTypeIds: string[]
  sortOrder: number
}
```

### PujaType (admin master)
```
PujaType {
  id: string
  categoryId: string
  nameKey: string
  description: string
  suggestedDurationMins: number
  minAmount: number
  maxAmount: number
  defaultType: BookingType        // single vs multi default (e.g. Yagna -> multi)
  recommendedPanditCount?: number // for multi defaults
  active: boolean
}
```

### Booking
The central transactional entity. Holds full charge breakdown, lifecycle status, attachments, address snapshot, and multi-pandit assignment.
```
Booking {
  id: string
  jajmanId: string                // -> JajmanProfile
  type: BookingType
  // Puja reference (either master or custom)
  pujaTypeId?: string
  customPujaId?: string
  pujaNameSnapshot: string        // frozen at creation
  categoryKey: PujaCategoryKey
  // Pandit assignment
  leadPanditId: string            // primary pandit (single = the pandit)
  assignmentMode?: AssignmentMode // multi only (OQ4)
  teamPanditIds: string[]         // multi: full roster incl lead
  teamStatus?: Record<string, RequestDecision> // per-pandit accept state (build_team)
  // Schedule
  scheduledStart: string          // chosen slot
  scheduledEnd: string
  isEmergency: boolean            // OQ3
  // Location
  address: AddressSnapshot        // frozen copy of Address
  distanceKm: number
  // Charges breakdown (paise)
  charges: {
    base: number                  // sum of pandit charges
    customAddl: number            // OQ5 additional charge
    travel: number                // OQ travel, set at acceptance
    emergencySurcharge: number    // OQ3
    platformCutPctSnapshot: number// commission % frozen at booking
    subtotal: number
    total: number
  }
  advanceAmount: number           // required advance
  advancePaid: boolean
  remainingAmount: number
  remainingPaid: boolean
  // Lifecycle
  status: BookingStatus
  requestId?: string              // -> BookingRequest (24h)
  // Cancellation (OQ2)
  cancellation?: {
    by: 'jajman' | 'pandit'
    at: string
    windowClosesAt: string        // cancellation window shown in UI
    withinWindow: boolean
    refundAmount: number          // jajman-cancel = total - 5%; pandit-cancel = full
    cutAmount: number             // 5% on jajman-initiated; 0 on pandit
    reason?: string
  }
  // Attachments + notes
  attachmentIds: string[]         // -> Attachment[]
  notes?: string                  // parking, contact person, special requests
  contactPerson?: { name: string; phone: string }
  // Linkage
  chatThreadId?: string
  reviewIds: string[]
  disputeId?: string
  // Repeat/recurring
  rebookOfId?: string
  recurrence?: { interval: 'monthly' | 'quarterly' | 'annual'; nextDate: string }
  createdAt: string
  statusHistory: { status: BookingStatus; at: string; note?: string }[]
}

AddressSnapshot = Omit<Address, 'id'>
Attachment {
  id: string
  kind: 'image' | 'document'
  uri: string                     // data/placeholder URI
  label?: string                  // 'Invitation card', 'Venue photo'
  uploadedBy: 'jajman' | 'pandit'
}
```

### BookingRequest (24h expiry — OQ6)
Pre-acceptance object so the countdown + auto-expire is modeled cleanly.
```
BookingRequest {
  id: string
  bookingId: string
  panditId: string                // who must respond (per-pandit in build_team)
  decision: RequestDecision
  createdAt: string
  expiresAt: string               // createdAt + 24h; countdown source
  decidedAt?: string
  rejectionReason?: string
}
```

### AvailabilitySlot (manual + recurring)
```
AvailabilitySlot {
  id: string
  panditId: string
  kind: SlotKind
  // manual
  date?: string                   // e.g. 2026-06-10
  startTime?: string              // '09:00'
  endTime?: string                // '12:00'
  // recurring
  weekday?: Weekday               // e.g. Monday
  recStart?: string               // '09:00'
  recEnd?: string                 // '17:00'
  active: boolean
}
```

### Leave
```
Leave {
  id: string
  panditId: string
  type: LeaveType
  fromDate: string
  toDate?: string                 // for date ranges
  startTime?: string              // for block_slots
  endTime?: string
  reason?: string
}
```

### Address
```
Address {
  id: string
  ownerUserId: string
  label: AddressLabel
  customName?: string             // when label='custom'
  coords: { lat: number; lng: number }
  line1: string
  line2?: string
  city: string
  pincode: string
  notes?: string                  // parking, landmark
}
```

### ChatThread + Message (phone-visibility aware)
Chat unlocks at booking-request creation. If both parties' phoneVisibility = hidden, the "Call" affordance is replaced by chat-only messaging.
```
ChatThread {
  id: string
  bookingId: string
  participantUserIds: string[]    // [jajmanUserId, panditUserId]
  lastMessagePreview?: string
  lastMessageAt?: string
  unreadByUserId: Record<string, number>
  phoneSharedByUserId: Record<string, boolean> // resolved from each user's phoneVisibility
}

Message {
  id: string
  threadId: string
  senderUserId: string
  body?: string
  attachmentId?: string
  systemEvent?: 'request_sent' | 'accepted' | 'advance_paid' | 'completed' | 'cancelled' // inline status chips
  sentAt: string
  readBy: string[]
}
```

### WalletAccount + Transaction
One wallet per pandit; a platform wallet row models escrow.
```
WalletAccount {
  id: string
  ownerUserId: string             // pandit (or 'platform' sentinel)
  availableBalance: number
  pendingBalance: number          // advance held until completion / clearing
  totalEarnings: number
  withdrawnAmount: number
}

Transaction {
  id: string
  walletId: string
  bookingId?: string
  type: TxnType
  status: TxnStatus
  amount: number                  // signed by type
  note: string
  createdAt: string
}
```

### WithdrawalRequest
```
WithdrawalRequest {
  id: string
  panditUserId: string
  bankAccountId: string
  amount: number
  status: WithdrawalStatus        // requested -> processing -> paid | failed
  requestedAt: string
  updatedAt: string
  failureReason?: string
  settlementRecordId?: string
}
```

### BankAccount
```
BankAccount {
  id: string
  ownerUserId: string
  holderName: string
  accountNumberMasked: string     // '••••3421'
  ifsc: string
  bankName: string
  isPrimary: boolean
}
```

### SettlementRecord
Models booking payment -> platform wallet -> commission -> pandit wallet.
```
SettlementRecord {
  id: string
  bookingId: string
  panditUserId: string
  grossAmount: number
  commissionAmount: number
  netToPandit: number
  status: SettlementStatus
  settledAt?: string
  commissionRuleId: string
}
```

### CommissionRule
```
CommissionRule {
  id: string
  name: string
  scope: 'global' | 'category' | 'pandit'
  categoryKey?: PujaCategoryKey
  panditId?: string
  percent: number                 // e.g. 12
  active: boolean
  effectiveFrom: string
}
```

### Dispute (+ evidence, resolution)
```
Dispute {
  id: string
  bookingId: string
  raisedBy: DisputeParty
  raisedByUserId: string
  reasonCode: string              // 'pandit_no_show' | 'puja_incomplete' | 'wrong_info' | 'payment_issue' | 'other'
  description: string
  status: DisputeStatus
  evidence: Attachment[]
  resolution?: {
    type: ResolutionType
    refundAmount?: number
    releaseAmount?: number
    note: string
    resolvedByAdminUserId: string
    resolvedAt: string
    settlementRecordId?: string
  }
  createdAt: string
  timeline: { status: DisputeStatus; at: string; actor: 'jajman' | 'pandit' | 'admin' }[]
}
```

### Review (star / text / images)
```
Review {
  id: string
  bookingId: string
  authorUserId: string
  targetUserId: string            // pandit or jajman (mutual rating)
  direction: 'jajman_to_pandit' | 'pandit_to_jajman'
  stars: number                   // 1..5
  text?: string
  imageAttachmentIds: string[]
  createdAt: string
}
```

### Favorite
```
Favorite {
  id: string
  jajmanUserId: string
  panditId: string
  addedAt: string
}
```

### ReferralRecord
```
ReferralRecord {
  id: string
  referrerUserId: string
  refereeUserId?: string          // filled when referee signs up
  type: 'refer_jajman' | 'refer_pandit'
  code: string
  status: 'invited' | 'joined' | 'rewarded'
  rewardNote?: string             // future: wallet credit / cashback / coupon
  createdAt: string
}
```

### Notification
```
Notification {
  id: string
  userId: string
  type: NotifType
  channelsSimulated: NotifChannel[] // shows which channels "fired"
  titleKey: string
  body: string
  bookingId?: string
  disputeId?: string
  read: boolean
  createdAt: string
}
```

### Relationship summary
- `User` 1:1 `JajmanProfile`, 1:1 `PanditProfile` (optional), 1:1 `WalletAccount` (pandit), 1:N `Address`, `BankAccount`, `Notification`, `ReferralRecord`.
- `PanditProfile` 1:N `AvailabilitySlot`, `Leave`; embeds `SupportedPuja[]`, `CustomPuja[]`.
- `PujaCategory` 1:N `PujaType`; `PujaType` referenced by `SupportedPuja` and `Booking`.
- `Booking` N:1 `JajmanProfile`, N:1 lead `PanditProfile`, N:M team pandits; 1:1 `BookingRequest` (single) or 1:N (multi build_team); 1:1 `ChatThread`; 1:N `Attachment`, `Review`; 0:1 `Dispute`; 1:1 `SettlementRecord`.
- `WalletAccount` 1:N `Transaction`; `WithdrawalRequest` N:1 `BankAccount`, 0:1 `SettlementRecord`.
- `Dispute` N:1 `Booking`; resolution writes a `SettlementRecord` and/or refund `Transaction`.

---

## Seeded Data

Ships in `seed.ts`, loaded into `dataStore` on first run (and re-seeded via a hidden "Reset demo data" action in Admin > Settings and the dev menu).

- **Users (~24)**: 1 admin; 12 pandits (each with `PanditProfile` + `WalletAccount` + 1 `BankAccount`); 9 jajmans; **2 dual-role** users (jajman+pandit) to exercise the mode switcher. One pandit in `pending_approval`, one `rejected` (with reason), one `incomplete` (mid-onboarding); the rest `approved`.
- **Pandits (12)** spread across cities (Varanasi, Haridwar, Ujjain, Pune, Bengaluru, Delhi, Jaipur, Ahmedabad) and categories so every `PujaCategoryKey` has ≥2 specialists. Reputation varies: ratingAvg 3.6–4.9, ratingCount 4–210, responseRatePct 60–99, responseTimeMins 5–180, totalPujasCompleted 3–540. 4 accept emergency (surcharge 20–30%); 3 own at least one **custom puja** (flagged). Travel prefs mixed across all three values; service radius 5–40 km.
- **Puja master**: 7 categories, ~22 `PujaType`s (e.g. Satyanarayan Katha, Sundarkand Path, Maha Mrityunjaya Jaap [multi, rec 3], Ganesh Puja, Griha Pravesh, Marriage Vivah Sanskar [multi, rec 4], Pitru Shradh, Rudrabhishek). Each has suggested duration + min/max amount.
- **Bookings (~16)** — **at least one in every status**: requested (with live <24h countdown), accepted, advance_paid, scheduled, in_progress (one happening "today"), completed (awaiting rating), rated, rejected (with reason), expired (request lapsed), cancelled-by-jajman (refund −5% visible), cancelled-by-pandit (full refund), refund_initiated, refund_completed, disputed. Includes **2 multi-pandit**: one `build_team` (3 pandits, mixed per-pandit decisions), one `lead_brings_team` (lead + 2). One **emergency** same-day booking with surcharge line. One **rebook** and one **recurring (monthly)**.
- **Availability**: each pandit has 2–4 manual slots over the next 14 days + 1–2 recurring schedules; 3 pandits have active Leave (one vacation range, one festival day, one blocked slot).
- **Wallets**: balances span the range — e.g. one pandit available ₹0 / pending ₹15,000 (advance held), one available ₹42,500, one with a `failed` withdrawal, one `processing`, one `paid`. Transactions seeded to reconcile each balance.
- **Settlements**: ~8 records across pending/settled/on_hold; commission rules: 1 global (12%), 1 category override (Marriage 10%), 1 pandit override.
- **Disputes (3)**: one `open` (jajman: pandit_no_show, evidence uploaded), one `under_review`, one `resolved` (partial refund + settlement). 
- **Reviews (~30)** mutual across completed/rated bookings, mix of star values, ~6 with images, a few text-only and star-only.
- **Favorites**: each jajman 1–4 favorites. **Referrals**: 3 records (invited/joined/rewarded). **Notifications**: 6–10 per active user across all `NotifType`s, mix read/unread, channels showing in_app + simulated whatsapp.
- **Addresses**: each jajman 1–3 (Home always; some Temple/Parents Home).

A small **"demo time" clock** offset lets countdowns/"today" stay meaningful relative to `2026-06-20`.

---

## State Stores (zustand slices)

Four slices, composed into one store; all persisted selectively to `localStorage` (auth session, theme, language) while entity data resets from seed unless a "persist demo edits" dev flag is on.

### authStore
- **State**: `currentUserId | null`, `isAuthenticated`, `loginMethod: 'otp' | 'password' | null`, `otpPending: { mobile; codeSent: boolean; mockCode: string }`, `isAdminSession`.
- **Actions**: `requestOtp(mobile)` (generates + "sends" a visible mock code), `verifyOtp(code)`, `loginWithPassword(mobile, pwd)`, `signupJajman(payload)`, `startPanditOnboarding()`, `logout()`, `adminLogin(creds)`.
- **Selectors**: `selectCurrentUser()`, `selectRoles()`, `selectIsPandit()`, `selectIsAdmin()`.

### sessionStore (mode)
- **State**: `activeMode: AppMode`, `canSwitchMode` (true iff user has both roles), `lastTab: Record<AppMode | 'admin', string>`.
- **Actions**: `setMode(mode)` (guards on roles; routes to that surface's last/home tab), `becomePandit()` (adds 'pandit' role → onboarding), `rememberTab(surface, route)`.
- **Selectors**: `selectActiveSurface()` (jajman/pandit/admin), `selectBottomTabs()`.

### dataStore (entities + mutations)
- **State**: normalized maps per entity (`users`, `panditProfiles`, `bookings`, `bookingRequests`, `wallets`, `transactions`, `disputes`, `reviews`, `notifications`, …) + indexes (`bookingsByJajman`, `bookingsByPandit`, `requestsByPandit`, `threadsByUser`).
- **Read selectors** (memoized): `selectPanditsBy({ city, category, pujaTypeId, priceRange, minRating, availableOn, maxDistanceKm, acceptsEmergency })`, `selectBookingsForMode(userId, mode, statusFilter)`, `selectPendingRequests(panditId)`, `selectWalletSummary(panditUserId)`, `selectEarningsSeries(panditUserId, range)`, `selectAdminKpis()`, `selectAlternateSuggestions(failedBooking)`.
- **Booking mutations**: `createBookingRequest(draft)` (creates Booking `requested` + BookingRequest(s) with `expiresAt=+24h`, opens ChatThread, fires notifications), `panditAccept(reqId, { travelCharge })` → `accepted` (sets travel charge per OQ travel), `panditReject(reqId, reason)` → `rejected`, `expireRequest(reqId)` → `expired`, `payAdvance(bookingId)` → `advance_paid` (+ wallet pending credit, settlement pending), `markScheduled`, `startPuja` → `in_progress`, `completePuja` → `completed`, `payRemaining` → settlement clears, `submitReview` → `rated`.
- **Cancellation (OQ2)**: `cancelBooking(bookingId, by, reason)` computes window (`withinWindow`), refund (`jajman` ⇒ total − 5%, sets `cutAmount`; `pandit` ⇒ full), writes `refund_initiated` → tick → `refund_completed`, reverses wallet/settlement.
- **Multi (OQ4)**: `buildTeamAdd/Remove(panditId)`, `setAssignmentMode(mode)`, `leadProposeTeam(bookingId, memberIds)`; team acceptance gates `accepted`.
- **Emergency (OQ3)**: `evaluateEmergencyEligibility(pujaStart, pandit)` (within `emergencyWindowHours`) and `applyEmergencySurcharge`.
- **Custom puja (OQ5)**: `createCustomPuja(panditId, payload)` (sets `isCustom`, `additionalCharge`).
- **Availability/leave**: `addSlot`, `removeSlot`, `addLeave`, `removeLeave`.
- **Pandit verification (OQ1)**: `submitForApproval(panditId)` → `pending_approval`; admin `approvePandit(panditId)` / `rejectPandit(panditId, reason)`.
- **Wallet/withdrawal**: `requestWithdrawal(amount, bankId)` → `requested`→`processing`→`paid|failed` (timed mock ticks), `addBankAccount`, `setPrimaryBank`.
- **Disputes**: `raiseDispute`, `addEvidence`, `adminResolveDispute(resolution)` (writes refund/settlement).
- **Misc**: `toggleFavorite`, `rebook`, `setRecurrence`, `sendMessage`, `setPhoneVisibility`, `markNotificationRead`, `createReferral`, admin `upsertCategory/Puja/CommissionRule`, `resetDemoData()`.
- **Simulation engine**: a `tick()` driver (interval) advances time-based things — request countdowns, withdrawal status, refund completion — so flows feel live without a backend.

### uiStore
- **State**: `theme: ThemePref`, `resolvedTheme: 'light'|'dark'`, `language: Language`, `toasts: Toast[]`, `activeModal`, `sheetStack`, `globalLoading`, `connectivitySim: 'online'|'offline'` (to trigger error states for demo).
- **Actions**: `setTheme`, `cycleTheme`, `setLanguage`, `pushToast`, `dismissToast`, `openSheet/closeSheet`, `simulateError(scope)`.
- **Selectors**: `selectTokens()` (resolved CSS-var set), `selectIsRTL()` (false for all three langs but stubbed).

---

## Key End-to-End Flows

### 1) Jajman single booking — happy path
1. **Explore** (`/explore`) → filter (category=Katha) → tap pandit → **Pandit Profile** (`/pandit/:id`).
2. Tap **Book** → **Booking Wizard** step 1: pick Puja (Satyanarayan Katha) → step 2: date/time from pandit slots → step 3: address (saved or new) → step 4: attachments + notes/contact → step 5: **Review & Charges** (base + travel TBD + advance shown).
3. `createBookingRequest` → Booking `requested`, BookingRequest `expiresAt=+24h`, ChatThread opens. Toast "Request sent". Appears in **Bookings > Active** with countdown.
4. Pandit (Requests tab) accepts, optionally setting travel charge → Booking `accepted`; jajman notified.
5. Jajman opens booking → **Pay Advance** (mock gateway sheet) → `payAdvance` → `advance_paid`; wallet pending credit to pandit; settlement `pending`.
6. Time passes → `scheduled` → on the day pandit taps Start → `in_progress` → Complete → `completed`.
7. Jajman **Pay Remaining** → settlement clears (commission deducted, net → pandit available balance).
8. Both prompted to **Rate** → `submitReview` ×2 → `rated`. Booking moves to history; pandit reputation recomputed.

### 2) Cancellation + refund (−5%, window — OQ2)
1. On a booking in `accepted`/`advance_paid`/`scheduled`, **Booking Detail** shows a **Cancellation window** banner (`windowClosesAt`, withinWindow yes/no).
2. Jajman taps **Cancel** → confirm sheet shows refund math: `refund = total − 5%`, with the 5% cut line itemized. Confirm → `cancelBooking('jajman')` → `refund_initiated`.
3. Wallet/settlement reversed (pandit pending reversed, platform retains 5%) → tick → `refund_completed`; notifications + toast.
4. **Pandit-initiated** variant: pandit cancels → **full refund** to jajman (no 5% cut); jajman offered **Alternate suggestions** (similar/nearby/same-puja pandits) to rebook.

### 3) Multi-pandit — A (build team) & B (lead brings team — OQ4)
- **Chooser** appears when selected puja is multi (e.g. Maha Mrityunjaya Jaap): "Build your own team" vs "Book a lead pandit who brings the team".
- **A — Build team**: jajman adds N pandits (each must support the puja + be available) → one Booking, N BookingRequests; **Team status** screen shows per-pandit pending/accepted/rejected. Booking advances to `accepted` only when all accept (rejected member → prompt to replace, with suggestions). Charges = sum of members + travel each.
- **B — Lead brings team**: jajman books a single **lead** pandit, sets `assignmentMode='lead_brings_team'` and team size; lead accepts and **proposes team** (`leadProposeTeam`) shown to jajman as roster (read-only). Single advance covers the team; lead handles internal split (out of scope, noted in UI).

### 4) Emergency / urgent booking with surcharge (OQ3)
1. In Explore/Wizard, an **Urgent (same-day)** toggle is offered only when pandit `acceptsEmergency` and chosen start is within `emergencyWindowHours`.
2. `evaluateEmergencyEligibility` gates the toggle; if outside window, toggle disabled with helper text.
3. Enabling it sets `isEmergency` and adds `emergencySurcharge` (pct of base) to the breakdown, clearly flagged with an "Emergency surcharge" line + tooltip.
4. Request flows as normal but is **prioritized** in the pandit Requests list (Urgent badge) and the 24h countdown is visually compressed to "respond ASAP".

### 5) Pandit onboarding → Pending Approval → Admin approves (OQ1)
1. User in Profile taps **Become a Pandit** → `becomePandit` adds role → **Onboarding Wizard**: about, experience, languages, specializations, city/location, service radius + travel pref, supported pujas + charges, availability, (optional) document upload, emergency settings.
2. Submit → `submitForApproval` → `verifyState='pending_approval'`; Pandit surface shows a **Pending Admin Approval** gated state (dashboard locked, can preview profile).
3. **Admin > Verifications** queue lists pending pandits → open → **Approve** or **Reject + reason**. Approve → `approved` (pandit unlocked, notification). Reject → `rejected` with reason shown to pandit + **Resubmit** path.

### 6) Earnings settlement + withdrawal
1. As bookings complete + remaining paid, `SettlementRecord` clears: gross → commission (`CommissionRule`) → `netToPandit` posted to **available balance** (pending → available).
2. **Earnings** tab shows available/pending/total/withdrawn + recharts series + transaction list.
3. Pandit taps **Withdraw** → choose amount ≤ available + bank → `requestWithdrawal` → `requested`; simulation ticks → `processing` → `paid` (debits available, increments withdrawn) or `failed` (with reason, funds returned). Settlement history + withdrawal statuses visible.

### 7) Dispute → evidence → admin resolve → settlement/refund
1. On a completed/in-progress booking, either party taps **Raise dispute** → pick reason code + description → `raiseDispute` → Dispute `open`, Booking flagged `disputed`.
2. Both parties can **add evidence** (images/docs) → status `evidence`/`under_review`.
3. **Admin > Disputes** opens case, reviews timeline + evidence → **Resolve**: choose ResolutionType (full/partial refund, release to pandit, split, no action) + note.
4. Resolution writes a refund `Transaction` and/or `SettlementRecord`; balances/refunds update; Dispute `resolved`; both notified. (Reject → `rejected` with note.)

---

## Internationalization

- **Approach**: a tiny `t(key, vars?)` helper backed by `messages/{en,hi,sa}.ts` keyed dictionaries. English is the complete source of truth; Hindi & Sanskrit ship as **stubs** — common nav/CTA/status keys translated for demo, missing keys **fall back to English** (and dev-log a warning). No heavy i18n lib; just a context-provided dictionary + interpolation (`{count}`, `{amount}`).
- **Key namespacing**: `nav.*`, `cta.*`, `status.booking.*`, `puja.category.*`, `field.*`, `toast.*`, `empty.*`, `error.*`. Entities store **i18n keys** (`nameKey`, `titleKey`) not literal strings where they map to known vocabulary; user-generated text (reviews, notes) is never translated.
- **Language switcher**: in Profile + onboarding; updates `uiStore.language` and `User.languagePref`; persisted. Numbers/currency formatted via `Intl.NumberFormat('en-IN' | 'hi-IN')`; dates via `Intl.DateTimeFormat`.
- **Devanagari font fallback**: token-defined font stack `--font-sans: 'Inter', system-ui, 'Noto Sans', sans-serif` with a `--font-deva: 'Noto Sans Devanagari', system-ui, sans-serif` applied when `language ∈ {hi, sa}` (via a `lang`/`data-lang` attribute on `<html>` + a Tailwind variant). Sanskrit reuses the Devanagari stack. RTL not needed (stubbed false).

---

## Theming & Dark Mode

- **Tokens**: defined as CSS custom properties on `:root` (light) and `.dark` (dark), surfaced to Tailwind via `theme.extend.colors` referencing the vars. Palette: primary saffron/amber, secondary deep maroon, accent gold, surfaces cream/sand (light) → warm charcoal/espresso (dark). Token groups: `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-primary[/-fg]`, `--color-secondary`, `--color-accent`, `--color-text[/-muted]`, `--color-border`, `--color-success/-warn/-danger`, plus radii, shadows, and the two font stacks. Devotional motifs (kalash/diya line art, soft saffron→gold gradients) are token-tinted SVGs that adapt per theme.
- **Toggle behavior**: `uiStore.theme ∈ {light, dark, system}`; a 3-state toggle in Profile + a quick toggle in the app bar overflow. `system` resolves via `prefers-color-scheme` and live-updates on OS change. Resolved theme sets `.dark` class on `<html>`.
- **Persistence**: `theme` persisted to `localStorage` and mirrored to `User.themePref`; restored before first paint (inline pre-hydration script) to avoid flash. Default = `system`.

---

## Responsive / Phone-Frame

- **Phone-frame shell**: all surfaces (incl. admin) render inside a centered device frame. On **desktop** (≥ `md`): a fixed-width column (`min(420px, 100vw)`, target ~390–420px) centered with a soft device bezel, drop shadow, status-bar faux, and a warm page backdrop (subtle motif) filling the rest of the viewport. The frame has its own scroll container; bottom-nav sits pinned inside the frame.
- **Real mobile** (< `md`): the bezel/backdrop drop away and the app goes **edge-to-edge full-bleed**, respecting safe-area insets (`env(safe-area-inset-*)`). The bottom nav docks to the device bottom.
- **Implementation note**: a single `<PhoneFrame>` wrapper applies max-width + frame chrome at `md+` and full-bleed below; inner content always assumes a ~390–420px logical width, so screens are designed once. Internal wide content (tables/charts in admin) lives in `overflow-x-auto` containers so the frame body never scrolls horizontally.

---

## Accessibility

- **Tap targets**: interactive elements ≥ 44×44 px; bottom-nav items full-height with generous hit area; spacing prevents mis-taps.
- **Contrast**: tokens tuned to WCAG AA (≥ 4.5:1 body, ≥ 3:1 large/icon) in both themes; saffron-on-cream and gold accents validated; never rely on color alone for status (status uses label + icon + color).
- **Labels & semantics**: semantic landmarks (`header`/`nav`/`main`), `aria-label` on icon-only buttons (lucide icons are decorative `aria-hidden` with adjacent labels), form fields with associated labels + error text via `aria-describedby`, live-region `aria-live="polite"` for toasts and countdown updates.
- **Focus**: visible focus ring (token-based), logical tab order, focus trap in modals/sheets with restore-on-close, `Esc` closes sheets. Bottom-nav exposes `aria-current="page"`.
- **Motion/state**: skeletons announce loading via `aria-busy`; respects `prefers-reduced-motion` (disable gradient/motif animation). Text scales with `rem`; layout tolerates 200% zoom within the frame.

---

## Implementation Phasing

**P0 — Scaffold + design system + app shell + ONE sample screen (look sign-off)**
- Vite + React + TS + Tailwind + zustand + react-router + lucide-react set up; recharts added.
- Design tokens (light/dark CSS vars) + Tailwind mapping; font stacks incl. Devanagari fallback.
- Core DS components: Button, Card, Tag/Badge, StatusPill, ListItem, Avatar, Input/Select, Sheet/Modal, Toast, Skeleton, EmptyState, ErrorState, AppBar, BottomNav, PhoneFrame, MotifBackdrop.
- App shell with `<PhoneFrame>`, theme toggle, language stub wired.
- **One polished sample screen** (Jajman Home) with mock data for visual sign-off.

**P1 — Auth + Jajman core booking**
- Seed data v1 + dataStore (entities + core mutations) + simulation tick.
- Auth: OTP + password login, jajman signup. authStore/sessionStore.
- Jajman: Home, Explore (filters), Pandit Profile, **Booking Wizard** (single), Bookings list + Booking Detail, Pay Advance/Remaining (mock), basic statuses. Flow (1) working end-to-end.

**P2 — Jajman secondary**
- Favorites + rebook/recurring, Addresses CRUD, Chat (phone-visibility), Reviews (create/view), Notifications, Disputes (raise + evidence), Cancellation flow (OQ2), Emergency toggle (OQ3), Alternate suggestions, Profile + mode switcher entry.

**P3 — Pandit**
- Pandit onboarding → Pending Approval (OQ1), Dashboard, Requests (accept/reject + travel charge, 24h countdown OQ6), Calendar (availability manual+recurring, leave), supported + **custom pujas** (OQ5), Earnings + wallet + withdrawal + bank, multi-pandit acceptance (OQ4 A/B), rate jajman, pandit-side disputes.

**P4 — Admin**
- Admin login + surface; Dashboard KPIs (recharts), Bookings mgmt, Users mgmt, More menu: Verifications (approve/reject), Pujas & Categories CRUD, Commission rules, Settlements, Withdrawals, Disputes resolution, Reports, Settings (incl. reset demo data).

**P5 — Polish**
- Dark mode pass across all screens, complete loading/empty/error states everywhere, i18n stub (hi/sa keys + switcher + Devanagari), accessibility pass (focus/contrast/labels/reduced-motion), motif refinement, micro-interactions, final seed tuning so every status/edge case is reachable.

---

## Screen Count Summary

| Surface | Approx. screens | Coverage |
|---|---|---|
| **Shared / Auth** | ~8 | Splash, Onboarding intro, OTP login, Password login, Signup, Language/Theme settings, Mode switcher, Generic error/offline |
| **Jajman** | ~22 | Home, Explore + Filters, Pandit Profile, Booking Wizard (5 steps incl. multi chooser + emergency), Team Status, Review & Charges, Bookings list, Booking Detail, Pay Advance, Pay Remaining, Cancellation, Favorites, Addresses (list/edit), Chat list + thread, Reviews, Notifications, Raise Dispute + evidence, Profile, Referrals |
| **Pandit** | ~20 | Onboarding Wizard (multi-step), Pending Approval, Dashboard, Requests list + Request detail (accept/reject/travel), Calendar, Availability editor, Leave, Supported Pujas, Custom Puja editor, Earnings, Wallet, Withdrawal, Bank accounts, Settlement history, Rate Jajman, Disputes, Profile, Reviews received |
| **Admin** | ~16 | Dashboard, Bookings, Booking detail, Users, User detail, Verifications queue + detail, Pujas & Categories (list/edit), Commission rules, Settlements, Withdrawals, Disputes list + resolution, Reports, Settings |
| **Total** | **~66 screens** | plus loading/empty/error variants per screen |

---

This cross-cutting spec is the source of truth for the data model, stores, flows, and build order; the per-surface screen specs reference these entity/field names, mutation names, status enums, and token names verbatim. All locked decisions and resolved open questions (OQ1–OQ6) are reflected above.

---

## Resolved Open Questions (authoritative)
- **OQ1 Pandit Verification → Admin Approval.** Pandit onboarding ends in a "Pending Admin Approval" state; admin approval queue with approve/reject + reason. Document upload optional, not the gate.
- **OQ2 Cancellation → Both parties can cancel.** Jajman-initiated refund = amount − 5% cut; no penalty (early stage); a visible cancellation window applies. Pandit-initiated cancel → full refund to Jajman.
- **OQ3 Emergency Booking → Supported.** Urgent same-day booking with an emergency surcharge and an eligibility time window.
- **OQ4 Multi-Pandit → Both A & B.** Jajman can build their own team (pick each pandit) OR book a lead pandit who brings the team (chooser provided).
- **OQ5 Custom Puja → Allowed with additional charges.** Pandit can create a custom puja not in the admin master, flagged with additional charges; visible to admin.
- **OQ6 Approval Timeout → 24 hours.** Pending requests show a 24h countdown and auto-expire.

---

## Appendix A — Additional & Reconciled Screens

### Pandit Chat list
- Route: `/pandit/chat`
- Surface/Tab: Pandit surface; reachable from Pandit dashboard / Requests / Booking detail (not a primary bottom tab unless configured).
- Purpose: List of the pandit's active chat threads with Jajmans.
- Layout: AppBar ("Messages"); body = search/filter row + scrollable thread list (PanditMiniHeader-style row per thread: Jajman avatar/name, last message preview, timestamp, unread Badge, linked puja/booking chip); BottomTabBar (Pandit tabs).
- Components: AppBar, SearchBar, ListRow, Avatar, Badge, EmptyState, SkeletonList, BottomTabBar.
- States: default (threads sorted by last activity); loading-skeleton (SkeletonList); empty ("No conversations yet"); error (retry); variant — thread tied to a disputed booking shows a "Disputed" badge.
- Data: reads [ChatThread.{id,bookingId,participantIds,lastMessage,unreadCount,updatedAt}, Booking.{id,pujaId,isDisputed}, User.{name,avatar}]; writes [none on list].
- Interactions: tap thread → `/pandit/chat/:threadId`; pull-to-refresh → reload; tap linked booking chip → `/pandit/bookings/:id`.
- Notes: Threads are opened by `threadId` only (§0.1). If entered from a booking, resolve `Booking.chatThreadId` first.

### Pandit Chat thread
- Route: `/pandit/chat/:threadId`
- Surface/Tab: Pandit surface; thread detail.
- Purpose: Conversation with a Jajman, with phone-visibility control and attachments.
- Layout: AppBar with PanditMiniHeader (Jajman name/avatar + linked booking) and overflow menu; body = scrollable message list (text + attachment bubbles); sticky composer (text field, attach button, send); a phone-visibility control surfaced in header overflow / inline banner.
- Components: AppBar, PanditMiniHeader, ListRow (message bubble), Avatar, Sheet (attachment picker), Toast, Button, BottomSheet (phone-visibility), Badge.
- States: default; loading-skeleton (message shimmer); empty ("Say namaste 🙏"); error (send-failed retry on a bubble); variants — phone shared (number chip visible) vs hidden (masked "Share number?" prompt); attachment uploading/failed.
- Data: reads [ChatThread, ChatMessage.{id,senderId,text,attachments,sentAt}, Booking.{phoneShared,chatThreadId}, User.phone]; writes [ChatMessage(create), Attachment(uploadedBy='pandit'), Booking.phoneShared(toggle)].
- Interactions: send text → append message; attach → Sheet → mock upload → attachment bubble; toggle phone-share → updates `Booking.phoneShared` (per-booking override, §0.9) → Toast; tap booking chip → `/pandit/bookings/:id`.
- Notes: Phone visibility is booking-scoped (§0.9). Email/push notifications about new messages are disabled (§0.5). Mirrors the Jajman chat thread.

### Receipt / Invoice detail
- Route: `/app/receipt/:bookingId`
- Surface/Tab: Jajman surface; reached from Booking detail (completed/paid) and from Payment success.
- Purpose: Show the final invoice — line items, charges breakdown, commission note, amounts paid, with a mock download.
- Layout: AppBar ("Receipt"); body top→bottom = booking header (PanditMiniHeader + puja, date, booking id), MoneyBreakdown (base, travel, emergency surcharge if any, subtotal, advance paid, remaining paid, total paid), platform commission note line, payment method + timestamps; primary CTA "Download PDF (mock)" + "Share" (sticky/footer).
- Components: AppBar, PanditMiniHeader, MoneyBreakdown, Card, ListRow, Button, Toast.
- States: default (fully paid); loading-skeleton; error; variants — partially paid (shows outstanding remaining), refunded (shows RefundBreakdown line with platform cut per §0.3), emergency (surcharge line present).
- Data: reads [Booking.{id,pujaId,charges,amountPaid,advanceAmount,remainingAmount,commissionAmount,payments[],cancellation}, Pandit.{name,avatar}, pricingConfig]; writes [none — download is a mock].
- Interactions: "Download PDF (mock)" → Toast "Receipt downloaded (demo)"; "Share" → mock share sheet; back → Booking detail.
- Notes: Commission note states platform commission per `CommissionRule` (informational; commission is on the platform↔pandit settlement, not an extra charge to the Jajman). Refund variant uses "amount paid" copy (§0.3). Mock download is a stubbed affordance (Appendix B).

### Jajman Team Status
- Route: `/app/bookings/:id/team`
- Surface/Tab: Jajman surface; sub-screen of Booking detail (multi-pandit Path A bookings only).
- Purpose: Track each pandit in a multi-pandit package — accept / reject / pending — with countdowns.
- Layout: AppBar ("Team status"); body = TeamPackagePanel summary (roles & counts), then a list of pandit slots, each row: PanditMiniHeader + role + status pill (pending/accepted/rejected) + Countdown to that slot's `expiresAt`; overall progress header ("3 of 4 confirmed"); footer note / CTA if action needed (e.g., "Replace pandit" when one rejects).
- Components: AppBar, TeamPackagePanel, PanditMiniHeader, Badge/Chip (status pill), Countdown, ListRow, Button, EmptyState.
- States: default (mixed statuses); loading-skeleton; error; variants — all accepted (green "Team confirmed", advance becomes payable), one+ rejected (prompt to replace or cancel), one+ expired (per-slot expiry), fully expired (whole request expired → booking `expired`).
- Data: reads [Booking.{id,teamSlots[]}, BookingRequest.{panditId,status,expiresAt,role}, Pandit.{name,avatar,rating}]; writes [trigger replace-pandit (re-request), cancel package].
- Interactions: per-slot Countdown ticks to `expiresAt`; on reject/expiry → "Find replacement" → search filtered to role → re-request; "Cancel booking" → Cancel flow (RefundBreakdown); when all accepted → CTA "Pay advance" → `/app/pay/*`.
- Notes: Per-slot expiry follows §0.7 (emergency formula applies if the package is urgent). Path A = pre-composed multi-pandit team.

### Manage Recurring
- Route: `/app/recurring`
- Surface/Tab: Jajman surface; entry from Profile/Settings and from a completed booking's "Make this recurring".
- Purpose: List active recurring series with pause / edit / cancel; drill into a recurring detail.
- Layout: AppBar ("Recurring pujas"); body = list of RecurringSeries cards (puja + pandit PanditMiniHeader, interval chip, nextDate, status pill active/paused); each card overflow → Pause/Resume, Edit, Cancel. Recurring detail (same route, expanded card or `/app/recurring` → detail panel) shows interval, endCondition, nextDate, generated bookings list.
- Components: AppBar, Card, PanditMiniHeader, Chip, ListRow, Sheet (actions), Button, EmptyState, SkeletonList, Toast.
- States: default (active series); loading-skeleton; empty ("No recurring pujas yet"); error; variants — paused series (greyed, "Resume"), ended series (read-only history), pandit no longer available (warning + reassign).
- Data: reads [RecurringSeries.{id,panditId,pujaId,interval,endCondition,nextDate,status,generatedBookingIds}, Puja, Pandit]; writes [RecurringSeries.status(pause/resume), RecurringSeries(edit interval/nextDate), RecurringSeries(cancel)].
- Interactions: Pause → status='paused' + Toast; Resume → status='active'; Edit → sheet to change interval/nextDate; Cancel → confirm → status='cancelled'; tap a generated booking → `/app/bookings/:id`.
- Notes: Each occurrence spawns a normal Booking via `generatedBookingIds` (§Appendix B). Editing affects future occurrences only.

### Admin Audit Log
- Route: `/admin/audit`
- Surface/Tab: Admin surface; reachable from `/admin/more` and `/admin/settings`.
- Purpose: Filterable list of admin & financial actions for accountability.
- Layout: AppBar ("Audit log"); filter bar (actor, action type, entity type, date range); scrollable list — each row: actor, action, entityType/entityId, timestamp, expandable details; tap row → details sheet (full `details` JSON-ish view).
- Components: AppBar, SearchBar, Chip (filters), ListRow, Sheet (details), EmptyState, SkeletonList, BottomTabBar (Admin tabs).
- States: default (reverse-chronological); loading-skeleton; empty ("No matching audit entries"); error; variant — financial actions (settlements, withdrawals, commission changes) visually flagged.
- Data: reads [AuditLog.{id,actorId,action,entityType,entityId,timestamp,details}, User.{name,role}]; writes [none — read-only].
- Interactions: apply filters → re-query; tap entry → details sheet; deep-link from an entity (e.g., a settlement) → pre-filtered by `entityId`.
- Notes: Entries are appended by mutations across Admin (verification decisions, commission edits, settlement holds/releases, withdrawal approvals, dispute resolutions). Read-only; never editable.

### Help / Support (shared)
- Route: `/app/help` and `/pandit/help`
- Surface/Tab: Jajman and Pandit surfaces; one shared screen rendered under both bases.
- Purpose: FAQ browsing + contact-support via a mock ticket.
- Layout: AppBar ("Help & support"); body = SearchBar over FAQs, FAQ accordion sections (grouped by topic), then "Still need help?" → "Contact support" Button opening a ticket Sheet (subject, category, message, optional attachment); contact rows (phone/WhatsApp — gated by §0.5 active channels).
- Components: AppBar, SearchBar, ListRow (accordion), Sheet (ticket form), Button, Toast, EmptyState.
- States: default (FAQ list); loading-skeleton; empty (no FAQ search results → "Contact support"); error; variant — ticket submitting/submitted ("Ticket #1234 created (demo)").
- Data: reads [FaqEntry.{id,topic,question,answer}]; writes [SupportTicket(create — mock)].
- Interactions: expand FAQ; search filters FAQs; "Contact support" → ticket Sheet → submit → Toast with mock ticket id; WhatsApp/SMS contact → mock deep-link (active channels only).
- Notes: Email/push contact disabled (§0.5). Same component tree under `/app/help` and `/pandit/help`; surface inferred from route base for the BottomTabBar config and back target.

### Change Password
- Route: `/auth/change-password`
- Surface/Tab: Auth zone; reached from Settings (any surface) and from `/auth/forgot` completion.
- Purpose: Change the account password (current → new → confirm), or set a new one after forgot-flow.
- Layout: AppBar ("Change password"); body = current-password field (hidden when arriving from forgot-reset token), new-password + confirm fields with strength hint, rules helper; primary CTA "Update password".
- Components: AppBar, TextField (secure), Button, Toast, inline validation.
- States: default; loading (submitting); error (wrong current password / mismatch / weak); success (Toast + redirect); variant — reset mode (no current-password field).
- Data: reads [none sensitive]; writes [User.password (mock)].
- Interactions: submit → validate → mock update → Toast "Password updated" → back to Settings (or `/auth/login` in reset mode).
- Notes: Pairs with **change-mobile → OTP re-verify stub**: changing mobile in Settings routes to `/auth/otp` (re-verify mode); on success updates `User.phone`. OTP re-verify is a stub (auto-accepts a demo code).

### Not Found (404)
- Route: catch-all `*` (rendered inside the phone frame)
- Surface/Tab: Any surface; fallback route.
- Purpose: Handle unknown routes gracefully within the device frame.
- Layout: Centered EmptyState (illustration, "Page not found", short copy); primary CTA "Go home" (routes to the active surface's home via `RootRedirect` logic); secondary "Go back".
- Components: EmptyState, Button.
- States: default only.
- Data: reads [auth/session to pick home target]; writes [none].
- Interactions: "Go home" → `/app/home` | `/pandit/dashboard` | `/admin/dashboard` depending on session; "Go back" → history back.
- Notes: Stays inside the phone frame (no full-page browser 404).

### Offline / Connectivity Error
- Route: not a route — a global overlay driven by `uiStore.connectivitySim`
- Surface/Tab: Any surface; modal overlay.
- Purpose: Simulate and communicate loss of connectivity.
- Layout: Full-frame overlay (or top banner) with icon, "You're offline", "Retry" Button; underlying screen dimmed.
- Components: EmptyState/Banner, Button, Toast.
- States: default (hidden); offline (overlay shown when `uiStore.connectivitySim === 'offline'`); reconnecting (spinner on Retry).
- Data: reads [uiStore.connectivitySim]; writes [uiStore.connectivitySim (Retry → 'online')].
- Interactions: Retry → set `connectivitySim='online'` → dismiss overlay → re-run last fetch (mock). A dev/demo toggle in Settings flips `connectivitySim`.
- Notes: Purely simulated; backed by `uiStore`, not real network state.

### Pandit Pending Approval (gating)
- Route: `/pandit/pending-approval`
- Surface/Tab: Pandit surface; gating screen (replaces dashboard while `status==='pending'`).
- Purpose: Inform a freshly-onboarded pandit that their profile is under review.
- Layout: AppBar ("Application under review"); body = status illustration + "Your profile is being reviewed" + submitted-details summary + expected-timeline note; secondary actions "Edit application" (→ onboarding), "Help" (→ `/pandit/help`); footer ModeSwitcher hint "Switch back to Jajman".
- Components: AppBar, EmptyState/Card, Button, ModeSwitcher, ListRow.
- States: default (pending); loading; variant — additional info requested (shows what's needed + "Update").
- Data: reads [PanditProfile.{status,submittedAt,fields}, user.roles]; writes [none here].
- Interactions: "Edit application" → `/pandit/onboarding/*`; "Switch to Jajman" → ModeSwitcher → `/app/home`; on approval (mock/admin action) → auto-route to `/pandit/dashboard`.
- Notes: Reached because `'pandit' ∈ roles` but `status==='pending'` (§0.6). Pandit guard enforces this for all `/pandit/*` except gating/onboarding/help/settings/profile.

### Pandit Rejected (gating)
- Route: `/pandit/rejected`
- Surface/Tab: Pandit surface; gating screen (replaces dashboard while `status==='rejected'`).
- Purpose: Communicate rejection with reason and a path to re-apply.
- Layout: AppBar ("Application not approved"); body = reason card (`PanditProfile.rejectionReason`), guidance, primary CTA "Re-apply / Edit & resubmit" (→ onboarding, which re-sets status to 'pending' on submit), secondary "Contact support" (→ `/pandit/help`); ModeSwitcher hint.
- Components: AppBar, Card, EmptyState, Button, ModeSwitcher.
- States: default (rejected); loading; variant — permanently rejected (re-apply hidden, support only).
- Data: reads [PanditProfile.{status,rejectionReason}]; writes [via onboarding resubmit → status='pending'].
- Interactions: "Edit & resubmit" → `/pandit/onboarding/*`; "Switch to Jajman" → `/app/home`; "Contact support" → `/pandit/help`.
- Notes: Reconciled to `/pandit/rejected` (§0.6, §0.1). Resubmit re-enters the pending flow.

### Admin Forgot Password (stub sheet)
- Route: stub sheet from `/admin/login` (no dedicated route)
- Surface/Tab: Admin surface; modal sheet over Admin Login.
- Purpose: Stubbed admin password recovery.
- Layout: BottomSheet over Login: email field + "Send reset link" Button + "Contact super-admin" note.
- Components: BottomSheet, TextField, Button, Toast.
- States: default; submitting; success (Toast "Reset link sent (demo)").
- Data: reads [none]; writes [none — mock].
- Interactions: "Forgot password?" on Admin Login → open sheet; submit → Toast → close.
- Notes: Explicitly a stub (Appendix B). No real email is sent (email channel disabled, §0.5).

### Pandit Referral (reused)
- Route: `/pandit/referral`
- Surface/Tab: Pandit surface; entry from Pandit Profile/Settings.
- Purpose: Pandit referral entry reusing the shared Referral screen component.
- Layout: AppBar ("Refer & earn"); body = referral code Card + share Buttons + how-it-works + referred-list; identical layout to Jajman `/app/referral`, surface-themed.
- Components: AppBar, Card, Button (share), ListRow, EmptyState, Toast (shared Referral component).
- States: default; loading-skeleton; empty (no referrals yet); error; variant — reward earned badge.
- Data: reads [Referral.{code,referredUserIds,rewards}, user.id]; writes [share action (mock)].
- Interactions: copy code → Toast; share → mock share sheet; tap referred user → (read-only) summary.
- Notes: Same component as `/app/referral`; only the base route, BottomTabBar config, and back target differ (mirrors Help, §shared).

---

## Appendix B — Data-Model Additions, PRD-Gap Resolutions & Stub Inventory

### New entities

```ts
interface RecurringSeries {
  id: string;
  jajmanId: string;
  panditId: string;
  pujaId: string;
  interval: 'monthly' | 'quarterly' | 'annual';
  endCondition:
    | { type: 'never' }
    | { type: 'onDate'; date: string }
    | { type: 'afterCount'; count: number };
  nextDate: string;                 // ISO date of next occurrence
  status: 'active' | 'paused' | 'cancelled' | 'ended';
  generatedBookingIds: string[];    // each occurrence spawns a normal Booking
  createdAt: string;
}

interface AuditLog {
  id: string;
  actorId: string;                  // admin (or system) who acted
  action: string;                   // e.g. 'commission.update', 'settlement.hold', 'withdrawal.approve', 'dispute.resolve', 'verification.approve'
  entityType: 'Booking' | 'User' | 'PanditProfile' | 'CommissionRule'
            | 'SettlementRecord' | 'Withdrawal' | 'Dispute' | 'Verification';
  entityId: string;
  timestamp: string;                // ISO
  details: Record<string, unknown>; // before/after, amounts, notes
}

interface PricingConfig {
  advancePercent: number;           // default 30
  cancellationCutPct: number;       // default 5  (§0.3)
  emergencySurchargePct: number;    // e.g. 20    (§0.8)
  emergencyBufferMins: number;      // default 60 (§0.7)
  cancellationLeadMins: number;     // configurable cancel lead window (§0.3)
  // NOTE: platformCommissionPct is NOT here — it lives on CommissionRule (most-specific wins).
}
```

Supporting field additions used by the screens above:
```ts
// Booking
isDisputed: boolean;                // overlay flag (§0.2)
disputeId?: string;
chatThreadId?: string;              // chat resolved by threadId (§0.1)
phoneShared: boolean;               // per-booking override, init from User.phoneVisibility (§0.9)
teamSlots?: TeamSlot[];             // multi-pandit Path A (Team Status screen)
cancellation?: { initiatedBy: 'jajman' | 'pandit'; refundAmount: number;
                 platformCut: number; reason?: string };
charges: { base: number; travel: number; emergencySurcharge: number;
           subtotal: number; commissionAmount: number };
amountPaid: number; advanceAmount: number; remainingAmount: number;

// BookingRequest
expiresAt: string;                  // §0.7 formula for emergency
role?: string;                      // team slot role

// User
phoneVisibility: boolean;           // global default (§0.9)
roles: ('jajman' | 'pandit' | 'admin')[];   // 'pandit' added at onboarding submit (§0.6)
notifPrefs: Record<NotifChannel, boolean>;   // email/push locked false (§0.5)

// PanditProfile
status: 'pending' | 'approved' | 'rejected'; // gating (§0.6)
rejectionReason?: string;
```

### Settlement `on_hold`

- `SettlementRecord.status` includes **`on_hold`**. When a related booking's dispute opens (`Booking.isDisputed === true`), the linked `SettlementRecord` moves to **`on_hold`** (and an `AuditLog` `settlement.hold` entry is written).
- **Dispute resolution** either **releases** the settlement (back to `pending`/`paid` → `AuditLog settlement.release`) or **reverses** it (refund path → `AuditLog settlement.reverse`).
- **Admin Settlement detail** (`/admin/settlements` → detail) shows the `on_hold` banner, the linked dispute (`/admin/disputes/:id`), and Release / Reverse actions; both write AuditLog entries.

### Bidirectional ratings

- Add a **Jajman-received ratings view** — surfaced on **Jajman Profile** as **"My ratings"** (`/app/profile` → ratings panel; pandits rate Jajmans after completion).
- New fields:
```ts
interface JajmanProfile {
  // ...existing
  ratingReceived: number;        // avg rating from pandits
  ratingReceivedCount: number;
  ratingsReceived: RatingEntry[];
}
```
- **Pandit Request detail** (`/pandit/requests/:id`) shows **`jajman.rating`** (the Jajman's received rating) via `RatingSummary`, so a pandit can gauge the requester before accepting.

### Pandit booking attachments

- Add an **"Attach files"** affordance to **Pandit Booking detail** (`/pandit/bookings/:id`) and the Pandit Chat thread so that **`Attachment.uploadedBy = 'pandit'`** is reachable (e.g. samagri photos, completion proof). Attachments render in both the booking detail and the linked chat thread.
```ts
interface Attachment {
  id: string;
  uploadedBy: 'jajman' | 'pandit' | 'admin';
  url: string;                   // mock
  kind: 'image' | 'doc';
  uploadedAt: string;
}
```

### Stubbed / Coming-soon affordances (consolidated)

| Affordance | Where it appears | Behavior |
|---|---|---|
| **Social login** (Google/Apple) | `/auth/login`, `/auth/register` | Disabled buttons, "Coming soon" tag |
| **Email & Push notifications** | Notif prefs, foundation out-of-scope, data model | Channels shown but locked off (§0.5) |
| **Biometric login** | `/auth/login`, Settings | Toggle present, non-functional stub |
| **Delete account** | Settings (all surfaces) | Confirm dialog → Toast "Requested (demo)", no real deletion |
| **Reply to review** | `/pandit/ratings`, public profile reviews | Affordance present, opens stub composer (no persist) |
| **Commission effective-from date** | `/admin/commission` (rule editor) | Date picker stub; saves rule without scheduling |
| **Mock receipt download** | `/app/receipt/:bookingId` | "Download PDF (mock)" → Toast only |
| **Admin forgot-password** | `/admin/login` sheet | Mock "reset link sent (demo)" (§Appendix A) |
| **Change-mobile OTP re-verify** | Settings → `/auth/otp` (re-verify mode) | Auto-accepts demo code (stub) |
