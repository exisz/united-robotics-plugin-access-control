import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
export function summarize(policy){
  if(policy.decision!=='allow'||!Array.isArray(policy.include)||policy.include.some(r=>Object.keys(r).length!==1||(!r.geo&&!r.ip)))throw Error('不支持的策略结构，未修改任何规则');
  return {countries:policy.include.filter(r=>r.geo).map(r=>r.geo.country_code),ips:policy.include.filter(r=>r.ip).map(r=>r.ip.ip),revision:createHash('sha256').update(JSON.stringify(policy)).digest('hex')};
}
export function updatePolicy(policy,input){
  if(input?.revision!==summarize(policy).revision)throw Error('配置已被修改，请刷新后重试');
  if(!Array.isArray(input.countries)||!Array.isArray(input.ips)||input.countries.length+input.ips.length>100)throw Error('规则格式无效');
  const countries=[...new Set(input.countries.map(c=>String(c).toUpperCase()))],ips=[...new Set(input.ips)];
  if(countries.some(c=>! /^[A-Z]{2}$/.test(c)))throw Error('国家代码应为两位字母');
  for(const ip of ips){if(typeof ip!=='string')throw Error('IP 格式无效');const parts=ip.split('/'),v=isIP(parts[0]);if(!v||parts.length>2||(parts.length===2&&(!/^\d+$/.test(parts[1])||Number(parts[1])>(v===4?32:128))))throw Error('IP/CIDR 格式无效');}
  if(!countries.length&&!ips.length)throw Error('至少保留一个国家或 IP');
  return {...policy,include:[...countries.map(country_code=>({geo:{country_code}})),...ips.map(ip=>({ip:{ip}}))]};
}
