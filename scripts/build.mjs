import {readFileSync,writeFileSync} from 'node:fs';
const types={'/':'text/html; charset=utf-8','/assets/style.css':'text/css; charset=utf-8','/assets/bootstrap.min.css':'text/css; charset=utf-8','/assets/bootstrap.bundle.min.js':'text/javascript; charset=utf-8','/site/agriya-theme.css':'text/css; charset=utf-8','/site/agriya-logo.png':'image/png','/site/agriya-loading.gif':'image/gif','/site/app.js':'text/javascript; charset=utf-8','/site/products.json':'application/json; charset=utf-8','/site/product-guide.txt':'text/plain; charset=utf-8','/site/leaf.svg':'image/svg+xml','/site/field.jpg':'image/jpeg','/site/product-range.png':'image/png'};
const files={};for(const [url,type] of Object.entries(types)){const path=url==='/'?'index.html':url.slice(1);files[url]={type,data:readFileSync(path).toString('base64')};}
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
  page=page.replace(/href="#(?!products)([^"]+)"/g,'href="/#$1"');
  page=page.replace(/<title>[\s\S]*?<\/title>/,'<title>'+(category==='All'?'Products':category)+' | Agriya Agro Tech</title>');
  files[path]={type:'text/html; charset=utf-8',data:Buffer.from(page).toString('base64')};
}
const source=`const files=${JSON.stringify(files)};
export default {fetch(request){const url=new URL(request.url);const path=url.pathname.replace(/\\/$/,'')||'/';const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY'};if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD'}});if(path==='/robots.txt')return new Response('User-agent: *\\nAllow: /',{headers:{...headers,'Content-Type':'text/plain'}});if(path==='/index.html'||path==='/theme2'||path.startsWith('/theme2/')||path.startsWith('/document/')||(/^\\/[^/]+\\.html$/.test(path)&&path!=='/index.html'))return new Response(null,{status:302,headers:{...headers,Location:'/'}});const file=files[path];if(!file)return new Response('Page not found. Visit Agriya Agro Tech at /.',{status:404,headers});const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{...headers,'Content-Type':file.type,'Cache-Control':file.type.startsWith('text/html')?'no-cache':'public, max-age=3600'}});}};
`;writeFileSync('worker.mjs',source);console.log('Built Worker with '+Object.keys(files).length+' routes');
