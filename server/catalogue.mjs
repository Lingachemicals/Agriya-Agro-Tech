import {sectionDefinitions, productSections, sectionsContent} from './sections.mjs';
export const categories = ['Bio Fertilizers','Bio Control Agents','Bio Pesticides','Microbial Composter','Special Products','Agriya Special Kit'];
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const categorySlug = value => value.toLowerCase().replace(/[^a-z0-9]+/g,'-');
export function validateProduct(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Enter product details.');
  const text = (key, max, required = true) => {
    if (typeof input[key] !== 'string' || input[key].length > max || (required && !input[key].trim())) throw new Error(`Invalid ${key} (maximum ${max} characters).`);
    return input[key].trim();
  };
  const name = text('name', 160), technical = text('technical', 500);
  if (!categories.includes(input.category)) throw new Error('Choose a product category.');
  let sections;
  if (input.sections !== undefined) {
    if (!input.sections || typeof input.sections !== 'object' || Array.isArray(input.sections)) throw new Error('Enter product sections.');
    sections = Object.fromEntries(sectionDefinitions.map(([key,label]) => { const value = input.sections[key] ?? ''; if (typeof value !== 'string' || value.length > 15000) throw new Error(label+' must be under 15,000 characters.'); return [key,value.trim()]; }));
    if (!sections.shortDescription) throw new Error('Enter a short description.');
    input = {...input,content:sectionsContent(sections)};
  }
  if (!Array.isArray(input.content) || input.content.length < 1 || input.content.length > 10 || input.content.some(p => typeof p !== 'string' || p.length > 15000) || !input.content.some(p => p.trim())) throw new Error('Enter a description (up to 10 sections of 15,000 characters).');
  const aliases = input.aliases ?? [];
  if (!Array.isArray(aliases) || aliases.length > 20 || aliases.some(a => typeof a !== 'string' || a.length > 160)) throw new Error('Invalid search aliases.');
  const image = input.image ?? '';
  if (typeof image !== 'string' || image.length > 2000) throw new Error('Invalid image URL.');
  if (image && !/^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(image)) { let url; try { url = new URL(image); } catch { throw new Error('Enter a complete HTTPS image URL.'); } if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS image URL without credentials.'); }
  return {name, technical, category: input.category, aliases: aliases.map(a => a.trim()).filter(Boolean), content: input.content.map(p => p.trim()), image, ...(sections ? {sections} : {})};
}
export function renderCatalogue(html, products, category) {
  const visible = products.filter(p => category === 'All' || p.category === category);
  const cards = visible.map(p => `<article class="product" data-category="${escapeHTML(p.category)}" data-search="${escapeHTML([p.name,p.technical,...p.aliases,...p.content].join(' '))}" data-slug="${escapeHTML(p.slug)}"><div class="product-top"><span class="leaf-icon">❧</span><span>${escapeHTML(p.category)}</span></div>${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy" referrerpolicy="no-referrer" class="product-image"/>` : ''}<h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.technical)}</p><button class="product-button" data-product="${escapeHTML(p.name)}" type="button">View full details <span aria-hidden="true">↗</span></button></article>`).join('');
  html = html.replace(/<div class="products">[\s\S]*?<\/article><\/div>/, `<div class="products">${cards}</div>`);
  html = html.replace(/<template id="details-[\s\S]*?<\/template>/g, '');
  const templates = visible.map(p => {
    const sections = productSections(p);
    const details = sectionDefinitions.filter(([key]) => sections[key]).map(([key,label]) => `<section class="brochure-copy"><h4>${label}</h4><p style="white-space:pre-line">${escapeHTML(sections[key])}</p></section>`).join('');
    const original = !p.sections ? `<details><summary>Original brochure text</summary><p style="white-space:pre-line">${escapeHTML(p.content.join('\n\n'))}</p></details>` : '';
    return `<template id="details-${escapeHTML(p.slug)}">${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" referrerpolicy="no-referrer" class="product-detail-image"/>` : ''}<div class="brochure-detail">${details}</div>${original}</template>`;
  }).join('');
  html = html.replace('</body>', templates + '</body>');
  return html.replace(/(<p id="result-count" role="status">).*?(<\/p>)/, (_, start, end) => start + visible.length + ' products' + end);
}
export function renderCounts(html, products) {
  let i = 0;
  return html.replace(/\d+ products? in the Agriya catalogue\./g, () => { const category = categories[i++]; const n = products.filter(p => p.category === category).length; return `${n} ${n === 1 ? 'product' : 'products'} in the Agriya catalogue.`; });
}
