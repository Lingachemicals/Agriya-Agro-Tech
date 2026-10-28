import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker.mjs';
import {validateProduct} from '../server/catalogue.mjs';
const seed=JSON.parse(readFileSync(new URL('../site/products.json',import.meta.url)));
const key='test-only-random-length-admin-key-1234567890';
function database() {
  const db=new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../migrations/0001_products.sql',import.meta.url),'utf8'));
  return {prepare(sql){const statement=db.prepare(sql);let args=[];const query={bind(...values){args=values;return query;},async all(){return {results:statement.all(...args)};},async run(){const result=statement.run(...args);return {meta:{changes:Number(result.changes)}};}};return query;},close:()=>db.close()};
}
function request(path,method='GET',body,token=key,origin) {return new Request('https://example.com'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json',...(origin?{Origin:origin}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
const product={name:'Test Product <script>',technical:'Technical & test',category:'Bio Fertilizers',content:['Benefits\nLine two','Dosage: follow label'],aliases:['test alias'],image:'https://example.com/product.png'};
test('admin fails closed without configuration; existing catalogue remains available',async()=>{
  assert.equal((await worker.fetch(request('/api/admin/products'))).status,503);
  const response=await worker.fetch(request('/products'));
  assert.equal(response.status,200);const html=await response.text();assert.equal((html.match(/<article class="product"/g)||[]).length,32);
});
test('seed migration preserves all 32 products and descriptions',async()=>{
  const db=database();const env={PRODUCTS_DB:db,ADMIN_KEY:key};
  const data=await (await worker.fetch(request('/api/admin/products'),env)).json();
  assert.equal(data.products.length,32);assert.deepEqual(data.products.map(({revision,...p})=>p),seed);
  db.close();
});
test('reject unauthorized writes, cross-origin writes, invalid payloads and unsupported routes',async()=>{
  const db=database(),env={PRODUCTS_DB:db,ADMIN_KEY:key};
  for(const token of ['', 'wrong']) assert.equal((await worker.fetch(request('/api/admin/products','POST',product,token),env)).status,401);
  assert.equal((await worker.fetch(request('/api/admin/products','POST',product,key,'https://evil.example'),env)).status,403);
  assert.equal((await worker.fetch(request('/api/admin/products','POST',{...product,category:'Invalid'}),env)).status,400);
  assert.equal((await worker.fetch(request('/api/admin/products','POST',{...product,image:'javascript:alert(1)'}),env)).status,400);
  assert.equal((await worker.fetch(request('/api/admin/products','PATCH',product),env)).status,405);
  assert.equal((await worker.fetch(request('/api/admin/products/azolin-lf','PUT',null),env)).status,400);
  assert.equal((await worker.fetch(request('/api/admin/unknown'),env)).status,404);
  assert.throws(()=>validateProduct({...product,content:['x'.repeat(15001)]}));
  const oversized=new Request('https://example.com/api/admin/products',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:' '.repeat(180001)});
  assert.equal((await worker.fetch(oversized,env)).status,400);db.close();
});
test('add, edit and remove persist across requests and update public pages, counts and guide',async()=>{
  const db=database(),env={PRODUCTS_DB:db,ADMIN_KEY:key};
  const response=await worker.fetch(request('/api/admin/products','POST',product),env);assert.equal(response.status,201);
  const created=(await response.json()).product;assert.equal(created.revision,1);
  let html=await (await worker.fetch(request('/products/bio-fertilizers'),env)).text();
  assert.match(html,/Test Product &lt;script&gt;/);assert.doesNotMatch(html,/Test Product <script>/);assert.match(html,/Technical &amp; test/);assert.match(html,/https:\/\/example.com\/product.png/);
  assert.match(await (await worker.fetch(request('/'),env)).text(),/13 products in the Agriya catalogue/);
  assert.match(await (await worker.fetch(request('/site/product-guide.txt'),env)).text(),/Test Product <script>/);
  assert.equal((await worker.fetch(request('/api/admin/products/'+created.slug,'PUT',{...product,name:'Edited product',category:'Special Products',revision:1}),env)).status,200);
  html=await (await worker.fetch(request('/products/bio-fertilizers'),env)).text();assert.doesNotMatch(html,/Edited product/);
  assert.match(await (await worker.fetch(request('/products/special-products'),env)).text(),/Edited product/);
  assert.equal((await worker.fetch(request('/api/admin/products/'+created.slug,'DELETE',{revision:1}),env)).status,409);
  assert.equal((await worker.fetch(request('/api/admin/products/'+created.slug,'PUT',{...product,revision:1}),env)).status,409);
  assert.equal((await worker.fetch(request('/api/admin/products/'+created.slug,'DELETE',{revision:2}),env)).status,200);
  assert.doesNotMatch(await (await worker.fetch(request('/products'),env)).text(),/Edited product/);
  assert.equal((await (await worker.fetch(request('/site/products.json'),env)).json()).length,32);db.close();
});
test('an empty database stays empty and admin responses are uncached',async()=>{
  const db=database(),env={PRODUCTS_DB:db,ADMIN_KEY:key};await db.prepare('DELETE FROM products').run();
  const response=await worker.fetch(request('/api/admin/products'),env);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual((await response.json()).products,[]);
  const html=await (await worker.fetch(request('/products'),env)).text();assert.doesNotMatch(html,/<article class="product"/);assert.doesNotMatch(html,/id="details-/);
  const admin=await worker.fetch(request('/admin'),env);assert.equal(admin.status,200);assert.match(admin.headers.get('Content-Security-Policy'),/script-src 'self'/);assert.equal(admin.headers.get('X-Robots-Tag'),'noindex, nofollow');
  assert.equal((await worker.fetch(request('/admin/app.js'),env)).status,200);db.close();
});
