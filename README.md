# Agriya Agro Tech

Agriculture inputs manufacturing company website.

Live site: https://agriya-agro-tech.lingachem-agriya.workers.dev/

The product names and technical descriptions are transcribed from the supplied product index, available at `site/product-range.png`. Product photos, pack sizes, dosage, certifications, manufacturing capacity and contact details are not supplied and are not invented. The contact section provides product information and the downloadable index; no submission endpoint is configured.

## Local preview

Run `python3 -m http.server 8080` from this directory.

## Build and deploy

Run `node scripts/build.mjs` to generate `worker.mjs`, then deploy with `npx wrangler deploy`. The build packages the HTML, CSS, JavaScript, product data and supplied index in the Worker. The site uses no external runtime dependencies.

The old charity template pages redirect to the agriculture website.

Field photograph: Unsplash, https://unsplash.com/photos/1500382017468-9049fed747ef (image source URL: https://images.unsplash.com/photo-1500382017468-9049fed747ef).

## Hopewell layout and logo loader

The original Hopewell layout and stylesheet are retained with Agriya-specific content. The supplied animated GIF is used in the loading screen, with a static final frame for the navigation and reduced-motion users. The loader dismisses on load after one animation cycle, with a 3.5 second fallback. The enquiry form downloads a local text draft and does not send a message.

## 2026 brochure content

Company profile, vision, policies, contact details and complete product descriptions are sourced from the supplied 25-page English brochure. The source layout and logo loader are retained. Product detail content is rendered as HTML text, not embedded PDF pages or brochure images. Glucon, Methelo, Asperlin and Beauverilin use detailed-page names with index names retained as search aliases. Brochure potency and dosage are transcribed without silently changing ambiguous source values. The contact form opens an email draft to the brochure email address; it does not automatically send.

Green crop photograph: raghul ayyasamy / Unsplash, https://unsplash.com/photos/a-large-green-field-AiyBnqG2DCQ. Hero and crop imagery use this lush green paddy photograph.
