import {jsPDF} from 'jspdf';
import {productSections, sectionDefinitions} from '../server/sections.mjs';

const GREEN = [18, 112, 50];
const clean = value => String(value || '').replace(/[\u2010-\u2015]/g, '-').replace(/\r/g, '');

// Select a saturated packaging colour, ignoring white backgrounds and near-black text.
export function imageAccent(rgba) {
  const bins = new Map();
  for (let i = 0; i < rgba.length; i += 4) {
    const rgb = [...rgba.slice(i, i + 3)], high = Math.max(...rgb), low = Math.min(...rgb);
    if (rgba[i + 3] < 180 || high < 65 || high - low < 50 || low > 175) continue;
    const key = rgb.map(v => Math.floor(v / 40)).join(',');
    const bin = bins.get(key) || {sum:[0,0,0], count:0};
    rgb.forEach((v, j) => bin.sum[j] += v); bin.count++; bins.set(key, bin);
  }
  const best = [...bins.values()].sort((a,b) => b.count-a.count)[0];
  return best ? best.sum.map(v => Math.round(v / best.count)) : GREEN;
}

function contain(doc, image, x, y, w, h) {
  if (!image) return;
  const scale = Math.min(w / image.width, h / image.height);
  const iw = image.width * scale, ih = image.height * scale;
  doc.addImage(image.data, 'JPEG', x + (w-iw)/2, y + (h-ih)/2, iw, ih, image.alias, 'FAST');
}

function textLines(doc, product, size) {
  doc.setFont('Guide','normal'); doc.setFontSize(size);
  const entries = sectionDefinitions.filter(([key]) => productSections(product)[key]);
  return entries.flatMap(([key,label]) => [
    {text:label.toUpperCase(), heading:true},
    ...doc.splitTextToSize(clean(productSections(product)[key]).replace(/([^\n])\n(?!\n|[•*-]\s)/g,'$1 '), 82).map(text => ({text})),
    {text:'',gap:true}
  ]);
}

