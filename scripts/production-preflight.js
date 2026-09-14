'use strict';
const fs=require('fs');
const path=require('path');
const required=['LYC_DOMAIN','LYC_DB_PASSWORD','LYC_GUARD_CREDENTIALS_JSON','LYC_S3_BUCKET','AWS_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY'];
const optional=['LYC_S3_ENDPOINT','LYC_SESSION_TTL_SECONDS'];
const errors=[];
for(const k of required){
  if(!String(process.env[k]||'').trim()) errors.push(k+' missing');
}
if(process.env.LYC_DB_PASSWORD && process.env.LYC_DB_PASSWORD.length<16) errors.push('LYC_DB_PASSWORD must be at least 16 characters');
if(process.env.LYC_DOMAIN && !/^[A-Za-z0-9.-]+$/.test(process.env.LYC_DOMAIN)) errors.push('LYC_DOMAIN contains invalid characters');
if(process.env.LYC_S3_ENDPOINT){try{if(new URL(process.env.LYC_S3_ENDPOINT).protocol!=='https:') errors.push('LYC_S3_ENDPOINT must use HTTPS');}catch{errors.push('LYC_S3_ENDPOINT is not a valid URL');}}
if(process.env.LYC_GUARD_CREDENTIALS_JSON){
  try{
    const guards=JSON.parse(process.env.LYC_GUARD_CREDENTIALS_JSON);
    if(!Array.isArray(guards)||guards.length!==8) errors.push('LYC_GUARD_CREDENTIALS_JSON must contain exactly 8 guards');
    else {
      const ids=new Set();
      for(const g of guards){
        const id=String(g.guardId||''),pin=String(g.pin||'');
        if(!/^[0-9]{4,8}$/.test(id)) errors.push('guardId must be 4-8 digits');
        if(!/^[0-9]{4,8}$/.test(pin)) errors.push('guard PIN must be 4-8 digits');
        if(ids.has(id)) errors.push('duplicate guardId '+id); ids.add(id);
      }
    }
  }catch{errors.push('LYC_GUARD_CREDENTIALS_JSON is invalid JSON');}
}
for(const f of ['docker-compose.yml','Caddyfile','Dockerfile','migrate.js','migrate.sql','server.js','s3-cors.json']) if(!fs.existsSync(path.join(process.cwd(),f))) errors.push('missing '+f);
if(errors.length){console.error('PRODUCTION PREFLIGHT: FAIL');for(const e of errors)console.error(' - '+e);process.exit(1);}
console.log('PRODUCTION PREFLIGHT: PASS');
console.log(' - domain configured');
console.log(' - database secret configured');
console.log(' - guard credential seed configured');
console.log(' - S3 object storage configured');
console.log(' - required deployment files present');
