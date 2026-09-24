import {readFileSync,writeFileSync} from 'node:fs';
const ui=new URL('../frontend.html',import.meta.url),worker=new URL('../worker/index.js',import.meta.url);
const source=readFileSync(worker,'utf8'),lineEnd=source.indexOf('\n'),html=readFileSync(ui,'utf8');
if(!source.startsWith('const page = '))throw new Error('Unexpected Worker layout');
if(process.argv.includes('--check')){
 if(JSON.parse(source.slice('const page = '.length,lineEnd-1))!==html)throw new Error('frontend.html differs from embedded page. Run npm run ui:sync.');
 console.log('Readable frontend matches embedded Worker page.');
}else{writeFileSync(worker,'const page = '+JSON.stringify(html)+';'+source.slice(lineEnd));console.log('Embedded frontend updated.');}

