import assert from 'node:assert/strict';
import {portfolioEngine} from '../worker/portfolio-math.js';
const {analyze,profile}=portfolioEngine();
const dates=Array.from({length:800},(_,i)=>new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10));
function data(symbol,returns,currency='CHF'){let close=100;const history=[{date:dates[0],close}];returns.forEach((r,i)=>{close*=1+r;history.push({date:dates[i+1],close});});return {symbol,currency,price:100,quoteTime:Date.parse(dates[returns.length]),source:'Fixture',history};}
const ra=Array.from({length:500},(_,i)=>i%2?.01:-.01),rb=ra.map(r=>-r),a=data('A',ra),b=data('B',rb);
const holdings=[{ticker:'A',name:'A',shares:1,currentPrice:100,currency:'CHF',assetClass:'Aktien'},{ticker:'B',name:'B',shares:1,currentPrice:100,currency:'CHF',assetClass:'Aktien'}];
let d=analyze(holdings,{A:a,B:b},{},{CHF:1},{lossLimit:15,positionLimit:20,months:60},Date.parse(dates[500]));
assert.equal(d.total,200);assert.equal(d.effectiveCount,2);assert.equal(d.largest,.5);assert.ok(d.model.volatility<1e-12);assert.ok(Math.abs(d.model.maxDrawdown)<1e-12);assert.ok(Math.abs(d.model.pairs[0].correlation+1)<1e-12);assert.ok(Math.abs(d.model.scenarios[365].median)<1e-12);assert.equal(d.model.scenarios[365].count,136);
d=analyze(holdings,{A:a});assert.equal(d.model,null);assert.equal(d.historyCoverage,.5);assert.ok(d.reason.includes('fehlen'));
// Same price path cannot be called diversified just because there are two tickers.
d=analyze(holdings,{A:a,B:{...a,symbol:'B'}});assert.ok(d.model.volatility>0);assert.ok(d.model.pairs[0].correlation>.99999);assert.ok(d.model.maxDrawdown<0);
// Foreign prices are converted with each historical FX point, not today's FX rate.
const foreign=[{...holdings[0],currency:'USD'}],flat=data('A',ra.map(()=>0),'USD'),fx=data('USDCHF=X',ra,'CHF');fx.price=.9;
d=analyze(foreign,{A:flat},{USD:fx},{CHF:1,USD:1.1});assert.equal(d.total,90);assert.ok(d.model.volatility>0);assert.equal(d.quoteCoverage,1);
d=analyze(foreign,{A:flat},{},{CHF:1,USD:1.1});assert.equal(d.model,null);assert.equal(d.quoteCoverage,0);assert.equal(d.positions[0].fxOnline,false);
// Incorrect quote currency must not silently revalue the portfolio.
d=analyze(foreign,{A:a},{USD:fx},{CHF:1,USD:1.1});assert.equal(d.model,null);assert.equal(d.positions[0].online,false);
// Insufficient and discontinuous observations do not produce invented statistics.
d=analyze([holdings[0]],{A:data('A',ra.slice(0,59))});assert.equal(d.model,null);
const broken={...a,history:a.history.filter((_,i)=>i<100||i>120)};d=analyze([holdings[0]],{A:broken});assert.equal(d.model,null);assert.ok(d.reason.includes('Lücken'));
d=analyze([holdings[0]],{A:data('A',ra.slice(0,70))});assert.equal(d.model.scenarios[365].median,null);
// Unknown FX means unknown total, not a made-up 1:1 rate.
d=analyze(foreign,{A:flat},{},{CHF:1});assert.equal(d.total,0);assert.equal(d.unvalued.length,1);assert.equal(d.model,null);
// Cash is included in weights, never omitted from portfolio risk.
d=analyze([holdings[0],{...holdings[1],assetClass:'Bargeld'}],{A:a});const single=analyze([holdings[0]],{A:a});assert.ok(Math.abs(d.model.volatility-single.model.volatility/2)<1e-12);
assert.deepEqual(profile({lossLimit:-1,positionLimit:200,months:'60',goal:'<script>'}),{});
assert.deepEqual(profile({lossLimit:20,positionLimit:30,months:120,goal:'grow'}),{months:120,lossLimit:20,positionLimit:30,goal:'grow'});
assert.equal(analyze([],{}).model,null);
console.log('PASS: portfolio covariance, concentration, FX history, missing data, currency mismatch, gaps, scenario sample sizes, cash weighting and profile validation.');
// Every historical comparison can be reproduced from the dated model index.
d=analyze([holdings[0]],{A:data('A',ra)});
for(const days of [30,90,365])for(const w of d.model.scenarios[days].windows){
 const start=d.model.series.find(x=>x.date===w.start),end=d.model.series.find(x=>x.date===w.end);
 assert.ok(Date.parse(w.end)-Date.parse(w.start)>=days*86400000);
 assert.ok(Math.abs(w.return-(end.close/start.close-1))<1e-12);
}
assert.deepEqual(d.model.scenarios,analyze([holdings[0]],{A:data('A',ra)}).model.scenarios);
console.log('PASS: historical windows have actual dates and deterministic, reproducible returns.');

