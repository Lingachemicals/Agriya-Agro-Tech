import {sectionDefinitions, productSections} from '/admin/sections.js?v=sections2';
const $ = id => document.getElementById(id);
let key = '', products = [], categories = [], editing = null, removing = null, busy = false, uploading = false;
const status = (text, error = false) => { $('status').textContent = text; $('status').classList.toggle('error',error); };
async function api(path = '', options = {}) {
  const response = await fetch('/api/admin/products'+path,{...options,headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},cache:'no-store'});
  const data = await response.json();
  if (response.status === 401) lock();
  if (!response.ok) throw new Error(data.error || 'Could not save. Please try again.');
  return data;
}
function lock() { key=''; products=[]; $('products').replaceChildren(); $('dashboard').hidden=true; $('logout').hidden=true; $('login').hidden=false; $('editor').close(); $('remove-dialog').close(); $('access-key').value=''; $('access-key').focus(); status('Panel locked.'); }
function fillCategories() {
  for (const id of ['category','category-filter']) { const select=$(id); select.replaceChildren(); if (id==='category-filter') select.add(new Option('All categories','')); categories.forEach(c=>select.add(new Option(c,c))); }
}
function render() {
  const query=$('search').value.trim().toLowerCase(), category=$('category-filter').value;
  const shown=products.filter(p=>(!category || p.category===category) && [p.name,p.technical,...p.aliases].join(' ').toLowerCase().includes(query));
  $('products').replaceChildren(); $('total').textContent=products.length; $('empty').hidden=shown.length>0;
  shown.forEach(p=>{
    const card=document.createElement('article'); card.className='product-card';
    const category=document.createElement('span'); category.className='category'; category.textContent=p.category;
    const title=document.createElement('h2'); title.textContent=p.name;
    const description=document.createElement('p'); description.textContent=p.technical;
    const actions=document.createElement('div'); actions.className='card-actions';
    const edit=document.createElement('button'); edit.textContent='Edit product'; edit.setAttribute('aria-label','Edit '+p.name); edit.onclick=()=>openEditor(p);
    const remove=document.createElement('button'); remove.className='remove'; remove.textContent='Remove'; remove.setAttribute('aria-label','Remove '+p.name); remove.onclick=()=>{removing=p;$('remove-message').textContent='Remove “'+p.name+'”?';$('remove-error').textContent='';$('remove-dialog').showModal();};
    actions.append(edit,remove); card.append(category,title,description,actions); $('products').append(card);
  });
}
async function refresh() { const data=await api(); products=data.products; categories=data.categories; render(); }
function openEditor(product=null) {
  editing=product; $('product-form').reset(); $('editor-title').textContent=product?'Edit product':'Add product'; $('editor-error').textContent='';
  if(product) { ['name','technical','category'].forEach(id=>$(id).value=product[id]); const sections=productSections(product); sectionDefinitions.forEach(([id])=>$(id).value=sections[id]); $('aliases').value=product.aliases.join('\n'); $('image').value=product.image||''; }
  const original = product && (product.sourceContent || (!product.sections && product.content));
  $('source-details').hidden=!original; $('source-details').open=false; $('source-content').textContent=original ? original.join('\n\n') : '';
  $('upload-status').textContent=''; $('image-file').value=''; updateImagePreview();
  $('editor').showModal(); $('name').focus();
}
$('login-form').onsubmit=async e=>{
  e.preventDefault(); const button=e.submitter; button.disabled=true; key=$('access-key').value;
  try { const data=await api(); products=data.products; categories=data.categories; fillCategories(); render(); $('access-key').value=''; $('login').hidden=true; $('dashboard').hidden=false; $('logout').hidden=false; status('Catalogue loaded.'); }
  catch(error) { key='';status(error.message,true); } finally {button.disabled=false;}
};
$('logout').onclick=lock;
$('search').oninput=render; $('category-filter').onchange=render;
$('refresh').onclick=async()=>{try{await refresh();status('Catalogue refreshed.');}catch(e){status(e.message,true);}};
$('add').onclick=()=>openEditor();
$('editor').querySelectorAll('.close').forEach(b=>b.onclick=()=>{if(!busy&&!uploading)$('editor').close();});
$('editor').addEventListener('cancel',e=>{if(busy||uploading)e.preventDefault();});
$('product-form').onsubmit=async e=>{
  e.preventDefault(); if(busy||uploading)return; busy=true; $('save').disabled=true; $('editor-error').textContent='';
  const sections=Object.fromEntries(sectionDefinitions.map(([id])=>[id,$(id).value]));
  const payload={name:$('name').value,technical:$('technical').value,category:$('category').value,sections,aliases:$('aliases').value.split('\n').map(a=>a.trim()).filter(Boolean),image:$('image').value.trim()};
  if(editing)payload.revision=editing.revision;
  let saved=false;
  try { await api(editing?'/'+editing.slug:'',{method:editing?'PUT':'POST',body:JSON.stringify(payload)}); saved=true; $('editor').close(); await refresh(); status('Product saved. The website catalogue is updated.'); }
  catch(error) { if(saved)status('Product saved, but refresh failed. Refresh the catalogue before making another change.',true); else $('editor-error').textContent=error.message; }
  finally {busy=false;$('save').disabled=false;}
};
$('cancel-remove').onclick=()=>{if(!busy)$('remove-dialog').close();};
$('remove-dialog').addEventListener('cancel',e=>{if(busy||uploading)e.preventDefault();});
$('confirm-remove').onclick=async()=>{
  if(busy||!removing)return; busy=true;$('confirm-remove').disabled=true;let removed=false;
  try{await api('/'+removing.slug,{method:'DELETE',body:JSON.stringify({revision:removing.revision})});removed=true;$('remove-dialog').close();await refresh();status('Product removed from the website catalogue.');}
  catch(error){if(removed)status('Product removed, but refresh failed. Refresh the catalogue.',true);else $('remove-error').textContent=error.message;}
  finally{busy=false;$('confirm-remove').disabled=false;}
};

