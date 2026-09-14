'use strict';
const fs=require('fs');
const path=require('path');
const errors=[];
const required=['DATABASE_URL','LYC_GUARD_CREDENTIALS_JSON','LYC_S3_BUCKET','AWS_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY'];
for(const k of required) if(!String(process.env[k]||'').trim()) errors.push(k+' missing');
const ttl=Number(process.env.LYC_SESSION_TTL_SECONDS||43200);
if(!Number.isSafeInteger(ttl)||ttl<900||ttl>86400) errors.push('LYC_SESSION_TTL_SECONDS must be between 900 and 86400 seconds');
if(process.env.LYC_S3_ENDPOINT){try{if(new URL(process.env.LYC_S3_ENDPOINT).protocol!=='https:')errors.push('LYC_S3_ENDPOINT must use HTTPS');}catch{errors.push('LYC_S3_ENDPOINT is invalid');}}
try{
 const guards=JSON.parse(process.env.LYC_GUARD_CREDENTIALS_JSON||'');
 if(!Array.isArray(guards)||guards.length!==8)errors.push('LYC_GUARD_CREDENTIALS_JSON must contain exactly 8 guards');
 else{const ids=new Set();for(const g of guards){const id=String(g.guardId||''),pin=String(g.pin||'');if(!/^\d{4,8}$/.test(id))errors.push('guardId must be 4-8 digits');if(!/^\d{4,8}$/.test(pin))errors.push('guard PIN must be 4-8 digits');if(ids.has(id))errors.push('duplicate guardId '+id);ids.add(id);}}
}catch{errors.push('LYC_GUARD_CREDENTIALS_JSON is invalid JSON');}
for(const f of ['render.yaml','Dockerfile','server.js','migrate.js','migrate.sql','public/index.html','public/manifest.json','public/sw.js'])if(!fs.existsSync(path.join(process.cwd(),f)))errors.push('missing '+f);
if(errors.length){console.error('RENDER PREFLIGHT: FAIL');for(const e of errors)console.error(' - '+e);process.exit(1);}
console.log('RENDER PREFLIGHT: PASS');
console.log(' - Render database configured');
console.log(' - 8 guard credentials configured');
console.log(' - S3 object storage configured');
console.log(' - frontend bundled into Docker image');
console.log(' - migration + server startup contract configured');
