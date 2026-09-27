import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const hostCSS=process.env.HOST_CSS?await readFile(process.env.HOST_CSS,'utf8'):'';
const server=createServer(async(req,res)=>{
  if(req.url==='/plugin.js'){res.setHeader('content-type','text/javascript');return res.end(await readFile(new URL('../dist/plugin.js',import.meta.url)));}
  res.setHeader('content-type','text/html');res.end(`<!doctype html><html data-theme="dark"><head><style>${hostCSS}</style><style>html{--background:#171717;--foreground:#fafafa;--card:#262626;--card-foreground:#fafafa;--border:#404040}body{margin:0}#root{height:1100px;background:var(--background)}h2{color:red!important}button{border-radius:0!important}</style></head><body><div id="sentinel">Host unaffected</div><div id="root"></div><script type="module">import{mount}from'/plugin.js';window.calls=0;window.cleanup=mount(document.querySelector('#root'),{invoke:async()=>{window.calls++;return{countries:['AU','CN'],ips:[],revision:'r1'}}});</script></body></html>`);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:960,height:1200}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'移除 CN'}).waitFor();
 for(const mode of ['dark','light']){
  await page.evaluate(mode=>{document.documentElement.dataset.theme=mode;const dark=mode==='dark';for(const[k,v]of Object.entries({background:dark?'#171717':'#fafafa',foreground:dark?'#fafafa':'#171717',card:dark?'#262626':'#ffffff','card-foreground':dark?'#fafafa':'#171717',border:dark?'#404040':'#e5e5e5'}))document.documentElement.style.setProperty('--'+k,v);},mode);
  await page.locator('.radix-themes.'+mode).waitFor();
  assert.notEqual(await page.getByRole('heading',{name:'网络 IP 管理'}).evaluate(e=>getComputedStyle(e).color),'rgb(255, 0, 0)','host CSS must not leak in');
  assert.equal(await page.locator('.rt-Card').first().evaluate(e=>getComputedStyle(e).backgroundColor),mode==='dark'?'rgb(38, 38, 38)':'rgb(255, 255, 255)');
  assert.equal(await page.locator('#sentinel').evaluate(e=>e.className),'');
  await page.screenshot({path:`/tmp/access-control-${mode}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'移除 CN'}).click();await page.evaluate(()=>document.documentElement.dataset.theme='dark');await page.locator('.radix-themes.dark').waitFor();assert.equal(await page.getByRole('button',{name:'移除 CN'}).count(),0);assert.equal(await page.evaluate(()=>window.calls),1,'theme changes preserve state and do not refetch');
 await page.setViewportSize({width:360,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no narrow-panel overflow');
 await page.evaluate(()=>window.cleanup());assert.equal(await page.locator('#root').evaluate(e=>e.childNodes.length),0);assert.deepEqual(errors,[]);
 console.log('Browser: dark/light, scoped CSS, state-preserving theme switch, 360px, cleanup passed');
}finally{await browser.close();await new Promise(r=>server.close(r));}
