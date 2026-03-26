# QUESTIONS.md — Comprehensive Code Review

> **Reviewer perspective**: Professional code reviewer & tech lead.  
> **Purpose**: Each numbered question is independent. Answer inline or below the question. Answers will drive the next round of improvements.

---

## 🔒 1 — SECURITY

### Q1.1 — `.env` file committed to Git with real credentials
The `.env` file contains the **real Supabase project URL, anon key, and project ID** and is checked into Git (it's not in `.gitignore`). Even though the anon key is a "publishable" key, the project ID and URL should ideally be managed via CI/CD secrets or at least kept out of version control. **Is this intentional? Should we add `.env` to `.gitignore` and move to `.env.example`?**

**Answer:**

---

### Q1.2 — Firebase/VAPID keys hardcoded in source
`src/lib/firebase.ts` and `src/sw.ts` both contain **hardcoded Firebase config and VAPID keys**. These are compiled into the production bundle, which means anyone can find them in the built JS. Firebase keys are semi-public by design, but **should these still be moved to environment variables for consistency and easier rotation?**

**Answer:**

---

### Q1.3 — No input sanitization on search queries (SQL injection via `.ilike`)
In `Familia.tsx` (lines 217, 325), the user search queries are interpolated directly into Supabase `.or()` filter strings:
```ts
.or(`full_name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`)
```
If a user enters special PostgREST filter characters (e.g., `)`, `,`), they could break the filter or cause unexpected behavior. **Should we sanitize or escape these inputs?**

**Answer:**

---

### Q1.4 — No Row-Level Security (RLS) validation visible for admin operations
The `Admin.tsx` page has a client-side role check (`role !== "admin"` → redirect), but there's no evidence that **Supabase RLS policies enforce server-side** admin-only restrictions on tables like `events`, `materials`, `store_products`, `org_positions`, etc. If RLS isn't configured, any user with the anon key could directly manipulate these tables via the Supabase API. **Are RLS policies configured on all sensitive tables?**

**Answer:**

---

### Q1.5 — Receipt uploaded to publicly-accessible storage bucket
In `Checkout.tsx` (line 230–234), payment receipts are uploaded to `payment_receipts` bucket and then `getPublicUrl()` is called, making them publicly accessible by URL. This means **any user's payment receipt (potentially containing personal banking info) could be accessed** by guessing the filename pattern (`userId_timestamp.ext`). **Should this bucket be private with signed URLs instead?**

**Answer:**

---

### Q1.6 — Cart sync uses `as any` to bypass type safety on RLS-sensitive tables
`CartContext.tsx` uses `supabase.from("cart_items" as any)` extensively (lines 64–65, 106–107, 125–126, 204). This bypasses all TypeScript type checking and could mask security issues or breaking changes in the schema. **Should `cart_items` be added to the Supabase types file instead?**

**Answer:**

---

### Q1.7 — Push notification edge function invoked with hardcoded project ID
In `Familia.tsx` (lines 367–377, 391–401), the push notification edge function is called by constructing the URL from `import.meta.env.VITE_SUPABASE_PROJECT_ID`. **Is there any server-side validation that the `user_ids` array in the push payload belongs to intended recipients? Could a malicious client send push notifications to arbitrary users?**

**Answer:**

---

### Q1.8 — `gallery_photos` bucket now private but download still uses `item.image_url`
In `Galeria.tsx`, signed URLs are generated for display (line 65–71), but the `downloadItem` function (line 154–168) uses `item.image_url` (potentially the signed URL), which may expire. Also, the signed URL has a 1-hour TTL. **What happens when a user opens the gallery and waits more than 1 hour before downloading? Should we refresh signed URLs on demand?**

**Answer:**

---

## ⚡ 2 — PERFORMANCE

### Q2.1 — Gallery generates N signed URLs sequentially on every load
In `Galeria.tsx` (line 65–72), **every gallery item** triggers an individual `createSignedUrl` call inside `Promise.all`. For 100+ photos, this means 100+ HTTP requests on page load. **Should we batch these or use a different approach (e.g., a server-side function that returns all signed URLs at once)?**

**Answer:**

---

### Q2.2 — `Mapa.tsx` loads ALL notes for ALL locations at once
In `Mapa.tsx` (line 104–107), the component fetches **every note from `location_user_notes`** on page load regardless of which location the user is viewing. For a growing dataset, this could become a significant performance bottleneck. **Should notes be loaded lazily per-location when the user selects it?**

**Answer:**

---

### Q2.3 — No pagination on any list view
None of the pages (`Galeria`, `Mapa`, `Materiais`, `Loja`, `Pesquisas`, `NotificationBell`) implement pagination. They fetch **all records** at once (or limited by arbitrary caps like `limit(50)` on notifications). **As data grows, should we implement infinite scroll or cursor-based pagination on key pages?**

**Answer:**

---

### Q2.4 — `QueryClient` instantiated outside the component with no configuration
In `App.tsx` (line 29), the `QueryClient` is created with default settings:
```ts
const queryClient = new QueryClient();
```
But **none of the pages actually use React Query hooks** (`useQuery`, `useMutation`). All data fetching is done with raw `supabase.from(...).select(...)` inside `useEffect`. This means React Query's caching, deduplication, and stale-while-revalidate are completely unused. **Is React Query intended to be used? Should we migrate data fetching to `useQuery` hooks, or remove `@tanstack/react-query` as an unused dependency?**

**Answer:**

---

### Q2.5 — Checkout fetches settings on every mount
`Checkout.tsx` (line 67–96) fetches 7 `app_settings` rows every time the page mounts. No caching is applied. **Should app settings be cached in context (like `AppSettingsContext` already does for colors) or served via React Query with a long stale time?**

**Answer:**

---

### Q2.6 — `Loja.tsx` loads ALL products + ALL stock + ALL kit_components at once
`Loja.tsx` (line 77–97) runs 4 parallel Supabase queries to load the entire product catalog, all stock entries, the WhatsApp number, and all kit components. **As the store grows, should we paginate products or lazy-load stock only for visible products?**

**Answer:**

---

### Q2.7 — Dashboard events: nested `.then()` chains instead of async/await
In `Dashboard.tsx` (lines 28–54), events are fetched with nested `.then()` chains. **This hurts readability and makes error handling difficult. Should we refactor to async/await inside useEffect?**

**Answer:**

---

### Q2.8 — Multiple unused Radix UI packages in `package.json`
The following Radix primitives are listed as dependencies but don't appear to be used in any component: `@radix-ui/react-aspect-ratio`, `@radix-ui/react-context-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-slider`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `react-resizable-panels`, `cmdk`, `input-otp`, `embla-carousel-react`, `recharts`. **Should we audit and remove unused dependencies to reduce bundle size?**

**Answer:**

---

## 🏗️ 3 — ARCHITECTURE & CODE STRUCTURE

### Q3.1 — Huge page files with inline logic ("God Components")
Several pages are extremely large monoliths:
- `Familia.tsx` — **782 lines**
- `Loja.tsx` — **631 lines** (includes a 420-line `ProductCard` component)
- `Checkout.tsx` — **612 lines**
- `Mapa.tsx` — **516 lines**
- `Pesquisas.tsx` — **411 lines**

Admin components are even larger: `ManageSurveys.tsx` (37KB), `ManageStore.tsx` (35KB), `ManageFamilies.tsx` (29KB), `ManageOrgTeams.tsx` (27KB), `ManageOrders.tsx` (26KB).

These files contain business logic, data fetching, state management, and UI rendering all in one. **Should we extract custom hooks (`useFamilyData`, `useProductCatalog`, etc.) and break these into smaller sub-components?**

**Answer:**

---

### Q3.2 — `ProductCard` defined inside `Loja.tsx` as a sibling component
`ProductCard` (line 208–628 of `Loja.tsx`) is a 420-line component defined in the same file as `Loja`. It manages its own state, effects, and a full product modal. **Should this be extracted to its own file (`components/store/ProductCard.tsx`)?**

**Answer:**

---

### Q3.3 — Duplicated `handleLogout` pattern across every single page
Every page component has the exact same pattern:
```ts
const handleLogout = async () => { await signOut(); navigate("/"); };
```
This is repeated in **Dashboard, Login, Admin, Checkout, Loja, Familia, Mapa, Galeria, Calendario, Pesquisas, Perfil, Organograma, Materiais**. **Should we extract this to a custom hook or a wrapper component?**

**Answer:**

---

### Q3.4 — Duplicated `categoryLabels` map in multiple files
`categoryLabels` for store categories (`camiseta`, `bone`, `squeeze`, etc.) is defined identically in `Loja.tsx` and `Checkout.tsx`. **Should this be a shared constant in a `constants.ts` file?**

**Answer:**

---

### Q3.5 — `AppHeader` + `BottomNav` repeated in every page component
Every page wraps its content with `<AppHeader ... /><main>...</main><BottomNav />`. **Should we create a `PageLayout` wrapper component that includes these, along with the logout logic, to reduce boilerplate?**

**Answer:**

---

### Q3.6 — No centralized data-fetching or API layer
All Supabase calls are made directly inside page components and admin components. There's no service/API layer or repository pattern. **Would it be beneficial to create a `services/` or `api/` directory with functions like `getProducts()`, `getEvents()`, `saveProfile()`, etc., to decouple data access from UI?**

**Answer:**

---

### Q3.7 — Mixed language (Portuguese comments/variables + English code)
The codebase mixes Portuguese UI text, Portuguese comments, Portuguese variable names (e.g., `familyGroupInfo`, `searchingJoin`, `pendingRequests` mixed with `setFamilyName`, `setEventsLabel`), and English code conventions. **Should we standardize code language (English for code/comments, Portuguese for user-facing strings only)? Should we use an i18n library?**

**Answer:**

---

### Q3.8 — No error boundary component
The app has no React Error Boundary. If any component throws during render, the entire app crashes to a blank screen. **Should we add error boundaries at the route level or app level?**

**Answer:**

---

### Q3.9 — `next-themes` in dependencies but no theme toggle visible
The `next-themes` package is listed in `package.json`, but there's no visible theme toggle in the app and no `ThemeProvider` wrapping the app. CSS does reference dark mode classes. **Is dark mode intended to be supported? Should `next-themes` be wired up or removed?**

**Answer:**

---

### Q3.10 — `lovable-tagger` dev dependency — what is it?
`lovable-tagger` appears as a dev dependency and is used in `vite.config.ts` (line 4, 17). It's only active in development mode. **What is this? Is it from the Lovable.dev platform? Should it remain in the project?**

**Answer:**

---

### Q3.11 — Multiple lock files: `bun.lock`, `bun.lockb`, `package-lock.json`
The project has lock files for both Bun and npm. **Which package manager is the canonical one? Should we remove the unused lock file(s) and add them to `.gitignore`?**

**Answer:**

---

### Q3.12 — Lint/diagnostic output files committed to repo
Files like `eslint_output.json`, `eslint_output.txt`, `lint_all.txt`, `lint_output.txt`, `tsc_output.txt`, `ts_errors.txt` are checked into the repo. **These should be in `.gitignore` — should we clean them up?**

**Answer:**

---

### Q3.13 — SQL migration file in root directory
`01_add_receipt_and_pay_later.sql` is in the project root instead of `supabase/migrations/`. **Should this be moved into the migrations directory for consistency?**

**Answer:**

---

## 🐛 4 — POTENTIAL BUGS

### Q4.1 — Cart "add to cart" loop adds items one-by-one instead of setting quantity
In `Loja.tsx` (line 292–306), when a user selects quantity N via the modal, the code runs a `for` loop calling `addItem()` N times with quantity 1 each:
```ts
for (let i = 0; i < safeQty; i++) {
  addItem({ ... });
}
```
But `addItem` in `CartContext` already accepts a `quantity` parameter. This means: (a) it sends N Supabase upsert calls instead of 1, and (b) the first `addItem` adds 1, the second finds existing and adds 1 more, etc., which works but is very inefficient. **Should this just call `addItem(item, safeQty)` once?**

**Answer:**

---

### Q4.2 — Cart `getCartKey` uses `JSON.stringify(configuration)` for comparison
`CartContext.tsx` (line 41–42) uses `JSON.stringify(item.configuration)` as part of the cart key. JSON.stringify output is **not guaranteed to maintain property order**, meaning the same configuration object could produce different strings and create duplicate cart entries. **Is this a known issue?**

**Answer:**

---

### Q4.3 — `useEffect` dependencies warning on `items` in CartContext
In `CartContext.tsx` (line 93), the `items.length > 0` check inside the `useEffect` that depends on `[user?.id]` uses `items` from the outer scope without including it in the dependency array. This means if the user logs in when items exist in localStorage, the sync-to-Supabase path may not trigger correctly on re-renders. **Is this intentional?**

**Answer:**

---

### Q4.4 — `Checkout.tsx` clears cart and navigates even if `saveOrderToDb()` fails
In `handleConfirmPayment()` (lines 206–263), if `saveOrderToDb()` fails silently (the function returns `undefined` on error), the code still proceeds to:
1. Open WhatsApp
2. Clear the cart
3. Navigate away

The user loses their cart data with no order saved in the database. **Should we check the return value and abort on failure?**

**Answer:**

---

### Q4.5 — `Perfil.tsx` doesn't update `full_name` in Supabase Auth metadata
When the user updates their name in `handleSave()`, only the `profiles` table is updated. But the Auth user metadata (`user.user_metadata.full_name`) remains stale until the user logs out and back in. This means the Dashboard greeting says the old name. **Should we call `supabase.auth.updateUser({ data: { full_name } })` as well?**

**Answer:**

---

### Q4.6 — `OnboardingCard` uses `localStorage` for completion tracking
The onboarding tasks check `localStorage.getItem('has_visited_store')`, etc. If the user clears browser data or switches devices, their onboarding progress resets. Also, "linking a family" checks `localStorage('has_linked_family')` which is never visibly set. **Where is `has_linked_family` set? Should onboarding state be stored in the user's profile?**

**Answer:**

---

### Q4.7 — `Pesquisas.tsx` submits before user presses "Enviar" on conditional survey end
In `goNext()` (lines 142–163), if a multiple-choice option has `ends_survey: true`, the survey auto-submits and `setSurveyEnded(true)` is called without user confirmation. The user sees the end screen but never explicitly pressed a "submit" button. **Is this the intended UX?**

**Answer:**

---

### Q4.8 — Galeria allows 100MB file uploads
In `Galeria.tsx` (line 87), the max file size is 100MB. For a PWA on mobile, uploading a 100MB video over cellular could timeout or fail silently. **Should we reduce this limit or add progress indicators?**

**Answer:**

---

### Q4.9 — `PushNotificationManager.tsx` has dead code
The `waitForSWActive` helper function (lines 62–100) is **never called** anywhere in the component. It's dead code. **Should it be removed?**

**Answer:**

---

## 💡 5 — DATA MODELING & TYPES

### Q5.1 — Extensive use of `as any` casts throughout the codebase
Almost every Supabase query result is cast with `as any` or `as any[]`. This completely negates the value of having a typed Supabase client. Key offenders:
- `CartContext.tsx` — 10+ `as any` casts
- `Familia.tsx` — 5+ `as any` casts
- `Mapa.tsx` — 5+ `as any` casts
- `Checkout.tsx`/`Loja.tsx` — multiple casts
- All admin components use `as any` extensively

**Should the `types.ts` file be regenerated from the latest Supabase schema to eliminate these casts?**

**Answer:**

---

### Q5.2 — `profiles` table has many columns not reflected in types
The `Perfil.tsx` page reads columns like `notify_reminder_24h`, `notify_reminder_30min`, `show_phone_in_org`, `family_name`, `family_names`, etc. These are accessed via `as any`. **Are these columns in the database but not in the auto-generated `types.ts`?**

**Answer:**

---

### Q5.3 — `store_products` type doesn't include several used columns
`Loja.tsx` uses `product_type`, `is_kit`, `is_combo`, `combo_min_quantity`, `combo_price` — many of these may not be in the auto-generated types, hence the `as any` casts. **Should types be regenerated?**

**Answer:**

---

### Q5.4 — `kit_components` and `cart_items` tables are not in Supabase types
Both are accessed via `supabase.from("kit_components" as any)` and `supabase.from("cart_items" as any)`. **These tables exist in the database but not in the TypeScript types. Should they be added?**

**Answer:**

---

### Q5.5 — `profiles_org_public` view used but not typed
In `Organograma.tsx` (line 99), data is fetched from `profiles_org_public` which is likely a Supabase View. **Is this view properly secured with RLS? Should its shape be added to the types file?**

**Answer:**

---

## 🔄 6 — STATE MANAGEMENT

### Q6.1 — Cart stored in both `localStorage` AND Supabase
`CartContext.tsx` maintains a dual-sync pattern: items are stored in `localStorage` AND synced to a `cart_items` table in Supabase. The sync logic is complex and has potential race conditions (e.g., user logs in on two devices simultaneously). **Is the Supabase sync necessary, or is localStorage-only sufficient for this app?**

**Answer:**

---

### Q6.2 — `AppSettingsContext` doesn't handle localStorage override cleanup
In `AppSettingsContext.tsx` (lines 72–79), user overrides from `localStorage` take priority over admin settings. But there's no way for the admin to "force" a color reset, and if a user sets custom colors that conflict with a theme update, the old colors persist forever. **Should there be a mechanism to clear user overrides?**

**Answer:**

---

### Q6.3 — Mapa pin/order state stored in localStorage per user
`Mapa.tsx` stores pinned locations and custom sort order in `localStorage` keyed by user ID. **If the user logs in on a different device, their pin preferences are lost. Is this acceptable, or should it be stored server-side?**

**Answer:**

---

## 🧪 7 — TESTING

### Q7.1 — No meaningful test files
The project has `vitest` configured and a `src/test/` directory, but **are there any actual tests? What is the current test coverage?**

**Answer:**

---

### Q7.2 — No E2E testing setup
There's no Cypress, Playwright, or other E2E testing framework. For a PWA with a checkout flow, push notifications, and user management, **should we introduce E2E tests for critical flows?**

**Answer:**

---

## 📱 8 — PWA & MOBILE

### Q8.1 — Service Worker mixes Workbox + Firebase SDK via `importScripts`
`sw.ts` uses Workbox's `precacheAndRoute` (ESM import) combined with `importScripts()` for Firebase compat SDK (legacy pattern). **This mixing of ESM and imperative `importScripts` is fragile. Should we migrate to Firebase modular SDK in the SW?**

**Answer:**

---

### Q8.2 — PWA icons use `"purpose": "any maskable"` on both icons
In `vite.config.ts` (lines 41, 48), both the 192px and 512px icons have `purpose: "any maskable"`. Google recommends **separate icons for "any" and "maskable"** purposes because maskable icons need extra padding. **Should we provide separate icons?**

**Answer:**

---

### Q8.3 — No offline fallback page  
The service worker precaches static assets but there's no offline fallback for navigations. If the user is offline and navigates to a new page, they'll see a browser error. **Should we add an offline fallback page?**

**Answer:**

---

### Q8.4 — `maximumFileSizeToCacheInBytes: 5000000` (5MB) in precache config
This allows caching files up to 5MB in the service worker. **Is this intentionally high? Could this lead to excessive storage usage on mobile devices?**

**Answer:**

---

## 🌐 9 — UX & ACCESSIBILITY

### Q9.1 — No loading skeletons — only spinners
Every page shows a generic spinning circle while loading. **Should we implement skeleton screens for a better perceived performance?**

**Answer:**

---

### Q9.2 — No keyboard accessibility on custom product modals
The product detail modal in `Loja.tsx` (line 416–625) is a custom `div` overlay, not using Radix Dialog. **It has no focus trap, no Escape key handling, and isn't announced to screen readers. Should we use the existing `Dialog` component from Radix UI?**

**Answer:**

---

### Q9.3 — Admin tabs (12 tabs in 3 rows) are hard to navigate
`Admin.tsx` has **12 admin tabs** arranged in a 4×3 grid. On mobile, this takes up significant vertical space and can be confusing. **Should we replace this with a sidebar, accordion, or a nested routing pattern (`/admin/missionaries`, `/admin/events`)?**

**Answer:**

---

### Q9.4 — No confirmation before clearing the cart
`clearCart()` in the checkout flow has no confirmation dialog. **Should we add an "Are you sure?" prompt before clearing all items?**

**Answer:**

---

### Q9.5 — Color palette customization uses HSL values that users must understand
`AppSettingsContext.tsx` and `ColorPaletteSelector.tsx` work with raw HSL color strings like `"220 60% 25%"`. **Should the admin UI provide a visual color picker or named presets instead?**

**Answer:**

---

## 🔌 10 — SUPABASE & BACKEND

### Q10.1 — Edge functions: are they all deployed and working?
The `supabase/functions/` directory has 7 functions:
1. `admin-users`
2. `auth-email-hook`
3. `event-reminders`
4. `process-email-queue`
5. `send-push-notification`
6. `summarize-note`

**Are all of these deployed and active? Is `event-reminders` triggered by a cron job? Is `process-email-queue` triggered on schedule?**

**Answer:**

---

### Q10.2 — No Supabase realtime subscriptions except for notifications
Only `NotificationBell.tsx` uses Supabase Realtime (Postgres Changes). Other data (events, products, notes, etc.) is fetched once and never updates in real-time. **Should any other data be subscribed to in real-time (e.g., stock levels in the store)?**

**Answer:**

---

### Q10.3 — `get_user_role` RPC function — what does it check?
`AuthContext.tsx` (line 36) calls `supabase.rpc("get_user_role", { _user_id: userId })`. **What does this function look like on the database side? Does it check a `user_roles` table? Is it using `auth.users` metadata? Could this be a simple `.select()` on the profiles table instead?**

**Answer:**

---

### Q10.4 — `accept_family_request` and `reject_family_request` RPC functions
These are called in `Familia.tsx` (lines 383, 409). **What do these functions do server-side? Do they handle the edge case where the requester already joined another family between request and acceptance?**

**Answer:**

---

### Q10.5 — No database triggers or checks visible for stock management
Stock is only decremented when an admin changes order status to "Separado" (handled in `ManageOrders.tsx`). **What happens if two admins process the same order simultaneously? Is there any database-level constraint to prevent negative stock?**

**Answer:**

---

## 🧹 11 — CLEANUP & TECH DEBT

### Q11.1 — `dist/` folder is tracked in Git
The `dist/` folder (production build output) appears to exist in the project directory. **Should `dist/` be in `.gitignore`?**

**Answer:**

---

### Q11.2 — `eslint-disable @typescript-eslint/no-explicit-any` at top of multiple files
`CartContext.tsx`, `Checkout.tsx`, `Loja.tsx` all disable the `no-explicit-any` rule file-wide. **Should we fix the underlying type issues instead of suppressing lint?**

**Answer:**

---

### Q11.3 — `PushDiagnostics.tsx` is commented out in `Perfil.tsx`
```ts
// import PushDiagnostics from "@/components/PushDiagnostics";
// <PushDiagnostics />
```
**Is this a debug-only component? Should it be removed or gated behind an admin/dev flag?**

**Answer:**

---

### Q11.4 — `diff_files.txt` in project root
There's a `diff_files.txt` file in the root. **Is this a temporary artifact that should be removed?**

**Answer:**

---

### Q11.5 — TypeScript strict mode is completely disabled
`tsconfig.app.json` has:
```json
"strict": false,
"noImplicitAny": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
"noFallthroughCasesInSwitch": false
```
This means TypeScript provides almost no type safety. **Should we incrementally enable stricter settings to catch bugs at compile time?**

**Answer:**

---

### Q11.6 — `Index.tsx` only redirects
```tsx
const Index = () => { const navigate = useNavigate(); useEffect(() => { navigate("/dashboard"); }, []); return null; };
```
The root route `/` renders `Index` which just navigates to `/dashboard`. But `Login.tsx` is not mounted on any route — it's only rendered when `user` is null via `Index`. Actually wait — `Index.tsx` navigates unconditionally. **Who renders the Login page? Is there logic I'm missing? This seems like it would redirect unauthenticated users to `/dashboard` which then redirects to `/` via `ProtectedRoute`, creating an infinite redirect loop. How does login actually work?**

**Answer:**

---

### Q11.7 — No `React.StrictMode` wrapper
`main.tsx` renders `<App />` directly without `<React.StrictMode>`. **Should StrictMode be enabled in development for catching subtle bugs?**

**Answer:**

---

### Q11.8 — `package.json` name is `vite_react_shadcn_ts` (generic template name)
The package name hasn't been updated from the Lovable/GPT-Engineer template default. **Should it be renamed to something like `mission-connect` or `jfm-app`?**

**Answer:**

---

## 📊 12 — OBSERVABILITY & MONITORING

### Q12.1 — No error tracking (Sentry, LogRocket, etc.)
There's no error tracking service integrated. If the app crashes in production on a user's phone, there's no way to know. **Should we add Sentry or a similar tool?**

**Answer:**

---

### Q12.2 — Console.log statements in production code
Firebase and push notification code has multiple `console.log` and `console.warn` statements that will appear in production. **Should we strip these or use a logging utility that respects environment?**

**Answer:**

---

### Q12.3 — No analytics
There's a Google Analytics measurement ID in `firebase.ts` (`G-XRCLW5B86W`), but no analytics library (GA4, Plausible, etc.) is initialized. **Should we add analytics to track user behavior and feature usage?**

**Answer:**

---

## 🔧 13 — ADDITIONAL REFACTORING OPPORTUNITIES

### Q13.1 — `Familia.tsx` has 12+ separate state variables
The family page uses `useState` for: `loading`, `saving`, `familyName`, `members`, `familyGroupId`, `familyGroupInfo`, `isGroupCreator`, `linkedUsers`, `searchQuery`, `searchResults`, `searching`, `joinSearchQuery`, `joinSearchResults`, `searchingJoin`, `pendingRequests`, `outboundRequests`. **Should we use `useReducer` or extract to a custom hook?**

**Answer:**

---

### Q13.2 — Supabase client hardcodes `localStorage` as auth storage
In `client.ts` (line 13): `storage: localStorage`. **This means the app won't work in private browsing modes on some browsers (Safari). Should we use a fallback in-memory storage?**

**Answer:**

---

### Q13.3 — `excel.ts` in lib — what is it used for?
There's a `src/lib/excel.ts` (6KB). **Which part of the app uses Excel export? Is it for admin reports? Should it be lazy-loaded to avoid bundling `exceljs` (which is quite large) for all users?**

**Answer:**

---

### Q13.4 — Color palette applied via inline `style.setProperty` on `:root`
`AppSettingsContext.tsx` sets CSS custom properties dynamically on `document.documentElement`. **This approach works but can cause FOUC (Flash of Unstyled Content) on first load before settings are fetched. Should we use SSR-compatible theming or store a CSS cache?**

**Answer:**

---

### Q13.5 — `Checkout.tsx` builds WhatsApp messages manually
The `buildOrderMessage()` function (lines 105–162) manually concatenates WhatsApp-formatted strings. **Should this be a utility function? What if we need order confirmation emails too — should message building be abstracted?**

**Answer:**

---

---

## ✏️ HOW TO ANSWER

For each question, please provide one of:
- **"Fix"** — This is a bug/issue that should be fixed. Optionally describe how.
- **"Improvement"** — Not a bug, but should be improved. Describe the desired approach.
- **"Intentional"** — This is by design. Briefly explain why.
- **"Won't fix"** — Known issue but not worth fixing now. Explain why.
- **"Needs discussion"** — Requires more context before deciding.

---
