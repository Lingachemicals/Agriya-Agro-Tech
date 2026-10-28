const encode = value => new TextEncoder().encode(value);
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
const unhex = text => Uint8Array.from(text.match(/../g) || [], pair => parseInt(pair,16));
const keyFor = value => crypto.subtle.importKey('raw', typeof value === 'string' ? encode(value) : value, {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unbase64url = text => Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:100000,hash:'SHA-256'},key,256));
}
async function sameHash(a,b) {
  const signature = await crypto.subtle.sign('HMAC',await keyFor(unhex(a)),encode('Agriya login verification'));
  return crypto.subtle.verify('HMAC',await keyFor(unhex(b)),signature,encode('Agriya login verification'));
}
export async function createSession(env, config) {
  const now = Math.floor(Date.now()/1000);
  const payload = base64url(encode(JSON.stringify({email:config.email,v:config.salt,iat:now,exp:now+28800,id:crypto.randomUUID()})));
  const signature = await crypto.subtle.sign('HMAC',await keyFor(env.ADMIN_KEY),encode(payload));
  return payload+'.'+base64url(signature);
}
export async function verifySession(token,env) {
  try {
    const parts=token.split('.');if(parts.length!==2)return false;
    if(!await crypto.subtle.verify('HMAC',await keyFor(env.ADMIN_KEY),unbase64url(parts[1]),encode(parts[0])))return false;
    const session=JSON.parse(new TextDecoder().decode(unbase64url(parts[0]))),config=JSON.parse(env.ADMIN_LOGIN);
    const now=Math.floor(Date.now()/1000);
    return session.email===config.email && session.v===config.salt && Number.isInteger(session.exp) && session.exp>now && session.exp<=now+28800 && Number.isInteger(session.iat) && session.iat<=now;
  } catch { return false; }
}
export async function login(request, env, input) {
  if(!env.ADMIN_LOGIN)return {status:503,body:{error:'Email and password login is not configured.'}};
  const config=JSON.parse(env.ADMIN_LOGIN);
  const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/900);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const client=hex(await crypto.subtle.digest('SHA-256',encode(ip)))+':'+bucket;
  await env.PRODUCTS_DB.prepare('DELETE FROM login_attempts WHERE expires < ?').bind(now).run();
  const attempt=await env.PRODUCTS_DB.prepare('INSERT INTO login_attempts (client, attempts, expires) VALUES (?, 1, ?) ON CONFLICT(client) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(client,(bucket+1)*900).first();
  if(attempt.attempts>10)return {status:429,body:{error:'Too many login attempts. Please try again in 15 minutes.'}};
  if(!input || typeof input.email!=='string' || input.email.length>254 || typeof input.password!=='string' || !input.password || input.password.length>256)return {status:401,body:{error:'Incorrect email or password.'}};
  const supplied=await passwordHash(input.password,config.salt);
  const matches=await sameHash(config.hash,supplied);
  if(!matches || input.email.trim().toLowerCase()!==config.email)return {status:401,body:{error:'Incorrect email or password.'}};
  await env.PRODUCTS_DB.prepare('DELETE FROM login_attempts WHERE client = ? OR expires < ?').bind(client,now).run();
  return {status:200,body:{token:await createSession(env,config),expiresIn:28800}};
}
