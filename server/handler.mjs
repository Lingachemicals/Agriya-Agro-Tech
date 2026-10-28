import {categories, categorySlug, validateProduct, renderCatalogue, renderCounts} from './catalogue.mjs';
const security = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY'};
const json = (body, status = 200) => Response.json(body, {status, headers:{...security,'Cache-Control':'no-store'}});
async function authorized(request, env) {
  if (!env.ADMIN_KEY || env.ADMIN_KEY.length < 32) return false;
  const supplied = request.headers.get('Authorization') || '';
  if (!supplied.startsWith('Bearer ') || supplied.length <= 7 || supplied.length > 1024) return false;
  const encode = value => new TextEncoder().encode(value);
  const importKey = value => crypto.subtle.importKey('raw', encode(value), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
  const [expectedKey, suppliedKey] = await Promise.all([importKey(env.ADMIN_KEY), importKey(supplied.slice(7))]);
  const challenge = encode('Agriya product administration');
  const signature = await crypto.subtle.sign('HMAC', expectedKey, challenge);
  // Native HMAC verification compares signatures without a JavaScript secret comparison.
  return crypto.subtle.verify('HMAC', suppliedKey, signature, challenge);
}
async function list(env, seed) {
  if (!env.PRODUCTS_DB) return seed.map(p => ({...p, revision:1}));
  const {results} = await env.PRODUCTS_DB.prepare('SELECT data, revision FROM products ORDER BY sort_order, slug').all();
  return results.map(row => ({...JSON.parse(row.data), revision:row.revision}));
}
async function bodyJSON(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new Error('Send JSON product details.');
  const reader = request.body?.getReader(); if (!reader) throw new Error('Missing product details.');
  const chunks = []; let size = 0;
  while (true) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 180000) { await reader.cancel(); throw new Error('Product details are too large.'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('Invalid JSON product details.'); }
}
export function createHandler(files, seed) {
  const decode = file => new TextDecoder().decode(Uint8Array.from(atob(file.data), c => c.charCodeAt(0)));
  return {async fetch(request, env = {}) {
    const url = new URL(request.url), path = url.pathname.replace(/\/$/,'') || '/';
    try {
      if (path.startsWith('/api/admin/')) {
        if (!env.PRODUCTS_DB || !env.ADMIN_KEY || env.ADMIN_KEY.length < 32) return json({error:'Admin setup is incomplete. Configure the product database and admin access key.'},503);
        if (!await authorized(request,env)) return json({error:'Invalid admin access key.'},401);
        const origin = request.headers.get('Origin');
        if (origin && origin !== url.origin) return json({error:'This origin is not allowed.'},403);
        const match = path.match(/^\/api\/admin\/products(?:\/([a-z0-9-]+))?$/);
        if (!match) return json({error:'Not found.'},404);
        const slug = match[1];
        if (request.method === 'GET' && !slug) return json({products:await list(env,seed),categories});
        if (request.method === 'POST' && !slug) {
          let product; try { product = validateProduct(await bodyJSON(request)); } catch(e) { return json({error:e.message},400); }
          product.slug = categorySlug(product.name).replace(/^-|-$/g,'').slice(0,100) || 'product';
          product.slug += '-' + crypto.randomUUID();
          await env.PRODUCTS_DB.prepare('INSERT INTO products (slug, data, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM products))').bind(product.slug,JSON.stringify(product)).run();
          return json({product:{...product,revision:1}},201);
        }
        if (slug && ['PUT','DELETE'].includes(request.method)) {
          let input; try { input = await bodyJSON(request); } catch(e) { return json({error:e.message},400); }
          if (!Number.isSafeInteger(input.revision) || input.revision < 1) return json({error:'Reload the product before saving.'},400);
          let result;
          if (request.method === 'DELETE') result = await env.PRODUCTS_DB.prepare('DELETE FROM products WHERE slug = ? AND revision = ?').bind(slug,input.revision).run();
          else {
            let product; try { product = {...validateProduct(input),slug}; } catch(e) { return json({error:e.message},400); }
            result = await env.PRODUCTS_DB.prepare('UPDATE products SET data = ?, revision = revision + 1 WHERE slug = ? AND revision = ?').bind(JSON.stringify(product),slug,input.revision).run();
          }
          if (!result.meta.changes) return json({error:'This product changed or was removed. Refresh and try again.'},409);
          return json({ok:true});
        }
        return json({error:'Method not allowed.'},405);
      }
      if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{...security,Allow:'GET, HEAD'}});
      let file = files[path];
      if (path === '/robots.txt') return new Response('User-agent: *\nAllow: /\nDisallow: /admin',{headers:{...security,'Content-Type':'text/plain'}});
      if (path === '/index.html' || path === '/theme2' || path.startsWith('/theme2/') || path.startsWith('/document/') || (/^\/[^/]+\.html$/.test(path))) return Response.redirect(url.origin+'/',302);
      if (path === '/api/products' || path === '/site/products.json') return json(await list(env,seed));
      if (path === '/site/product-guide.txt') {
        const products = await list(env,seed);
        return new Response(request.method === 'HEAD' ? null : products.map(p => `${p.name}\n${p.category}\n${p.technical}\n\n${p.content.join('\n\n')}`).join('\n\n────────\n\n'),{headers:{...security,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
      }
      if (!file) return new Response('Page not found.',{status:404,headers:security});
      let content;
      if (path === '/' || path === '/products' || path.startsWith('/products/')) {
        const products = await list(env,seed); content = renderCounts(decode(file),products);
        if (path.startsWith('/products')) { const category = path === '/products' ? 'All' : categories.find(c => categorySlug(c) === path.split('/')[2]); content = renderCatalogue(content,products,category); }
      }
      const headers = {...security,'Content-Type':file.type,'Cache-Control':file.type.startsWith('text/html') ? 'no-store':'public, max-age=3600'};
      if (path.startsWith('/admin')) { headers['X-Robots-Tag']='noindex, nofollow'; headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"; }
      return new Response(request.method === 'HEAD' ? null : content ?? Uint8Array.from(atob(file.data),c => c.charCodeAt(0)),{headers});
    } catch (error) { console.error(JSON.stringify({event:'catalogue_error',message:error.message})); return json({error:'Product storage is unavailable. Please try again shortly.'},503); }
  }};
}
