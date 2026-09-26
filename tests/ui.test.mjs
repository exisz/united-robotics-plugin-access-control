import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';
const dom=new JSDOM('<div id="root"></div>',{url:'https://capital.queue-musical.ts.net',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
for(const key of ['window','document','HTMLElement','Element','Node','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=typeof dom.window[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?dom.window[key].bind(dom.window):dom.window[key];
globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
const {mount}=await import('../dist/plugin.js');
const tick=()=>new Promise(r=>setTimeout(r,25));
async function until(predicate){for(let n=0;n<80;n++){if(predicate())return;await tick();}assert.fail('UI did not reach expected state');}
const root=document.getElementById('root');
const button=text=>[...root.querySelectorAll('button')].find(x=>x.textContent.includes(text));
test('shows live AU/CN using styled components; save failure retains draft; cleanup',async()=>{
  const calls=[];const cleanup=mount(root,{props:{window:'access'},invoke:async(method,input)=>{calls.push({method,input});if(method==='access.update')throw Error('Synthetic write failure');return {countries:['AU','CN'],ips:[],revision:'r1'};}});
  await until(()=>root.textContent.includes('澳大利亚'));
  assert.match(root.textContent,/中国/);assert.ok(root.querySelector('.rt-Card'));assert.ok(root.querySelector('style').textContent.length>1000);assert.equal(button('保存规则').disabled,true);
  root.querySelector('[aria-label="移除 CN"]').click();await tick();assert.equal(button('保存规则').disabled,false);button('保存规则').click();
  await until(()=>root.textContent.includes('Synthetic write failure'));assert.deepEqual(calls.at(-1).input.countries,['AU']);assert.equal(root.querySelector('[aria-label="移除 CN"]'),null);cleanup();assert.equal(root.childNodes.length,0);
});
test('failed initial read never shows fake defaults and cannot save',async()=>{
  const cleanup=mount(root,{props:{},invoke:async()=>{throw Error('Synthetic read failure');}});await until(()=>root.textContent.includes('Synthetic read failure'));assert.equal(button('保存规则').disabled,true);assert.equal(root.querySelector('[aria-label="移除 AU"]'),null);cleanup();
});
