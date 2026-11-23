import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files=[];
function walk(dir){for(const file of readdirSync('dist/'+dir,{withFileTypes:true})){const name=dir+file.name;if(file.isDirectory())walk(name+'/');else if((/\.(html|js|css|png|mp3|webmanifest)$/.test(name)||name==='assets/manifest.json')&&name!=='sw.js')files.push('/'+name);}}
walk('');files.sort();
const hash=createHash('sha256');for(const file of files)hash.update(file).update(readFileSync('dist'+file));
const worker=readFileSync('scripts/service-worker.js','utf8').replace('__CACHE__','lawn-defense-'+hash.digest('hex').slice(0,16)).replace('__PRECACHE__',JSON.stringify(files));
writeFileSync('dist/sw.js',worker);console.log('Offline cache includes '+files.length+' game files.');
