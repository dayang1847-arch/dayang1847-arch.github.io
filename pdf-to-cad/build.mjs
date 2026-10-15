import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './node_modules/esbuild/lib/main.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const local=relative=>path.join(root,relative);
await fs.mkdir(local('vendor/mupdf'),{recursive:true});
for(const name of ['mupdf.js','mupdf-wasm.js','mupdf-wasm.wasm'])await fs.copyFile(local('node_modules/mupdf/dist/'+name),local('vendor/mupdf/'+name));
await fs.mkdir(local('vendor/unrar'),{recursive:true});
await fs.copyFile(local('node_modules/node-unrar-js/esm/js/unrar.wasm'),local('vendor/unrar/unrar.wasm'));
await fs.mkdir(local('vendor/fflate'),{recursive:true});
await build({stdin:{contents:"export { zipSync } from 'fflate';",resolveDir:root},bundle:true,platform:'browser',format:'esm',minify:true,outfile:local('vendor/fflate/index.js'),legalComments:'linked'});
await build({entryPoints:[local('worker-source.mjs')],outfile:local('worker.js'),bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,legalComments:'linked',plugins:[{
  name:'browser-native-boundaries',setup(builder){
    builder.onResolve({filter:/^mupdf$/},()=>({path:'./vendor/mupdf/mupdf.js',external:true}));
    builder.onResolve({filter:/^(node:)?(fs|path|module)$/},()=>({path:'empty-node-module',namespace:'empty'}));
    builder.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export default {};',loader:'js'}));
  }
}]});
await fs.mkdir(local('licenses'),{recursive:true});
const licenses={
  'MuPDF-AGPL-3.0.txt':'mupdf/LICENSE',
  'Potrace-GPL-2.0.txt':'esm-potrace-wasm/LICENSE',
  'DXF-writer-MIT.txt':'@tarikjabiri/dxf/LICENSE.md',
  'Paper-MIT.txt':'paper/LICENSE.txt',
  'fflate-MIT.txt':'fflate/LICENSE',
  'Unrar-MIT.txt':'node-unrar-js/LICENSE.md',
};
for(const [out,input] of Object.entries(licenses))await fs.copyFile(local('node_modules/'+input),local('licenses/'+out));
console.log('Browser worker and pinned runtime assets built. No user documents included.');
