import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {dispatch} from '../src/backend.mjs';
import {summarize,updatePolicy} from '../src/policy.mjs';
const policy={decision:'allow',name:'Preserved',include:[{geo:{country_code:'AU'}},{geo:{country_code:'CN'}}],require:[{login_method:{id:'logto'}}],exclude:[],precedence:1};
const credentials={accountId:'a'.repeat(32),token:'synthetic-only'};
test('read and save fixed policy; preserve identity constraints and verify readback',async()=>{
  let state=structuredClone(policy),writes=0;
  const fetch=async(url,options)=>{assert.match(url,/3534f755-aa33-4a89-b46e-3188465c177d\/policies\/86e572c9-33e5-4ef4-8772-b50743ba0c83$/);assert.equal(options.redirect,'manual');if(options.method==='PUT'){writes++;state=JSON.parse(options.body);assert.deepEqual(state.require,policy.require);}return Response.json({success:true,result:state});};
  const initial=await dispatch('access.read',{}, {credentials,fetch});
  assert.deepEqual(initial.countries,['AU','CN']);
  const saved=await dispatch('access.update',{...initial,ips:['203.0.113.7']},{credentials,fetch});
  assert.deepEqual(saved.ips,['203.0.113.7']);assert.equal(writes,1);
  await assert.rejects(dispatch('access.update',initial,{credentials,fetch}),/配置已被修改/);
  await dispatch('access.update',saved,{credentials,fetch});assert.equal(writes,1);
});
test('invalid ranges, empty rules and unexpected selectors fail closed',()=>{
  const input=summarize(policy);
  for(const ips of [['x'],['10.0.0.1/33'],['::1/129']])assert.throws(()=>updatePolicy(policy,{...input,ips}));
  assert.throws(()=>updatePolicy(policy,{...input,countries:[],ips:[]}));
  assert.throws(()=>summarize({...policy,include:[{everyone:{}}]}));
});
test('redirect rejected and secrets not echoed in upstream failure',async()=>{
  await assert.rejects(dispatch('access.read',{}, {credentials,fetch:async()=>new Response(credentials.token,{status:302,headers:{location:'https://other.example'}})}),e=>!e.message.includes(credentials.token)&&e.message.includes('Cloudflare'));
});
test('standalone one-shot protocol handles missing credentials and malformed requests',()=>{
  for(const input of ['invalid',JSON.stringify({version:1,method:'access.read',params:{}}),JSON.stringify({version:1,method:'other'})]){
    const result=spawnSync(process.execPath,['dist/rpc.mjs'],{input,encoding:'utf8'});assert.equal(result.status,1);const response=JSON.parse(result.stdout);assert.equal(response.version,1);assert.equal(response.ok,false);assert.equal(typeof response.error.message,'string');
  }
});
