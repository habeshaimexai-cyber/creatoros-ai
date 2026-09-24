import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import worker from '../worker/index.js';
import {portfolioEngine} from '../worker/portfolio-math.js';
const actualFetch=globalThis.fetch;
const times=Array.from({length:90},(_,i)=>Date.UTC(2026,5,24+i,12)/1000);
function fixture(symbol='AAPL',flat=false){const close=Array.from({length:90},(_,i)=>flat?100:60+i*.4);if(!flat){close[88]=100;close[89]=110;}return {chart:{result:[{meta:{symbol,currency:symbol==='SHEL.L'?'GBp':'USD',regularMarketPrice:flat?100:110,regularMarketTime:times.at(-1),chartPreviousClose:40,exchangeTimezoneName:'UTC',fullExchangeName:'Test exchange'},timestamp:times,indicators:{quote:[{close}],adjclose:[{adjclose:close}]}}],error:null}};}
let network='ok';
globalThis.fetch=async url=>{if(network==='down')return new Response('{}',{status:503});if(url.includes('/search?')){if(network==='news-down')return new Response('{}',{status:503});return Response.json({quotes:[],news:[]});}const symbol=decodeURIComponent(String(url).split('/chart/')[1]?.split('?')[0]||'AAPL');return Response.json(fixture(symbol,network==='flat'));};
async function call(path){const r=await worker.fetch(new Request('https://example.test'+path));return {status:r.status,data:await r.json()};}
let r=await call('/api/quote?symbol=AAPL');assert.equal(r.status,200);assert.equal(r.data.previousClose,100);assert.equal(r.data.change,10);assert.equal(r.data.timestamp,times.at(-1)*1000);assert.notEqual(r.data.timestamp,r.data.fetchedAt);
r=await call('/api/quote?symbol=SHEL.L');assert.equal(r.data.currency,'GBP');assert.equal(r.data.price,1.1);assert.equal(r.data.previousClose,1);
globalThis.caches={get default(){throw new Error('Cache API is unavailable in this runtime');}};r=await call('/api/quote?symbol=AAPL');assert.equal(r.status,200);assert.equal(r.data.price,110);
globalThis.caches={default:{match:async()=>{throw new Error('Cache storage unavailable');}}};r=await call('/api/quote?symbol=NVDA');assert.equal(r.status,200);delete globalThis.caches;
network='flat';r=await call('/api/technical?symbol=AAPL');assert.equal(r.data.rsi,50);assert.equal(r.data.macd,0);assert.equal(r.data.beta,null);
network='news-down';r=await call('/api/stock?symbol=AAPL');assert.equal(r.status,200);assert.equal(r.data.news.available,false);assert.equal(r.data.price,110);assert.ok(r.data.history.length===90);
network='down';r=await call('/api/search?q=Nestle');assert.equal(r.status,200);assert.equal(r.data.providerAvailable,false);assert.equal(r.data.results[0].symbol,'NESN.SW');
r=await call('/api/scanner?region=europe');assert.equal(r.status,502);r=await call('/api/quote?symbol=AAPL');assert.equal(r.status,502);r=await call('/api/quote?symbol=%3Cscript%3E');assert.equal(r.status,400);
network='ok';r=await call('/api/catalog');assert.equal(r.data.results.length,36);
// Intraday semantics, independent-source comparison and safe fallbacks.
const sent=[];let yahooDown=false,krakenDown=false,stale=false;
globalThis.fetch=async(url,options={})=>{
 sent.push(String(url));
 if(String(url).includes('api.kraken.com')){if(krakenDown)return new Response('{}',{status:503});return Response.json({error:[],result:{XXBTZUSD:[['111','1',Date.now()/1000-(stale?3600:0),'b','m','',1]],last:'1'}});}
 if(String(url).includes('finnhub.io')){assert.equal(options.headers['X-Finnhub-Token'],'test-secret');return Response.json(String(url).includes('profile2')?{ticker:'AAPL',name:'Apple',currency:'USD',exchange:'NASDAQ'}:{c:111,t:Date.now()/1000,dp:1});}
 if(yahooDown)return new Response('{}',{status:503});
 const d=fixture(String(url).includes('BTC-USD')?'BTC-USD':'AAPL');d.chart.result[0].meta.regularMarketTime=Date.now()/1000;d.chart.result[0].meta.chartPreviousClose=100;return Response.json(d);
};
r=await call('/api/intraday?symbol=AAPL');assert.equal(r.status,200);assert.equal(r.data.change,10);assert.equal(r.data.resolution,'1m');assert.equal(r.data.refreshSeconds,30);assert.equal(r.data.comparison.comparable,false);assert.equal(r.data.sources.find(x=>x.name==='Finnhub').status,'not_connected');assert.ok(sent.some(x=>x.includes('interval=1m&range=1d')));
r=await call('/api/intraday?symbol=BTC-USD');assert.equal(r.status,200);assert.equal(r.data.sources.length,2);assert.equal(r.data.comparison.comparable,true);assert.equal(r.data.source,'Yahoo Finance');assert.equal(r.data.price,110);
stale=true;r=await call('/api/intraday?symbol=BTC-USD');assert.equal(r.data.comparison.comparable,false);assert.equal(r.data.comparison.deviationPercent,null);stale=false;
yahooDown=true;r=await call('/api/intraday?symbol=BTC-USD');assert.equal(r.status,200);assert.equal(r.data.source,'Kraken');assert.equal(r.data.price,111);assert.deepEqual(r.data.history,[]);assert.equal(r.data.comparison.comparable,false);
krakenDown=true;r=await call('/api/intraday?symbol=BTC-USD');assert.equal(r.status,502);yahooDown=false;
const keyed=await worker.fetch(new Request('https://example.test/api/intraday?symbol=AAPL'),{FINNHUB_API_KEY:'test-secret'});const kd=await keyed.json();assert.equal(kd.sources.find(x=>x.name==='Finnhub').status,'available');assert.ok(!JSON.stringify(kd).includes('test-secret'));
globalThis.fetch=actualFetch;
const source=fs.readFileSync(new URL('../worker/index.js',import.meta.url),'utf8');const page=JSON.parse(source.split('\n')[0].slice('const page = '.length,-1));const script=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
const ids=new Set([...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const nodes=new Map();let alerts=[];const storage=new Map();
function element(id){if(!nodes.has(id))nodes.set(id,{id,value:'',textContent:'',innerText:'',innerHTML:'',disabled:false,hidden:false,style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},addEventListener(){},focus(){},getContext(){return{};},querySelector(){return null;},insertAdjacentHTML(_,s){this.innerHTML+=s;}});return nodes.get(id);}
const context=vm.createContext({PortfolioMath:portfolioEngine(),console,Intl,Date,Math,JSON,Number,String,Array,Object,Map,Set,Promise,Error,RegExp,Boolean,encodeURIComponent,decodeURIComponent,AbortController,URL,Blob,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},alert:x=>alerts.push(x),confirm:()=>true,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{hidden:false,getElementById:element,querySelectorAll:()=>[],addEventListener(){},querySelector(){return null}},window:{},Chart:class{destroy(){}},fetch:async()=>{throw new Error('Provider down');}});
vm.runInContext(script,context);vm.runInContext('renderAll=()=>{};renderWatchlist=()=>{};',context);
const run=s=>vm.runInContext(s,context);
function fields(o){for(const[k,v]of Object.entries(o))element(k).value=String(v);}
fields({t_date:'2026-09-22',t_type:'Kauf',t_ticker:'AAPL',t_shares:-1,t_price:100,t_fee:2,t_note:'',t_currency:'CHF'});run('addTransaction()');assert.equal(run('appData.holdings.length'),0);assert.ok(alerts.length);
fields({t_shares:10});run('addTransaction()');assert.equal(run('appData.holdings[0].shares'),10);assert.equal(run('appData.holdings[0].fees'),2);
fields({t_type:'Verkauf',t_ticker:'AAPL',t_shares:4,t_price:120,t_fee:1,t_currency:'CHF'});run('addTransaction()');assert.equal(run('appData.holdings[0].shares'),6);assert.equal(run('appData.holdings[0].fees'),1.2);assert.equal(run('appData.transactions[0].realized'),78.2);
run('deleteTransaction(appData.transactions[0].id)');assert.equal(run('appData.holdings[0].shares'),10);assert.equal(run('appData.holdings[0].fees'),2);
run('deleteTransaction(appData.transactions[0].id)');assert.equal(run('appData.holdings.length'),0);assert.equal(run('appData.transactions.length'),0);
assert.throws(()=>run('normalizeData({holdings:"broken"})'));
assert.throws(()=>run('normalizeData({holdings:[{ticker:"AAPL",shares:-1,buyPrice:1,currentPrice:1}]})'));
assert.equal(run('normalizeData({holdings:[]}).settings.currency'),'CHF');
const csv=run('toCsv([{name:"=1+1",shares:2}], ["name","shares"])');assert.ok(csv.includes('\r\n'));assert.ok(csv.includes("'=1+1"));assert.ok(!csv.includes('\\n'));
run('appData.notes=[{id:"safe",date:"2026-09-22",text:"<img src=x onerror=alert(1)>"}];renderNotes()');assert.ok(element('notesList').innerHTML.includes('&lt;img'));assert.ok(!element('notesList').innerHTML.includes('<img'));
fields({quickStockInput:'AAPL'});run("fetchQuote=async()=>({symbol:'AAPL',name:'Apple',price:110,currency:'USD',quoteTime:1,source:'Test',change:10,marketState:'Offen',delayNotice:''});api=async()=>{throw new Error('No forecast')}");await run('showQuickStock()');assert.ok(element('quickStockOutput').innerHTML.includes('Apple'));assert.ok(element('quickStockOutput').innerHTML.includes('noch nicht genug'));
run("stopQuickMonitor();quickStockSymbol='';fetchQuote=async()=>{throw new Error('Not available')}");await run('toggleQuickMonitor()');assert.equal(run('quickStockMonitor'),null);
const referenced=[...script.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]);const missing=[...new Set(referenced.filter(id=>!ids.has(id)&&!['onlineLoading','stockChart'].includes(id)))];assert.deepEqual(missing,[]);
console.log('PASS: quote date/change, currency units, RSI/MACD, partial provider failures, catalogue, transactions/undo/fees, backup validation, CSV, escaped notes, quote without forecast, monitor failure, element references.');