function updateImagePreview() {
  const value=$('image').value.trim();
  const valid=value.startsWith('/uploads/') || /^https:\/\//i.test(value);
  $('image-preview').hidden=!valid; $('remove-image').hidden=!value;
  if(valid)$('image-preview').src=value;else $('image-preview').removeAttribute('src');
}
$('image').addEventListener('input',updateImagePreview);
$('remove-image').onclick=()=>{if(uploading)return;$('image').value='';$('image-file').value='';$('upload-status').textContent='Image removed. Save the product to apply.';updateImagePreview();};
async function uploadImage(file) {
  if(uploading||!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){ $('upload-status').textContent='Choose a JPG, PNG or WebP image.';return; }
  if(file.size>10000000){$('upload-status').textContent='Choose an image under 10 MB.';return;}
  uploading=true;$('save').disabled=true;$('image-file').disabled=true;$('upload-status').textContent='Uploading image…';
  try {
    let upload=file;
    if(file.size>1000000){
      const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      upload=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
      if(!upload||upload.size>1000000)throw new Error('This image is too large. Choose a smaller image.');
    }
    const response=await fetch('/api/admin/images',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':upload.type},body:upload});
    const data=await response.json();if(response.status===401)lock();if(!response.ok)throw new Error(data.error||'Image upload failed.');
    if(!key)return;
    $('image').value=data.image;updateImagePreview();$('upload-status').textContent='Image uploaded. Save the product to apply it.';
  } catch(error){$('upload-status').textContent=error.message;}
  finally {uploading=false;$('save').disabled=busy;$('image-file').disabled=false;$('image-file').value='';}
}
$('image-file').onchange=e=>uploadImage(e.target.files[0]);
for(const type of ['dragenter','dragover'])$('drop-zone').addEventListener(type,e=>{e.preventDefault();$('drop-zone').classList.add('drag-over');});
for(const type of ['dragleave','drop'])$('drop-zone').addEventListener(type,e=>{e.preventDefault();$('drop-zone').classList.remove('drag-over');});
$('drop-zone').addEventListener('drop',e=>{if(e.dataTransfer.files.length!==1){$('upload-status').textContent='Choose one product image at a time.';return;}uploadImage(e.dataTransfer.files[0]);});
