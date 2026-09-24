#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$project_root"
node scripts/sync-ui.mjs --check
node --input-type=module <<'JS'
import {readFile,mkdir,writeFile,rm,copyFile} from 'node:fs/promises';
import chartAsset from './worker/chart-library.js';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
const source=await readFile('worker/index.js','utf8');
const math=(await readFile('worker/portfolio-math.js','utf8')).replace('export function portfolioEngine','function portfolioEngine');
const built=source.replace('import chartAsset from \"./chart-library.js\";', 'const chartAsset = '+JSON.stringify(chartAsset)+';').replace('import {portfolioEngine} from \"./portfolio-math.js\";',()=>math);
if(built===source)throw new Error('Chart import was not bundled');
await writeFile('dist/server/index.js',built);
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built self-contained Worker');
JS

