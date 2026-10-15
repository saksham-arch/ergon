import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end('Bad request')};const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')};fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found')};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');fs.createReadStream(file).pipe(res)})});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
