const loader=document.querySelector('#preloader');const started=performance.now();let dismissed=false;function dismissLoader(){if(dismissed)return;dismissed=true;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;setTimeout(()=>{loader.classList.add('hide');},Math.max(0,(reduced?0:1100)-(performance.now()-started)));}if(document.readyState==='complete')dismissLoader();else window.addEventListener('load',dismissLoader,{once:true});setTimeout(dismissLoader,3500);const mainNav=document.querySelector('#mainNav');function updateNav(){mainNav.classList.toggle('scrolled',scrollY>30);}window.addEventListener('scroll',updateNav,{passive:true});updateNav();document.querySelectorAll('#navMenu a').forEach(a=>a.addEventListener('click',()=>{if(window.bootstrap)bootstrap.Collapse.getOrCreateInstance(document.querySelector('#navMenu'),{toggle:false}).hide();}));
if(document.querySelector('#search')){
const search=document.querySelector('#search');const filters=[...document.querySelectorAll('.filter')];const cards=[...document.querySelectorAll('.product')];let category=document.querySelector('#products').dataset.category||'All';function filter(){let count=0;const query=search.value.trim().toLowerCase();cards.forEach(card=>{card.hidden=!((category==='All'||card.dataset.category===category)&&card.dataset.search.toLowerCase().includes(query));if(!card.hidden)count++;});document.querySelector('#result-count').textContent=count+' '+(count===1?'product':'products');document.querySelector('#empty').hidden=count>0;filters.forEach(b=>{const active=b.dataset.category===category;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}filters.forEach(b=>b.addEventListener('click',()=>{location.href=b.dataset.category==='All'?'/products':'/products/'+b.dataset.category.toLowerCase().replace(/[^a-z0-9]+/g,'-');}));search.addEventListener('input',filter);document.querySelector('#reset').addEventListener('click',()=>{search.value='';filter();});const dialog=document.querySelector('#product-dialog');document.querySelectorAll('[data-product]').forEach(b=>b.addEventListener('click',()=>{const card=b.closest('.product');dialog.dataset.productSlug=card.dataset.slug;dialog.querySelector('[data-download-guide]').textContent='Download '+b.dataset.product+' (PDF) ↓';dialog.querySelector('#guide-dialog-status').textContent='';document.querySelector('#dialog-title').textContent=b.dataset.product;document.querySelector('#dialog-category').textContent=card.dataset.category;document.querySelector('#dialog-technical').textContent=card.querySelector('p').textContent;document.querySelector('#dialog-content').replaceChildren(document.querySelector('#details-'+card.dataset.slug).content.cloneNode(true));dialog.showModal();dialog.scrollTop=0;}));dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});document.querySelector('#year').textContent=new Date().getFullYear();filter();
}
document.querySelector('#year').textContent=new Date().getFullYear();
const topButton=document.querySelector('#scrollTop');function updateTop(){topButton.classList.toggle('show',scrollY>400);}window.addEventListener('scroll',updateTop,{passive:true});updateTop();function toTop(){window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}topButton.addEventListener('click',toTop);topButton.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toTop();}});document.querySelector('#contactForm')?.addEventListener('submit',e=>{e.preventDefault();const subject=document.querySelector('#cf-subject').value||'Agriya Agro Tech Product Enquiry';const body=['Name: '+document.querySelector('#cf-name').value,'Email: '+document.querySelector('#cf-email').value,'Message: '+document.querySelector('#cf-message').value].join('\n');window.location.href='mailto:agriyaagrotech@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);document.querySelector('#formStatus').textContent='Your email app will open with the enquiry. Review it and send it there.';});
// Animate once on entry; content remains visible if animation APIs are unavailable.
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const runningMotion=new Set();
function playEntrance(element,delay=0){
  if(motionPreference.matches || !element.animate)return;
  const animation=element.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,delay,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'});
  runningMotion.add(animation);animation.finished.catch(()=>{}).finally(()=>runningMotion.delete(animation));
}
function animateCount(element){
  const target=Number(element.dataset.target);
  if(!Number.isFinite(target))return;
  element.setAttribute('aria-label',String(target));
  if(motionPreference.matches){element.textContent=target;return;}
  const start=performance.now();
  function frame(now){
    const progress=motionPreference.matches ? 1 : Math.min(1,(now-start)/1400);
    element.textContent=Math.round(target*(1-Math.pow(1-progress,3)));
    if(progress<1)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
const revealSelector='.section-title,.section-sub,.eyebrow,.cause-card,.why-card,.hiw-step,.vol-card,.testi-card,.cta-banner,.contact-card,.about-collage,.product,.catalogue-tools,.filters,.footer-top > .row > div,.stat-item';
function initSiteMotion(){
  if(!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      observer.unobserve(entry.target);
      if(entry.target.matches('.counter'))animateCount(entry.target);
      else playEntrance(entry.target,Number(entry.target.dataset.aosDelay||0)%300);
    });
  },{threshold:.08});
  document.querySelectorAll(revealSelector+',.counter').forEach(element=>{
    // Avoid stacking transforms on nested reveal containers.
    if(element.matches('.counter') || !element.parentElement.closest(revealSelector))observer.observe(element);
  });
  document.querySelectorAll('.hero .eyebrow,.hero-title,.hero-lead,.hero-media').forEach((el,i)=>playEntrance(el,i*100));
}
if(dismissed)initSiteMotion();else window.addEventListener('load',()=>setTimeout(initSiteMotion,1150),{once:true});
motionPreference.addEventListener('change',event=>{if(event.matches){runningMotion.forEach(animation=>animation.cancel());document.querySelectorAll('.counter').forEach(el=>el.textContent=el.dataset.target);}});
