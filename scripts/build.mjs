import {readFileSync,writeFileSync} from 'node:fs';
import {buildSync} from 'esbuild';
buildSync({entryPoints:['client/product-guide.mjs'],bundle:true,minify:true,format:'esm',platform:'browser',outfile:'site/guide/product-guide.js'});
const types={'/':'text/html; charset=utf-8','/assets/style.css':'text/css; charset=utf-8','/assets/bootstrap.min.css':'text/css; charset=utf-8','/assets/bootstrap.bundle.min.js':'text/javascript; charset=utf-8','/site/agriya-theme.css':'text/css; charset=utf-8','/site/agriya-logo.png':'image/png','/site/agriya-loading.gif':'image/gif','/site/app.js':'text/javascript; charset=utf-8','/site/products.json':'application/json; charset=utf-8','/site/product-guide.txt':'text/plain; charset=utf-8','/site/leaf.svg':'image/svg+xml','/site/field.jpg':'image/jpeg','/site/product-range.png':'image/png'};
Object.assign(types, {'/admin':'text/html; charset=utf-8','/admin/app.js':'text/javascript; charset=utf-8','/admin/style.css':'text/css; charset=utf-8','/admin/sections.js':'text/javascript; charset=utf-8'});
const adminPaths={'/admin':'site/admin.html','/admin/app.js':'site/admin.js','/admin/style.css':'site/admin.css','/admin/sections.js':'server/sections.mjs'};
Object.assign(types, {'/site/guide/product-guide.js':'text/javascript; charset=utf-8','/site/guide/font.ttf':'font/ttf'});
const files={};for(const [url,type] of Object.entries(types)){const path=adminPaths[url]||(url==='/'?'index.html':url.slice(1));files[url]={type,data:readFileSync(path).toString('base64')};}
const home=readFileSync('index.html','utf8');
const catalogue=readFileSync('site/catalogue.html','utf8');
const categories=['Bio Fertilizers','Bio Control Agents','Bio Pesticides','Microbial Composter','Special Products','Agriya Special Kit'];
const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const header=home.slice(0,home.indexOf('</nav>')+6);
const footer=home.slice(home.indexOf('<footer'));
for(const category of ['All',...categories]){
  const path=category==='All'?'/products':'/products/'+slug(category);
  let content=catalogue.replace('id="products" hidden','id="products" data-category="'+category+'"').replace('agriya-catalogue','agriya-catalogue product-page').replace('href="#causes"','href="/#causes"').replace('Find your agricultural input.',category==='All'?'All products':category);
  if(category!=='All')content=content.replace(/<article class="product"[\s\S]*?<\/article>/g,card=>card.includes('data-category="'+category+'"')?card:'');
  let page=header+content+footer;
  page=page.replace('</body>','<script type="module" src="/site/guide/product-guide.js"></script></body>');
  page=page.replace(/href="#(?!products)([^"]+)"/g,'href="/#$1"');
  page=page.replace(/<title>[\s\S]*?<\/title>/,'<title>'+(category==='All'?'Products':category)+' | Agriya Agro Tech</title>');
  files[path]={type:'text/html; charset=utf-8',data:Buffer.from(page).toString('base64')};
}
const source=`import {createHandler} from './server/handler.mjs';
const files=${JSON.stringify(files)};
const seed=${readFileSync('site/products.json','utf8')};
export default createHandler(files,seed);
`;writeFileSync('worker.mjs',source);console.log('Built Worker with '+Object.keys(files).length+' routes');
