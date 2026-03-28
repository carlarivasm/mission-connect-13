

## Banner System for Dashboard

### Overview
Create a schedulable banner system where admins can upload image/video banners with publish and expiry dates, displayed between "Acesso Rápido" and "Próximas Atividades" on the Dashboard. When no active banner exists, nothing changes.

### Database

**New table: `dashboard_banners`**
- `id` uuid PK
- `title` text (label shown, e.g. "Importante")
- `media_url` text (public URL of image/video)
- `media_type` text ("image" or "video")
- `storage_path` text
- `publish_at` timestamptz (when to start showing)
- `expire_at` timestamptz (when to stop showing)
- `active` boolean default true
- `created_by` uuid
- `created_at` timestamptz default now()

RLS: admins can ALL, authenticated can SELECT (where active=true and publish_at <= now and expire_at > now).

**Storage**: reuse `product-images` bucket or the existing public buckets for banner media uploads.

### Admin Component: `ManageBanners.tsx`
- List existing banners with status (active/scheduled/expired)
- Form to create/edit: title, file upload (image or video), publish date, expire date
- Preview of uploaded media
- Toggle active/inactive
- Delete banner

### Admin Tab
- Add a "Banners" tab (with `Image` icon) to the Admin page in one of the existing tab rows

### Dashboard Component: `DashboardBanner.tsx`
- Query `dashboard_banners` where `active=true`, `publish_at <= now()`, `expire_at > now()`
- If results exist, render between Quick Actions and Events sections:
  - Header badge: "📢 Importante"
  - If image: render `<img>` with rounded corners
  - If video: render `<video>` with controls, autoplay muted
- If no active banners, render nothing (current layout preserved)

### Files to create/edit
1. **Migration SQL** — create `dashboard_banners` table with RLS
2. **`src/components/admin/ManageBanners.tsx`** — admin CRUD for banners
3. **`src/components/DashboardBanner.tsx`** — display component for Dashboard
4. **`src/pages/Dashboard.tsx`** — import and place `<DashboardBanner />` between Quick Actions and Events
5. **`src/pages/Admin.tsx`** — add Banners tab

