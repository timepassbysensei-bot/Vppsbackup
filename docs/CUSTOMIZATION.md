# Customization guide (developer)

Everything about the school's visual identity is driven from a small, obvious set
of places. You should never have to hunt through components to rebrand the site.

| What | Where | Notes |
| --- | --- | --- |
| Favicon (tab / bookmark / mobile) | `public/favicon.svg` **or** admin → Branding | See below |
| Safari pinned-tab icon | `public/mask-icon.svg` | Monochrome SVG |
| App name / share title / theme colour | `src/lib/branding.ts` + `index.html` | |
| Colours, gradients, shadows, radii | `src/styles/tokens.css` | Single source of truth |
| Reusable UI classes & animations | `src/styles/index.css` | `.card`, `.btn-*`, `.reveal`, … |
| School name, tagline, address, facility list | Supabase `school_settings` row (admin dashboard) | Editable, never hard-coded |
| Uploaded logo / favicon / share image | Supabase `branding_assets` + `branding` storage bucket | |

---

## Favicon

There is **one canonical place** the browser reads the icon from, and two ways to
change it. Both flow through the same code path.

### Option A — from the admin dashboard (no code, recommended for the school)

1. Sign in as the principal and open **Principal dashboard**.
2. In the **Branding** panel choose **Replace favicon** (and/or **Replace logo**).
3. Pick an `.svg` or `.png` (favicon ≤ 512 KB, logo ≤ 2 MB).

The file is uploaded to the public `branding` storage bucket, recorded in the
`branding_assets` table (`key = 'favicon'` / `'logo'`), and applied immediately
across the site. Uploads use a unique filename so a CDN or browser never serves a
stale icon.

### Option B — replace the static file (no database required)

1. Replace **`public/favicon.svg`** with your icon (keep the filename, or update
   the fallback in `src/lib/branding.ts`).
2. Optionally replace `public/mask-icon.svg` (monochrome, for Safari pinned tabs).
3. Run `npm run build` (or just save — the dev server picks it up). Nothing else
   to change.

If you drop in a raster icon instead, name it `public/favicon.png` and update
`DEFAULT_FAVICON` in `src/lib/branding.ts` to `/favicon.png`. The MIME type is
inferred from the extension automatically.

### How it works (and why it keeps working in production)

- `index.html` declares the full tag set — `icon` (SVG + shortcut), 
  `apple-touch-icon`, `mask-icon`, `manifest`, `theme-color` — each tagged with a
  `data-vpps-*` attribute.
- `src/components/BrandingEffects.tsx` (mounted once in `src/app/providers.tsx`)
  updates **those same tags** at runtime from `school_settings` + `branding_assets`
  instead of appending duplicates, so desktop tabs, mobile browsers, home-screen
  installs and saved bookmarks resolve to one consistent icon.
- `public/site.webmanifest` gives installable/home-screen contexts the same icon
  and theme colour.
- Netlify copies everything in `public/` to the site root during `npm run build`,
  so `/favicon.svg`, `/mask-icon.svg` and `/site.webmanifest` are served exactly as
  `/index.html` references them. The strict `Content-Security-Policy` in
  `netlify.toml` already allows `img-src 'self' …`, so no header change is needed.

### Verify

- **Desktop:** hard-refresh the tab; the icon updates.
- **Mobile / installable:** the manifest icon is used for the home-screen shortcut.
- **Bookmarks:** bookmark the page — the browser stores the resolved icon + title.
- **Production:** after deploy, open `https://<your-domain>/favicon.svg` and
  `/site.webmanifest` to confirm they are served (both return 200, correct type).

> Tip: if a changed icon seems stuck, it is almost always browser cache. Try a
> private window before assuming the change failed.

---

## Colours & theme

Edit the hex values in **`src/styles/tokens.css`**. Every Tailwind colour
(`bg-navy`, `text-amber`, …), gradient and shadow derives from those variables, so
one file re-themes the whole app. New tokens must also be mapped in
`tailwind.config.ts` if you want a Tailwind utility for them.

---

## School facts

School name, tagline, address, phone, facility list, principal's message, etc.
live in the `school_settings` row and are edited from the admin dashboard. **Never
hard-code** unconfirmed facts (CBSE affiliation number, domain, WhatsApp) — leave
them blank/editable, exactly as the seed does.
