import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir','dist-public'],{cwd:root,stdio:'inherit',env:{...process.env,VITE_PUBLIC_DEMO:'true',VITE_BASE_PATH:process.env.VITE_BASE_PATH||'./'}});
process.exit(result.status??1);
