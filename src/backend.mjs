import {readFile} from 'node:fs/promises';
import {summarize,updatePolicy} from './policy.mjs';
// Deployment must explicitly provision this dedicated read-only secret.
// Never read the complete instance secret store or plugin-data for credentials.
const secretPath='/run/secrets/capital-access-control.json';
export async function dispatch(method,input,options={}){
  if(!['access.read','access.update'].includes(method))throw Error('不支持的操作');
  let credentials;
  try{credentials=options.credentials??JSON.parse(await readFile(secretPath,'utf8'));}catch{throw Error('本地运行器尚未配置此插件的专用凭据');}
  if(!/^[a-f0-9]{32}$/.test(credentials.accountId)||typeof credentials.token!=='string'||!credentials.token)throw Error('插件专用凭据无效');
  const url=`https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/access/apps/3534f755-aa33-4a89-b46e-3188465c177d/policies/86e572c9-33e5-4ef4-8772-b50743ba0c83`;
  const cf=async(method='GET',body)=>{
    let response,json;
    try{response=await(options.fetch??fetch)(url,{method,headers:{authorization:`Bearer ${credentials.token}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();json=await response.json();if(!json.success)throw Error();}catch{throw Error('Cloudflare 请求失败；未能确认保存，请刷新重试');}
    return json.result;
  };
  const current=await cf();
  if(method==='access.read')return summarize(current);
  const updated=updatePolicy(current,input);
  if(JSON.stringify(current.include)!==JSON.stringify(updated.include)){
    const {id,uid,created_at,updated_at,reusable,...body}=updated;
    await cf('PUT',body);
  }
  const saved=await cf();
  if(JSON.stringify(saved.include)!==JSON.stringify(updated.include))throw Error('保存后规则不一致，请刷新确认');
  return summarize(saved);
}
