'use strict';
const fs=require('fs');
const path=require('path');
const https=require('https');
const http=require('http');

const root=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const expected=String(pkg.version||'').split('.').slice(0,2).join('.');
const checks=[];
function check(name,ok,detail=''){checks.push({name,ok:Boolean(ok),detail:ok?'':detail});}
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}

for(const f of ['server.js','migrate.js','docker-compose.yml','index.html','manifest.json','sw.js']){
  check(`file:${f}`,fs.existsSync(path.join(root,f)));
}
const server=read('server.js');
const manifest=JSON.parse(read('manifest.json'));
const publicIndex=read('public/index.html');
const publicManifest=JSON.parse(read('public/manifest.json'));
const publicSw=read('public/sw.js');
const sw=publicSw;
const migration=read('migrate.sql');
const migrator=read('migrate.js');
const expectedServerVersion=`${expected}.0`;
const expectedCache=`lyc-cache-v${expected.replace('.', '')}`;
const expectedClientVersion=`const LYC_VERSION='${expected.replace('.', '\\.')}'`;
check('migration:version-table',migration.includes('CREATE TABLE IF NOT EXISTS lyc_schema_version') && migration.includes('version integer PRIMARY KEY'),'schema version table missing');
check('migration:runner-schema-version',migrator.includes('const SCHEMA_VERSION=2') && migrator.includes('VALUES($1)') && migrator.includes('[SCHEMA_VERSION]'),'migration runner does not persist explicit schema version');
check('migration:runner-version-guard',migrator.includes('currentVersion>SCHEMA_VERSION') && migrator.includes('Schema version verification failed') && migrator.includes('Database schema version is newer than this migrator'),'migration runner schema version guard missing');
for(const table of ['lyc_guards','lyc_movements','lyc_audit_events','lyc_evidences','lyc_guard_sessions','lyc_auth_events']) check(`migration:table:${table}`,migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`),`missing ${table}`);
check('migration:transaction',migrator.includes("BEGIN") && migrator.includes("COMMIT") && migrator.includes("ROLLBACK"),'migration transaction guard missing');
check('migration:append-only-audit',migration.includes('lyc_block_audit_mutation') && migration.includes('CREATE TRIGGER'),'append-only audit trigger missing');
check('migration:auth-session-unique',migration.includes('lyc_guard_sessions_one_active_per_guard_idx') && migration.includes('WHERE revoked_at IS NULL'),'active-session uniqueness missing');
check('migration:sha256-constraints',migration.includes('sha256') && migration.includes('CHECK'),'sha256 constraints missing');
check('version:package',pkg.version===`${expected}.0`,`found ${pkg.version}`);
check('version:manifest',String(manifest.version)===expected,`found ${manifest.version}`);
check('version:service-worker',sw.includes(expectedCache),'cache marker missing');
check('version:server',server.includes(`const VERSION='${expectedServerVersion}'`),'server version mismatch');
check('version:client',new RegExp(`const LYC_VERSION='${expected.replace('.', '\\.')}'`).test(publicIndex),'client version mismatch');
check('version:coherence',String(manifest.version)===expected && String(publicManifest.version)===expected && server.includes(`const VERSION='${expectedServerVersion}'`) && sw.includes(expectedCache) && new RegExp(`const LYC_VERSION='${expected.replace('.', '\\.')}'`).test(publicIndex),'runtime version metadata mismatch');
check('version:no-stale-runtime-audit',!publicIndex.includes("ok:html==='2.198'") && !read('index.html').includes("readmeVersion='2.226'"),'stale hardcoded runtime audit remains');
check('auth:guard-session',server.includes("x-lyc-guard-session"));
check('auth:no-shared-browser-bearer',!publicIndex.includes('Authorization: Bearer'));
for(const route of ['/v1/health','/v1/auth/shift','/v1/auth/end','/v1/sync/push','/v1/sync/pull','/v1/audit/events','/v1/evidence/metadata','/v1/evidence/upload-url','/v1/evidence/complete']){
  check(`route:${route}`,server.includes(route));
}
check('evidence:server-enforced',server.includes('LYC_MOVEMENT_EVIDENCE_V194') && server.includes('movement_evidence_policy_failed'));
check('errors:invalid-payload-400',server.includes("'invalid_movement_payload'") && server.includes("?400:500"));
check('errors:non-json-post-415',server.includes("ct!=='application/json'") && server.includes("return send(res,415,{error:'content_type_must_be_application_json'}"));
check('render:blueprint-present',fs.existsSync(path.join(root,'render.yaml')),'render.yaml missing');
const renderYaml=fs.existsSync(path.join(root,'render.yaml'))?read('render.yaml'):'';
check('render:docker-runtime',renderYaml.includes('runtime: docker') && renderYaml.includes('dockerfilePath: ./Dockerfile'),'Render Docker runtime not configured');
check('render:health-check',renderYaml.includes('healthCheckPath: /v1/health'),'Render health check missing');
check('render:database-binding',renderYaml.includes('fromDatabase:') && renderYaml.includes('property: connectionString'),'Render Postgres binding missing');
check('render:secret-prompting',['LYC_GUARD_CREDENTIALS_JSON','LYC_S3_BUCKET','AWS_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','LYC_S3_ENDPOINT'].every(k=>renderYaml.includes('key: '+k) && renderYaml.includes('sync: false')),'Render secrets are not marked sync:false');
check('render:migrate-before-server',renderYaml.includes('node migrate.js && node server.js') && read('Dockerfile').includes('node migrate.js && node server.js'),'Render startup migration contract missing');
check('render:frontend-in-image',read('Dockerfile').includes('COPY public ./public'),'frontend is not copied into Docker image');
check('render:port-contract',read('Dockerfile').includes('EXPOSE 10000') && renderYaml.includes('key: PORT') && renderYaml.includes('value: "10000"'),'Render port contract missing');
check('render:static-server',server.includes("const PUBLIC_ROOT=path.resolve(__dirname,'public')") && server.includes('function servePublic') && server.includes("if(!u.pathname.startsWith('/v1/'))"),'Node frontend serving missing');
check('render:path-traversal-guard',server.includes("candidate.startsWith(PUBLIC_ROOT+path.sep)"),'public path traversal guard missing');
check('postgres:render-ssl-contract',server.includes("process.env.PGSSL==='require'?{rejectUnauthorized:false}:undefined") && migrator.includes("process.env.PGSSL==='require'?{rejectUnauthorized:false}:undefined"),'Render Postgres SSL contract missing');
check('postgres:pool-bounded',server.includes('max:10') && server.includes('connectionTimeoutMillis:10_000'),'Postgres pool is not bounded');
check('web:frontend-served-by-caddy',read('Caddyfile').includes('root * /srv') && read('Caddyfile').includes('file_server') && read('Caddyfile').includes('try_files {path} /index.html'),'Caddy frontend serving is not configured');
check('web:api-proxy-isolated',read('Caddyfile').includes('@api path /v1/*') && read('Caddyfile').includes('reverse_proxy lyc-server:8080'),'Caddy API proxy is not isolated');
check('web:frontend-volume',read('docker-compose.yml').includes('./public:/srv/public:ro'),'frontend is not mounted into Caddy');
check('web:pwa-icons',fs.existsSync(path.join(root,'public','icons','icon-192.png'))&&fs.existsSync(path.join(root,'public','icons','icon-512.png'))&&fs.existsSync(path.join(root,'public','icons','icon-512-maskable.png')),'PWA icons are missing from public/');
check('evidence:upload-shape',server.includes('upload:{url:s3Presign') && publicIndex.includes('upload?.url'),'evidence upload response/client contract mismatch');
check('sync:nonmovement-records',server.includes("if(tipo==='movimiento'||tipo==='movement')validateMovementPayload(payload)"),'sync must not apply movement-only validation to every record');
check('guards:numeric-default-ids',publicIndex.includes("id:String(1001+i)"),'default guard IDs must be numeric for server authentication');
const caddy=read('Caddyfile');
const publicRoot=path.join(root,'public');
const publicFiles=fs.existsSync(publicRoot)?fs.readdirSync(publicRoot,{recursive:true}).map(String):[];
check('web:public-isolation-root',caddy.includes('root * /srv/public'),'Caddy must serve only /srv/public');
const forbiddenPublic=publicFiles.filter(f=>/(^|\/)(server\.js|migrate\.js|migrate\.sql|docker-compose\.yml|\.env(?:\..*)?|scripts(?:\/|$)|README(?:.*))$/.test(f));
check('web:public-no-backend-secrets',forbiddenPublic.length===0,`forbidden files: ${forbiddenPublic.join(',')}`);
const publicBackups=publicFiles.filter(f=>/(^|\/)(.*\.bak(?:_[^\/]*)?|.*~|.*\.orig)$/.test(f));
check('web:public-no-backups',publicBackups.length===0,`backup files: ${publicBackups.join(',')}`);
check('web:sensitive-paths-denied',/@sensitive path[\s\S]*respond @sensitive 404/.test(caddy),'sensitive path deny rule missing');

check('security:response-headers',server.includes("'cache-control':'no-store'") && server.includes("'x-request-id':requestId") && server.includes("'x-content-type-options':'nosniff'") && server.includes("'x-frame-options':'DENY'") && server.includes("'referrer-policy':'no-referrer'"), 'required response security headers missing');
check('security:permissions-policy',server.includes("'permissions-policy':'camera=(self), microphone=(), geolocation=()'"), 'permissions policy missing');
check('version:service-worker-exact',sw.match(/^const CACHE='([^']+)'/m)?.[1]===expectedCache, `expected ${expectedCache}`);
check('offline:service-worker-api-bypass',sw.includes("if(url.origin!==self.location.origin || url.pathname.startsWith('/v1/'))return;"),'Service Worker must never intercept API requests');
check('offline:service-worker-nonget-bypass',sw.includes("if(req.method!=='GET')return;"),'Service Worker must never intercept non-GET requests');
check('offline:service-worker-navigation-fallback',sw.includes("fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))") && sw.includes("catch(()=>caches.match('./index.html'))"),'navigation offline fallback missing');
check('version:client-runtime-self-audit',publicIndex.includes('lycRuntimeVersionSelfAuditV232') && read('index.html').includes("expectedCache='lyc-cache-v'+htmlVersion.replace('.','')"),'client runtime self-audit missing');
check('ui:action-wiring',publicIndex.includes('lycUIActionWiringAuditV227') && read('index.html').includes('function printQR()'), 'UI action wiring audit/print bridge missing');
check('ui:operational-save-audit',publicIndex.includes('lycOperationalSaveAuditV228'), 'operational save audit missing');
check('ui:operational-persistence-await',publicIndex.includes('lycOperationalPersistenceAuditV229') && read('index.html').includes("await put({tipo:'scan_audit'"),'operational persistence audit/await wiring missing');
check('ui:operational-commit-contract-v231',publicIndex.includes("const saved=await put({tipo:'inicio_turno'") && read('index.html').includes("const saved=await put({tipo:'fin_turno'") && read('index.html').includes('async function saveSimple') && read('index.html').includes('async function saveKey'),'operational commit contract missing');
check('qr:no-stale-placeholder',!publicIndex.includes('function qrSvg(') && !read('index.html').includes('El generador QR provisional fue retirado'),'stale QR generator code remains');
check('qr:official-encoder-bridge',publicIndex.includes("LYC_QR_ENCODER_SOURCE_V2127='BUNDLED_MIT_QRCODE'") && read('index.html').includes('return generateLYCQR()'),'official QR encoder/legacy bridge missing');
check('security:production-hsts',server.includes("strict-transport-security") && server.includes("max-age=31536000; includeSubDomains"));
check('server:pool-error-handler',server.includes("pool.on('error',e=>console.error('postgres pool error',e.message))"),'PostgreSQL pool error handler missing');
check('health:object-storage-readiness',server.includes("objectStorage:s3Ready()?'configured':'not_configured'"),'health endpoint does not expose object-storage readiness');
check('authz:forbidden-role-403',server.includes("e.message==='forbidden_role'?403"));
check('auth:logout-invalid-session-401',server.includes("e.message==='invalid_guard_session'") && server.includes("return send(res,401,{error:'invalid_guard_session'}"));
check('auth:failed-login-audit-fail-closed',server.includes("try{await authSecurityEvent(guardId,'LOGIN_FAILED',requestId);}") && server.includes("return send(res,503,{error:'auth_audit_unavailable'},requestId);"));
check('auth:logout-preserves-invalid-session-error',server.includes("if(e&&e.message==='invalid_guard_session')throw e;"));
check('auth:session-end-audit-transaction',server.includes("UPDATE lyc_guard_sessions SET revoked_at=now()") && server.includes("INSERT INTO lyc_auth_events(guard_id,outcome,request_id)") && server.includes("await c.query('COMMIT')"));
check('authz:central-policy',server.includes('SERVER_ROUTE_POLICY') && server.includes('requireServerRouteRole(activeGuardSession,req.method,u.pathname)'));
for(const route of ['POST /v1/sync/push','GET /v1/sync/pull','POST /v1/audit/events','POST /v1/evidence/metadata','POST /v1/evidence/upload-url','POST /v1/evidence/complete']) check(`authz:policy:${route}`,server.includes(`'${route}'`));

function requestRaw(base,method,pathname,rawBody,headers={}){
  return new Promise((resolve,reject)=>{
    const u=new URL(pathname,base); const lib=u.protocol==='https:'?https:http;
    const data=String(rawBody??'');
    const req=lib.request(u,{method,headers:{'content-length':Buffer.byteLength(data),...headers}},res=>{
      let s='';res.setEncoding('utf8');res.on('data',c=>s+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:s}));
    });req.on('error',reject);req.end(data);
  });
}

function request(base,method,pathname,body,headers={}){
  return new Promise((resolve,reject)=>{
    const u=new URL(pathname,base); const lib=u.protocol==='https:'?https:http;
    const data=body===undefined?null:JSON.stringify(body);
    const req=lib.request(u,{method,headers:{'content-type':'application/json',...(data?{'content-length':Buffer.byteLength(data)}:{}),...headers}},res=>{
      let s='';res.setEncoding('utf8');res.on('data',c=>s+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:s}));
    });req.on('error',reject);req.end(data);
  });
}

async function live(){
  const base=process.env.LYC_SMOKE_BASE_URL;
  const guardId=process.env.LYC_SMOKE_GUARD_ID;
  const pin=process.env.LYC_SMOKE_PIN;
  if(!base&&!guardId&&!pin){return 'static-only';}
  if(!base||!guardId||!pin)throw new Error('Set LYC_SMOKE_BASE_URL, LYC_SMOKE_GUARD_ID and LYC_SMOKE_PIN together for live smoke tests.');
  let r=await request(base,'GET','/v1/health');
  check('live:health',r.status===200,`HTTP ${r.status}`);
  check('live:health-request-id',typeof r.headers['x-request-id']==='string'&&r.headers['x-request-id'].length>0,'missing x-request-id');
  check('live:health-no-store',String(r.headers['cache-control']||'').toLowerCase()==='no-store','cache-control mismatch');
  check('live:health-nosniff',String(r.headers['x-content-type-options']||'').toLowerCase()==='nosniff','nosniff missing');
  check('live:health-permissions-policy',String(r.headers['permissions-policy']||'').toLowerCase()==='camera=(self), microphone=(), geolocation=()','permissions-policy mismatch');
  let health;try{health=JSON.parse(r.body);}catch{health={};}
  check('live:health-object-storage-field',health.objectStorage==='configured',`objectStorage=${health.objectStorage||'missing'}`);
  r=await request(base,'GET','/v1/sync/pull?limit=1');
  check('live:protected-without-session',r.status===401,`HTTP ${r.status}`);
  r=await requestRaw(base,'POST','/v1/sync/push','{}',{'content-type':'text/plain'});
  check('live:non-json-content-type-415',r.status===415,`HTTP ${r.status}`);
  r=await requestRaw(base,'POST','/v1/sync/push','{',{'content-type':'application/json'});
  check('live:malformed-json-400',r.status===400,`HTTP ${r.status}`);
  r=await requestRaw(base,'POST','/v1/sync/push','x'.repeat(600_000),{'content-type':'application/json'});
  check('live:body-limit-413',r.status===413,`HTTP ${r.status}`);
  r=await request(base,'POST','/v1/auth/shift',{guardId,pin});
  check('live:login',r.status===200,`HTTP ${r.status}`);
  if(r.status!==200)return 'live-login-failed';
  let j;try{j=JSON.parse(r.body);}catch{throw new Error('Login response was not JSON.');}
  const token=j.sessionToken;
  check('live:session-token',typeof token==='string'&&token.length>=32);
  const h={'x-lyc-guard-session':token};
  r=await request(base,'GET','/v1/sync/pull?limit=1',undefined,h);
  check('live:protected-pull',r.status===200,`HTTP ${r.status}`);
  r=await request(base,'POST','/v1/auth/end',undefined,h);
  check('live:logout',r.status===200,`HTTP ${r.status}`);
  r=await request(base,'GET','/v1/sync/pull?limit=1',undefined,h);
  check('live:session-revoked-after-logout',r.status===401,`HTTP ${r.status}`);
  return 'live';
}

(async()=>{
  try{const mode=await live();
    for(const c of checks)console.log(`${c.ok === true ? 'PASS' : 'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);
    const failed=checks.filter(c=>!c.ok);
console.log(`\nLYC smoke test ${failed.length?'FAILED':'PASSED'} (${mode}); ${checks.length-failed.length}/${checks.length} checks passed.`);
    process.exitCode=failed.length?1:0;
  }catch(e){console.error(`SMOKE ERROR: ${e.message}`);process.exitCode=2;}
})();
