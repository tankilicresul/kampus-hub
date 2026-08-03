---
name: web-seo-pwa
description: Standards and guidelines for Search Engine Optimization (SEO), Google Search Console compatibility, Open Graph & Twitter Cards metadata, sitemap.xml, robots.txt, and Progressive Web App (PWA) manifest / service worker integration in TanCoreLab.
---

# Web SEO & PWA Standards Directive

This skill defines mandatory rules for SEO metadata, Google Search Console indexing, dynamic sitemap management, robots.txt configuration, Vercel header security/indexing rules, and PWA capabilities across TanCoreLab web applications.

---

## 1. Domain & Canonical URL Directives
- **Official Domain**: `https://tancorelab.com/`
- All canonical tags MUST use `https://tancorelab.com/` as the primary base URL.
- Never hardcode staging or fallback Vercel domains (`tancorelab.vercel.app`) in canonical links or sitemaps.

---

## 2. Public vs Private Indexing Rules

### Public Routes (`/`)
- Public landing pages must be indexed by search engines.
- Metadata: `<meta name="robots" content="index, follow" />`
- Included in `sitemap.xml`: `https://tancorelab.com/`

### Private Routes (`/login`, `/app`, `/app/*`)
- Private application screens must NOT be indexed by search engines.
- Response Headers in `vercel.json`:
  ```json
  {
    "source": "/login",
    "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }]
  },
  {
    "source": "/app",
    "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }]
  },
  {
    "source": "/app/(.*)",
    "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }]
  }
  ```
- Do NOT add `Disallow` rules in `robots.txt` for private routes, as `robots.txt` disallow prevents Googlebot from reading `X-Robots-Tag` headers properly.

---

## 3. Robots.txt & Sitemap Specifications

### `public/robots.txt`
```txt
User-agent: *
Allow: /

Sitemap: https://tancorelab.com/sitemap.xml
```

### `public/sitemap.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tancorelab.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

---

## 4. PWA Manifest Rules (`public/manifest.json`)
- `start_url` MUST point to `/app` (so installed PWA opens directly into the application shell for authenticated users).
- Icons, theme color (`#ff9f0a`), background color (`#0b131f`), and display mode (`standalone`) must be preserved.

---

## 5. Verification Commands
- `npm run build`
- `npm run lint`
- Verify presence of `dist/index.html`, `dist/robots.txt`, `dist/sitemap.xml`, and `dist/manifest.json`.