run("detailAuto=true;currentStock={symbol:'AAPL',history:[],forecast:null};detailRange='live';api=async()=>({symbol:'AAPL',price:111,currency:'USD',source:'Yahoo Finance',quoteTime:Date.now(),exchange:'NASDAQ',name:'Apple',marketState:'Offen',delayNotice:'',history:[{timestamp:Date.now(),close:111}],sources:[{name:'Yahoo Finance',quote:{price:111,currency:'USD',quoteTime:Date.now()}}],comparison:{comparable:false,message:'Kein unabhängiger Vergleich'}})");
await run('refreshDetailLive()');assert.equal(run('currentStock.price'),111);assert.ok(element('stockChart').innerHTML.includes('Minutenpunkte'));assert.ok(element('stockChart').innerHTML.includes('<circle'));assert.ok(element('detailChartNote').textContent.includes('kein Sekundenfeed'));
run("api=()=>new Promise(resolve=>globalThis.finishOldRequest=resolve)");const pending=run('refreshDetailLive()');run("stopDetailLive();currentStock={symbol:'TSLA',price:222,history:[]};finishOldRequest({symbol:'AAPL',price:999})");await pending;assert.equal(run('currentStock.price'),222);
console.log('PASS: intraday resolution, timestamp-based comparison, missing access, provider fallback, no leaked secret, live rendering and stale-response cancellation.');
// Exercise the personalized pages with actual holdings and unfilled profile.
fields({scenarioDays:'30',personalShock:'-20',profileGoal:'grow',profileMonths:'60',profileLoss:'15',profilePosition:'25'});
run("appData.holdings=[{id:'held',ticker:'AAPL',name:'Apple',currency:'CHF',shares:2,currentPrice:100,buyPrice:90,assetClass:'Aktien'}];personalMarket={};personalFx={};renderPersonalViews();");
assert.ok(element('personalRisk').innerHTML.includes('fehlen'));
assert.ok(element('personalDiversification').innerHTML.includes('100'));
assert.ok(element('personalScenarios').innerHTML.includes('Keine Hochrechnung'));
assert.ok(!element('personalScenarios').innerHTML.includes('7 %'));
run('saveInvestorProfile()');assert.equal(run('appData.settings.investorProfile.months'),60);assert.ok(element('personalInsights').innerHTML.includes('Über deiner Positionsgrenze'));
assert.equal(run('normalizeData(appData).settings.investorProfile.lossLimit'),15);
console.log('PASS: personal page rendering, missing-data state, profile limits and backup preservation.');
// Reproduce the empty-page CTA -> guided capture -> all three analysis views.
const modal=element('holdingWizard');modal.open=false;modal.showModal=function(){this.open=true;};modal.close=function(){this.open=false;};
for(const id of ['portfolio','risiko','diversifikation','prognose']){const classes=new Set();element(id).classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)};}
run("appData.holdings=[];personalLoadedAt=Date.now();refreshPersonalPortfolio=async()=>{};fetchQuote=async(symbol)=>({symbol,name:'Apple',price:100,currency:'USD',exchange:'NASDAQ',source:'Fixture',quoteTime:Date.now(),instrumentType:'EQUITY'})");
const emptyMarkup=run('personalEmpty()');const cta=emptyMarkup.match(/onclick="(openHoldingWizard\(\))"/)[1];run(cta);assert.equal(modal.open,true);assert.equal(element('hwDetails').hidden,true);
await run("chooseHoldingAsset('AAPL')");assert.equal(element('hwDetails').hidden,false);assert.equal(run('holdingWizardQuote.currency'),'USD');
fields({hwShares:'2.5',hwBuy:'',hwClass:'Aktien'});await run('saveGuidedHolding()');assert.equal(run('appData.holdings.length'),1);assert.equal(run('appData.holdings[0].shares'),2.5);assert.equal(run('appData.holdings[0].buyPrice'),null);assert.equal(run('appData.holdings[0].costKnown'),false);assert.equal(run('normalizeData(appData).holdings[0].buyPrice'),null);assert.ok(Number.isNaN(run('totalCost()')));assert.equal(element('hwSuccess').hidden,false);
run('renderDashboard();renderPortfolio()');assert.ok(element('kpiTotalTrend').innerText.includes('Kaufpreis fehlt'));assert.ok(element('portfolioTableWrap').innerHTML.includes('Kaufpreis fehlt'));
for(const view of ['risiko','diversifikation','prognose']){run("openSavedAnalysis('"+view+"')");assert.equal(element(view).classList.contains('active'),true);assert.equal(modal.open,false);}
// Unknown cost basis stays unknown through later buys and sales.
fields({t_type:'Kauf',t_ticker:'AAPL',t_shares:1,t_price:120,t_fee:0,t_currency:'USD'});run('addTransaction()');assert.equal(run('appData.holdings[0].buyPrice'),null);
fields({t_type:'Verkauf',t_shares:1});run('addTransaction()');assert.equal(run('appData.transactions[0].realized'),null);
run("updateHoldingBasis(appData.holdings[0].id,'90')");assert.equal(run('appData.holdings[0].costKnown'),true);assert.ok(Number.isFinite(run('totalCost()')));
// No hidden write if browser persistence fails.
run("openHoldingWizard();fetchQuote=async()=>({symbol:'MSFT',name:'Microsoft',price:200,currency:'USD',source:'Fixture',quoteTime:Date.now()})");await run("chooseHoldingAsset('MSFT')");fields({hwShares:1,hwBuy:''});const saveStorage=context.localStorage.setItem;context.localStorage.setItem=()=>{throw new Error('Quota exceeded');};await run('saveGuidedHolding()');assert.equal(run('appData.holdings.length'),1);assert.ok(element('hwStatus').textContent.includes('nicht gespeichert'));context.localStorage.setItem=saveStorage;
console.log('PASS: empty CTA opens capture, fractional shares, persisted unknown cost, all analysis links, cost-basis transactions and storage failure.');
// A rerender must not rewrite history; explicit replacement is atomic.
run("appData.snapshots=[];appData.settings.rates={CHF:1,USD:1};appData.holdings=[{ticker:'AAPL',name:'Apple',currency:'CHF',shares:2,currentPrice:100,priceSource:'Fixture',quoteTime:Date.now(),assetClass:'Aktien'}];autoSnapshot()");
assert.equal(run('appData.snapshots[0].value'),200);
const firstCapture=run('JSON.stringify(appData.snapshots[0])');
run('appData.holdings[0].currentPrice=125;autoSnapshot()');assert.equal(run('JSON.stringify(appData.snapshots[0])'),firstCapture);
run('saveSnapshot()');assert.equal(run('appData.snapshots[0].value'),250);assert.equal(run('appData.snapshots[0].currency'),'CHF');assert.equal(run('appData.snapshots[0].positions[0].price'),125);
run('appData.settings.currency="USD";appData.settings.rates.USD=2;renderPerformance()');assert.ok(element('snapTableWrap').innerHTML.includes('250.00'));assert.ok(!element('snapTableWrap').innerHTML.includes('500.00'));
assert.ok(element('perfChart').innerHTML.includes('<circle'));assert.ok(!element('perfChart').innerHTML.includes('<path'));assert.ok(element('perfChart').innerHTML.includes('Ein erster Stand'));
context.localStorage.setItem=()=>{throw new Error('Quota exceeded');};run('appData.holdings[0].currentPrice=150;saveSnapshot()');assert.equal(run('appData.snapshots[0].value'),250);context.localStorage.setItem=saveStorage;
run('appData.holdings=[];autoSnapshot()');assert.equal(run('appData.snapshots[0].value'),250);
assert.equal(run("snapshotPlot([{date:'2026-09-01',value:100},{date:'2026-09-03',value:150},{date:'2026-09-11',value:200}]).match(/<circle cx=\"([^\"]+)/g)[1]"),'<circle cx="246.4');
fields({personalShock:'',scenarioDays:'30'});
run("personalAssessment=()=>({positions:[{}],quoteCoverage:1,historyCoverage:1,total:999999,profile:{},unvalued:[],model:{start:'2025-01-01',end:'2026-09-01',scenarios:{30:{windows:[{start:'2026-08-01',end:'2026-08-31',return:.1}]}}}});renderPrognose()");
assert.ok(element('personalScenarios').innerHTML.includes('2026-08-01'));assert.ok(element('personalScenarios').innerHTML.includes('+10 %'));assert.ok(!element('personalScenarios').innerHTML.includes('1’099'));assert.ok(!element('personalScenarios').innerHTML.includes(run("money(999999*1.1,'CHF')"))); 
assert.ok(element('personalStress').textContent.includes('Ohne Eingabe'));assert.ok(!page.match(/id="personalShock"[^>]*value=/));
console.log('PASS: snapshots are immutable on rerender, explicit atomic replacement, stable CHF values, storage failure, real-date chart points, dated historical windows and no automatic stress assumption.');

