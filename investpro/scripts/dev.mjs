// Optional source-review server. Production uses the Worker deployment.
import http from 'node:http';
import worker from '../worker/index.js';
const port=Number(process.env.PORT||3000);
http.createServer(async(req,res)=>{
 try{
  const request=new Request(new URL(req.url,'http://localhost:'+port),{method:req.method,headers:req.headers});
  const response=await worker.fetch(request,process.env);
  res.writeHead(response.status,Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error);res.writeHead(500,{'Content-Type':'text/plain'});res.end('Request failed');}
}).listen(port,'127.0.0.1',()=>console.log('InvestPro source review: http://localhost:'+port));

