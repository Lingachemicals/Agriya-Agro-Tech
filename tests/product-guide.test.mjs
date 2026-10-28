import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProductGuide,imageAccent,selectGuideProducts,guideFilename} from '../client/product-guide.mjs';
import worker from '../worker.mjs';
const font=readFileSync(new URL('../site/guide/font.ttf',import.meta.url)).toString('base64');
const products=JSON.parse(readFileSync(new URL('../site/products.json',import.meta.url)));

test('guide uses one A4 page per catalogue product and outputs a PDF',()=>{
  const pdf=createProductGuide(products,{font});
  assert.equal(pdf.getNumberOfPages(),products.length);
  assert.ok(Math.abs(pdf.internal.pageSize.getWidth()-210)<.01);
  assert.match(pdf.output(),/^%PDF-/);
});
test('very long descriptions continue without dropping text',()=>{
  const product={...products[0],sections:{benefits:'Preserved content. '.repeat(3000)}};
  const pdf=createProductGuide([product],{font});
  assert.ok(pdf.getNumberOfPages()>1);
});
test('photo theme ignores white backgrounds and black text',()=>{
  assert.deepEqual(imageAccent(new Uint8ClampedArray([255,255,255,255,0,0,0,255,180,20,160,255])),[180,20,160]);
  assert.deepEqual(imageAccent(new Uint8ClampedArray([255,255,255,255])),[18,112,50]);
});
test('both catalogue download controls use the PDF bundle and expose progress',async()=>{
  const page=await(await worker.fetch(new Request('https://example.com/products'))).text();
  assert.equal((page.match(/data-download-guide=/g)||[]).length,2);
  assert.ok(page.includes('Download Product Guide (PDF)'));
  assert.ok(page.includes('/site/guide/product-guide.js'));
  assert.ok(page.includes('id="guide-dialog-status"'));
  for(const path of ['/site/guide/product-guide.js','/site/guide/font.ttf']){
    const response=await worker.fetch(new Request('https://example.com'+path));assert.equal(response.status,200);
  }
});


test('PDF selection follows product, category and all-products context',()=>{
  const other={...products[0],slug:'same-name-different-product',category:'Special Products'};
  const catalogue=[...products,other];
  const single=selectGuideProducts(catalogue,{slug:'azolin-lf'});
  assert.equal(single.length,1);assert.equal(single[0].slug,'azolin-lf');
  assert.equal(guideFilename({slug:'azolin-lf'},single),'Agriya-Azolin-LF.pdf');
  const fertilizers=selectGuideProducts(catalogue,{category:'Bio Fertilizers'});
  assert.equal(fertilizers.length,12);assert.ok(fertilizers.every(p=>p.category==='Bio Fertilizers'));
  assert.equal(guideFilename({category:'Bio Fertilizers'},fertilizers),'Agriya-Bio-Fertilizers.pdf');
  assert.equal(selectGuideProducts(catalogue,{category:'All'}).length,catalogue.length);
  assert.equal(guideFilename({category:'All'},catalogue),'Agriya-Product-Guide.pdf');
  assert.deepEqual(selectGuideProducts(catalogue,{slug:'deleted-product'}),[]);
  assert.deepEqual(selectGuideProducts(catalogue,{slug:''}),[]);
  assert.deepEqual(selectGuideProducts(catalogue,{category:'Removed Category'}),[]);
});
