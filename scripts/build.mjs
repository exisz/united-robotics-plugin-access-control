import {mkdir,copyFile} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/plugin.jsx'],outfile:'dist/plugin.js',bundle:true,format:'esm',platform:'browser',target:'es2022',jsx:'automatic',minify:true,loader:{'.css':'text'},legalComments:'none'});
await build({entryPoints:['src/rpc.mjs'],outfile:'dist/rpc.mjs',bundle:true,format:'esm',platform:'node',target:'node22'});
await copyFile('src/manifest.json','dist/manifest.json');
