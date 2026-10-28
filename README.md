# Agriya Agro Tech

Agriculture inputs manufacturing company website.

Live site: https://agriya-agro-tech.lingachem-agriya.workers.dev/

The product names and technical descriptions are transcribed from the supplied product index, available at `site/product-range.png`. Product photos, pack sizes, dosage, certifications, manufacturing capacity and contact details are not supplied and are not invented. The contact section provides product information and the downloadable index; no submission endpoint is configured.

## Local preview

Run `python3 -m http.server 8080` from this directory.

## Build and deploy

Run `node scripts/build.mjs` to generate `worker.mjs`, then deploy with `npx wrangler deploy`. The Wrangler build hook regenerates the Worker automatically on every deploy. The build packages the HTML, CSS, JavaScript, product data and supplied index in the Worker. The site uses no external runtime dependencies.

The old charity template pages redirect to the agriculture website.

Field photograph: Unsplash, https://unsplash.com/photos/1500382017468-9049fed747ef (image source URL: https://images.unsplash.com/photo-1500382017468-9049fed747ef).

## Hopewell layout and logo loader

The original Hopewell layout and stylesheet are retained with Agriya-specific content. The supplied animated GIF is used in the loading screen, with a static final frame for the navigation and reduced-motion users. The loader dismisses on load after one animation cycle, with a 3.5 second fallback. The enquiry form downloads a local text draft and does not send a message.

## 2026 brochure content

Company profile, vision, policies, contact details and complete product descriptions are sourced from the supplied 25-page English brochure. The source layout and logo loader are retained. Product detail content is rendered as HTML text, not embedded PDF pages or brochure images. Glucon, Methelo, Asperlin and Beauverilin use detailed-page names with index names retained as search aliases. Brochure potency and dosage are transcribed without silently changing ambiguous source values. The contact form opens an email draft to the brochure email address; it does not automatically send.

Green crop photograph: raghul ayyasamy / Unsplash, https://unsplash.com/photos/a-large-green-field-AiyBnqG2DCQ. Hero and crop imagery use this lush green paddy photograph.

## Product administration

Visit `/admin` to add, edit or remove products. Product name, technical name, category, Short Description, Benefits, Mode of Action, Recommended Crops, Application, Potency, optional Dosage and search aliases are supported. Product images can be dragged into the editor or selected with Choose image; an HTTPS image URL is also supported. JPG, PNG and WebP files up to 10 MB are accepted by the browser, with larger files automatically resized to fit the 1 MB stored-image limit. Images persist in the product database and are served from /uploads/. Uploaded images are retained when detached so existing references do not break. Existing brochure text is preserved as a reference when editing legacy products. Removal asks for confirmation. The catalogue, category counts, public JSON and text product guide read the same D1 database; changes need no rebuild. The existing product-range PNG is a static brochure image and does not change.

The admin panel uses email and password login. A private `ADMIN_LOGIN` Worker secret stores the email, random salt and PBKDF2-SHA256 password hash (100,000 iterations); the password is never committed. `ADMIN_KEY` is a private random session-signing secret. Successful login returns a signed session lasting up to eight hours, held only in tab memory. Reloading or signing out clears it. Login attempts are limited per IP and 15-minute window. Password configuration rotation invalidates prior sessions. Legacy bearer access keys are rejected whenever email/password login is configured.

### First-time setup

1. Install Wrangler: `npm install --save-dev wrangler@latest`.
2. Create a D1 database: `npx wrangler d1 create agriya-products`.
3. Add the returned database ID to `wrangler.jsonc` with this binding:

   ```json
   "d1_databases": [{
     "binding": "PRODUCTS_DB",
     "database_name": "agriya-products",
     "database_id": "REPLACE_WITH_RETURNED_DATABASE_ID",
     "migrations_dir": "migrations"
   }]
   ```

4. Seed the 32 existing products once: `npx wrangler d1 migrations apply PRODUCTS_DB --remote`.
5. Set a random signing secret with `npx wrangler secret put ADMIN_KEY`, and store the email, random 16-byte hex salt and password hash as the `ADMIN_LOGIN` JSON secret using the secure prompt. Generate the hash with the exported `passwordHash` function in `server/auth.mjs`; never commit a password.
6. Run `npm test`, `npm run build`, `npx wrangler deploy --dry-run`, then `npx wrangler deploy`.
7. Open `https://agriya-agro-tech.lingachem-agriya.workers.dev/admin` and sign in with your configured email and password.

Until the database is bound, public pages continue using the original catalogue and admin writes return a setup error. After binding, storage failures return an error rather than resurrecting deleted products. Do not re-run the seed SQL manually after deleting products; Wrangler records applied migrations and will not repeat them.

For local development, add a local-only `ADMIN_KEY` to the ignored `.dev.vars`, apply migrations with `npx wrangler d1 migrations apply PRODUCTS_DB --local`, and run `npx wrangler dev`. A plain Python static server previews only the original static assets; it does not run the admin API. Use `npm test` on Node 24+ for API and SQL integration tests.

Back up products with `npx wrangler d1 export PRODUCTS_DB --remote --output products-backup.sql`. Rotate the signing secret using `npx wrangler secret put ADMIN_KEY`; existing tabs must sign in again.

## PDF product guide

Both public catalogue download controls generate an A4 PDF in the browser using the latest `/api/products` data. Each product starts its own page, with a field header, uploaded product photo, a border and footer tinted from the photo, and the existing product sections. Products without photos use the company logo. Unusually long descriptions continue on an additional page rather than losing text. Failed photo downloads are reported after the PDF is saved. No product data is sent to a third-party PDF service.

`client/product-guide.mjs` contains the PDF layout and download flow. `npm run build` bundles jsPDF into a self-hosted asset and embeds it and the subset DejaVu font into the Worker. The font licence is in `site/guide/font-license.txt`. The existing text guide endpoint remains available for older links.
