import {summarize,updatePolicy} from './policy.mjs';
// The instance Secret Manager injects only the declared token into this process.
// Account/application/policy identifiers are public configuration, not credentials.
const accountId='a13429beb138043df35e2a9162f1b095';
export async function dispatch(method,input,options={}){
  if(!['access.read','access.update'].includes(method))throw Error('不支持的操作');
  const credentials=options.credentials??{accountId,token:process.env.CLOUDFLARE_ACCESS_TOKEN};
  if(!credentials.token)throw Error('请在 Settings 的 Connector secrets 中配置 Cloudflare Access 凭据');
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