export function createProductGuide(products, assets, onProgress = () => {}) {
  const doc = new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
  doc.addFileToVFS('Guide.ttf',assets.font); doc.addFont('Guide.ttf','Guide','normal');
  doc.setProperties({title:'Agriya Agro Tech - Product Guide',author:'Agriya Agro Tech',subject:'Agricultural inputs product catalogue'});
  let pageCount = 0;
  const footer = (accent, number) => {
    doc.setFillColor(...accent); doc.rect(7,262,196,28,'F');
    doc.setTextColor(255,255,255); doc.setFont('Guide','normal'); doc.setFontSize(20);
    doc.text('AGRIYA AGRO TECH',105,271,{align:'center'});
    doc.setFont('Guide','normal'); doc.setFontSize(7.7);
    doc.text('Plot No: 49, Women Industrial Park, Kappalur, Madurai - 625 008. Tamil Nadu.',105,277,{align:'center'});
    doc.text('1800 102 3700  |  agriyaagrotech@gmail.com  |  www.agriyaagro.com',105,282,{align:'center'});
    doc.setTextColor(85,101,91); doc.setFontSize(6.8);
    doc.text('Follow the current product label for application.  |  Product guide  |  '+number,105,294,{align:'center'});
  };
  for (const [index, product] of products.entries()) {
    const photo = assets.photos?.[product.slug];
    const rawAccent=photo?.accent || GREEN;
    const brightness=rawAccent[0]*.299+rawAccent[1]*.587+rawAccent[2]*.114;
    const accent=brightness>140 ? rawAccent.map(v=>Math.round(v*140/brightness)) : rawAccent;
    // Fit the actual two-column flow, including heading keep-with-next spacing.
    const fits=(lines,size,start)=>{
      const leading=size*.3528*1.32;let y=start,column=0;
      for(const line of lines){
        const height=line.heading ? leading+2 : line.gap ? 1.5 : leading;
        if(y+height+(line.heading ? leading*2 : 0)>255){column++;y=start;}
        if(column>1)return false;y+=height+(line.heading ? 1.5 : 0);
      }return true;
    };
    let size=8.2,photoHeight=46,firstStart=photo ? 127 : 100,remaining;
    const starts=photo ? [157,147,137,127] : [122,110,100];
    outer:for(const start of starts){
      for(const candidate of [10.2,9.8,9.4,9,8.6,8.2]){
        const lines=textLines(doc,product,candidate);
        if(fits(lines,candidate,start)){size=candidate;firstStart=start;photoHeight=start-81;remaining=lines;break outer;}
      }
    }
    remaining ||= textLines(doc,product,size);
    let continuation = false;
    do {
      if (pageCount++) doc.addPage();
      doc.setFillColor(255,255,255); doc.rect(0,0,210,297,'F');
      doc.setDrawColor(...accent); doc.setLineWidth(2.3); doc.roundedRect(6,6,198,284,7,7,'S');
      doc.setLineWidth(.45); doc.roundedRect(9,9,192,278,5,5,'S');
      // Crop photograph and bright title panel echo the supplied product leaflet.
      if (assets.field) {
        doc.saveGraphicsState(); doc.rect(10,10,190,34,null); doc.clip(); doc.discardPath();
        const scale=Math.max(190/assets.field.width,34/assets.field.height);
        const w=assets.field.width*scale,h=assets.field.height*scale;
        doc.addImage(assets.field.data,'JPEG',10+(190-w)/2,10+(34-h)/2,w,h,assets.field.alias,'FAST');
        doc.restoreGraphicsState();
      } else {doc.setFillColor(232,244,233); doc.rect(10,10,190,34,'F');}
      doc.setFillColor(255,255,255); doc.roundedRect(39,16,154,23,7,7,'F');
      contain(doc,assets.logo,13,15,22,23);
      doc.setTextColor(...accent); doc.setFont('Guide','normal'); doc.setFontSize(24);
      const title = clean(product.name)+(continuation ? ' (continued)' : '');
      const nameLines = doc.splitTextToSize(title,142);
      if(nameLines.length>1) doc.setFontSize(Math.max(11,24 * 142 / doc.getTextWidth(title)));
      doc.text(title,116,31,{align:'center',maxWidth:145});
      doc.setTextColor(...GREEN); doc.setFontSize(9); doc.text(clean(product.category).toUpperCase(),105,51,{align:'center'});
      doc.setTextColor(65,79,69); doc.setFontSize(9);
      let technical = doc.splitTextToSize(clean(product.technical),176), technicalSize=9;
      while(technical.length>3 && technicalSize>6){doc.setFontSize(technicalSize-=.5);technical=doc.splitTextToSize(clean(product.technical),176);}
      doc.text(technical,105,57,{align:'center',lineHeightFactor:1.25});
      let start = 74;
      if(!continuation) {
        if(photo) {contain(doc,photo,22,72,166,photoHeight); start=firstStart;}
        else { // Show supplied company branding until a product photo is uploaded.
          contain(doc,assets.logo,82,72,46,firstStart-82); start=firstStart;
        }
      }
      doc.setDrawColor(...accent); doc.setLineWidth(.9); doc.line(17,start-5,193,start-5);
      const leading = size * .3528 * 1.32, bottom = 255;
      let column=0, y=start, cursor=0;
      for (; cursor<remaining.length; cursor++) {
        const line=remaining[cursor], height=line.heading ? leading+2 : line.gap ? 1.5 : leading;
        const nextHeight=line.heading && remaining[cursor+1] ? leading*2 : 0;
        if(y+height+nextHeight>bottom) {column++; y=start;}
        if(column>1) break;
        const x=18+column*91;
        if(line.heading) {doc.setTextColor(...accent); doc.setFont('Guide','normal'); doc.setFontSize(size); y+=1.5;}
        else {doc.setTextColor(42,57,47); doc.setFont('Guide','normal'); doc.setFontSize(size);}
        if(!line.gap) doc.text(line.text,x,y);
        y+=height;
      }
      remaining=remaining.slice(cursor); continuation=true;
      footer(accent,pageCount);
    } while(remaining.length);
    onProgress(index+1, products.length);
  }
  return doc;
}

