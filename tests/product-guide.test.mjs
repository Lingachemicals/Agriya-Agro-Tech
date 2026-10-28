import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProductGuide,imageAccent} from '../client/product-guide.mjs';
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