async function checkedFetch(url, type='json') {
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok) throw new Error('Could not load the latest product guide. Please try again.');
  return response[type]();
}
export async function loadGuideImage(url, alias) {
  const blob=await checkedFetch(url,'blob');
  const bitmap=await createImageBitmap(blob);
  try {
    const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale);
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const sample=document.createElement('canvas');sample.width=64;sample.height=64;
    const s=sample.getContext('2d',{willReadFrequently:true});s.drawImage(canvas,canvas.width*.35,canvas.height*.25,canvas.width*.3,canvas.height*.6,0,0,64,64);
    return {data:canvas.toDataURL('image/jpeg',.9),width:canvas.width,height:canvas.height,alias,accent:imageAccent(s.getImageData(0,0,64,64).data)};
  } finally {bitmap.close();}
}

export function selectGuideProducts(products, scope = {}) {
  if (scope.slug !== undefined) return products.filter(p => p.slug === scope.slug);
  if (scope.category && scope.category !== 'All') return products.filter(p => p.category === scope.category);
  return products;
}

export function guideFilename(scope, products) {
  const label=scope.slug !== undefined ? products[0]?.name : scope.category && scope.category !== 'All' ? scope.category : 'Product Guide';
  const name=String(label || 'Product').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');
  return 'Agriya-'+name+'.pdf';
}

export async function downloadProductGuide(button) {
  const buttons=[...document.querySelectorAll('[data-download-guide]')];
  if(buttons.some(b=>b.getAttribute('aria-busy')==='true')) return;
  const status=button.closest('dialog')?.querySelector('#guide-dialog-status') || document.querySelector('#guide-status');
  buttons.forEach(b=>{b.setAttribute('aria-busy','true');b.setAttribute('aria-disabled','true');});
  const dialog=button.closest('dialog');
  const scope=dialog ? {slug:dialog.dataset.productSlug || ''} : {category:document.querySelector('#products')?.dataset.category || 'All'};
  let missing=[];
  try {
    status.textContent='Preparing your PDF product guide…';
    const [catalogue,font,logo,field]=await Promise.all([
      checkedFetch('/api/products'), checkedFetch('/site/guide/font.ttf','arrayBuffer'),
      loadGuideImage('/site/agriya-logo.png','agriya-logo'),loadGuideImage('/site/field.jpg','agriya-field')
    ]);
    const products=selectGuideProducts(catalogue,scope);
    if(!products.length) throw new Error('No products are available for this download. Refresh the page and try again.');
    // Limit parallel image downloads to keep memory use modest on mobile devices.
    const photos={}; let next=0,loaded=0;
    await Promise.all(Array.from({length:3},async()=>{
      while(next<products.length){const p=products[next++];if(p.image){try{photos[p.slug]=await loadGuideImage(p.image,p.slug);}catch{missing.push(p.name);}}
        loaded++;status.textContent=`Preparing PDF: ${loaded} of ${products.length} products…`;}
    }));
    let binary=''; for(const byte of new Uint8Array(font)) binary+=String.fromCharCode(byte);
    const pdf=createProductGuide(products,{font:btoa(binary),logo,field,photos});
    await pdf.save(guideFilename(scope,products),{returnPromise:true});
    status.textContent='PDF product guide downloaded.'+(missing.length ? ' Some photos could not be included: '+missing.join(', ')+'. Upload these photos in the admin panel and download again.' : '');
  } catch(error) {status.textContent=error.message || 'The PDF could not be downloaded. Please try again.';}
  finally {buttons.forEach(b=>{b.removeAttribute('aria-busy');b.removeAttribute('aria-disabled');});}
}

if(typeof document!=='undefined') document.addEventListener('click',event=>{
  const button=event.target.closest('[data-download-guide]');
  if(button){event.preventDefault();downloadProductGuide(button);}
});
