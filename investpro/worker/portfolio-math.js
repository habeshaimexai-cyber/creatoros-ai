// Runs identically in the browser and deterministic regression tests.
// Holdings and profile stay on the device; only public tickers are requested.
export function portfolioEngine(){
 const finite=Number.isFinite,valid=n=>finite(n)&&n>0;
 const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
 const variance=a=>{if(a.length<2)return null;const m=mean(a);return a.reduce((s,n)=>s+(n-m)**2,0)/(a.length-1);};
 const quantile=(a,q)=>{const b=[...a].sort((x,y)=>x-y),i=(b.length-1)*q,l=Math.floor(i);return b[l]+(b[Math.ceil(i)]-b[l])*(i-l);};
 function series(d){const h=d?.history||[],adjusted=h.length>0&&h.every(x=>valid(x.adjusted));return new Map(h.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&valid(adjusted?x.adjusted:x.close)).map(x=>[x.date,adjusted?x.adjusted:x.close]));}
 function profile(value={}){const p={};for(const [k,min,max] of [['months',1,600],['lossLimit',1,100],['positionLimit',1,100]])if(finite(value[k])&&value[k]>=min&&value[k]<=max)p[k]=value[k];if(['preserve','grow','income'].includes(value.goal))p.goal=value.goal;return p;}
 function analyze(holdings,market={},fx={},fallbackRates={CHF:1},rawProfile={},now=Date.now()){
  const p=profile(rawProfile),positions=[],unvalued=[];let total=0;
  for(const h of holdings){
   const cash=h.assetClass==='Bargeld',d=market[h.ticker],match=d?.currency===h.currency&&d?.symbol===h.ticker,online=!cash&&match&&valid(d.price),price=online?d.price:Number(h.currentPrice),f=h.currency==='CHF'?1:fx[h.currency]?.currency==='CHF'&&valid(fx[h.currency]?.price)?fx[h.currency].price:null,fxOnline=finite(f),conversion=fxOnline?f:valid(fallbackRates[h.currency])?1/fallbackRates[h.currency]:null;
   if(!valid(price)||!valid(Number(h.shares))||!valid(conversion)){unvalued.push(h.ticker);continue;}
   const value=price*Number(h.shares)*conversion;total+=value;
   let map=cash?null:match?series(d):new Map(),fxMap=h.currency==='CHF'?null:series(fx[h.currency]);
   if(cash&&h.currency!=='CHF')map=new Map([...fxMap].map(([date,v])=>[date,v]));
   else if(!cash&&h.currency!=='CHF')map=new Map([...map].filter(([date])=>fxMap.has(date)).map(([date,v])=>[date,v*fxMap.get(date)]));
   positions.push({ticker:h.ticker,name:h.name||h.ticker,assetClass:h.assetClass||'Sonstiges',currency:h.currency,value,price,weight:0,cash,online,fxOnline,quoteTime:online?d.quoteTime:h.quoteTime||null,source:online?d.source:cash?'Deine Bargeldangabe':'Gespeicherter / manueller Kurs',history:map,historyValid:cash&&h.currency==='CHF'||map.size>=61});
  }
  positions.forEach(x=>x.weight=total?x.value/total:0);positions.sort((a,b)=>b.value-a.value);
  const groups={positions:{},classes:{},currencies:{}};
  for(const x of positions){for(const [key,label] of [['positions',x.ticker],['classes',x.assetClass],['currencies',x.currency]])groups[key][label]=(groups[key][label]||0)+x.value;}
  const weights=Object.values(groups.positions).map(v=>v/total),hhi=weights.reduce((s,w)=>s+w*w,0);
  const output={total,positions,unvalued,groups,profile:p,effectiveCount:hhi?1/hhi:0,largest:weights.length?Math.max(...weights):0,top3:weights.sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0),quoteCoverage:positions.reduce((s,x)=>s+(x.online&&x.fxOnline?x.weight:0),0),historyCoverage:positions.reduce((s,x)=>s+(x.historyValid?x.weight:0),0),model:null,reason:'Noch keine Positionen erfasst.'};
  if(!positions.length)return output;
  if(unvalued.length){output.reason='Nicht alle Positionen können bewertet werden. Keine Gesamtportfolio-Kennzahl.';return output;}
  if(positions.some(x=>!x.historyValid)){output.reason='Für mindestens eine Position fehlen ausreichende Kurs- oder Wechselkursreihen. Keine Hochrechnung auf das Gesamtportfolio.';return output;}
  const varying=positions.filter(x=>x.history!==null);
  if(!varying.length){output.reason='Nur CHF-Bargeld erfasst. Keine Kursreihe für ein Marktmodell; Inflation und Bankrisiken sind nicht abgebildet.';return output;}
  const dates=[...varying[0].history.keys()].filter(date=>varying.every(x=>x.history.has(date))).sort();
  if(dates.length<61){output.reason='Weniger als 60 gemeinsame Renditebeobachtungen. Gesamtportfolio-Risiko noch nicht berechenbar.';return output;}
  const times=dates.map(Date.parse),gap=Math.max(...times.slice(1).map((t,i)=>(t-times[i])/86400000));
  if(gap>10){output.reason='Zu grosse Lücken zwischen gemeinsamen Kurstagen. Kein verlässliches Gesamtportfolio-Modell.';return output;}
  const assetReturns=positions.map(x=>dates.slice(1).map((date,i)=>x.history?x.history.get(date)/x.history.get(dates[i])-1:0));
  const returns=dates.slice(1).map((_,i)=>positions.reduce((s,x,j)=>s+x.weight*assetReturns[j][i],0));
  const annualFactor=returns.length/((times.at(-1)-times[0])/86400000/365.25),wealth=[1];
  returns.forEach(r=>wealth.push(wealth.at(-1)*(1+r)));
  let peak=1,maxDrawdown=0;for(const v of wealth){peak=Math.max(peak,v);maxDrawdown=Math.min(maxDrawdown,v/peak-1);}
  const pairs=[];for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){const a=assetReturns[i],b=assetReturns[j],va=variance(a),vb=variance(b);if(va>0&&vb>0){const ma=mean(a),mb=mean(b),cov=a.reduce((s,x,k)=>s+(x-ma)*(b[k]-mb),0)/(a.length-1);pairs.push({a:positions[i].ticker,b:positions[j].ticker,correlation:Math.max(-1,Math.min(1,cov/Math.sqrt(va*vb)))});}}
  const scenarios={};for(const days of [30,90,365]){const samples=[],windows=[];let j=0;for(let i=0;i<dates.length;i++){j=Math.max(j,i+1);while(j<times.length&&times[j]-times[i]<days*86400000)j++;if(j<times.length){const value=wealth[j]/wealth[i]-1;samples.push(value);windows.push({start:dates[i],end:dates[j],return:value});}}scenarios[days]={windows,count:samples.length,low:samples.length>=20?quantile(samples,.1):null,median:samples.length>=20?quantile(samples,.5):null,high:samples.length>=20?quantile(samples,.9):null};}
  const model={start:dates[0],end:dates.at(-1),observations:returns.length,annualFactor,volatility:Math.sqrt(variance(returns)*annualFactor),maxDrawdown,worstDay:Math.min(...returns),return:wealth.at(-1)-1,scenarios,pairs:pairs.sort((a,b)=>b.correlation-a.correlation).slice(0,8),stale:now-times.at(-1)>7*86400000,series:dates.map((date,i)=>({date,close:wealth[i]*100})),positionVolatility:positions.map((x,i)=>({ticker:x.ticker,volatility:Math.sqrt(variance(assetReturns[i])*annualFactor)}))};
  output.model=model;output.reason='Modell aus gemeinsamen Kurstagen mit heutigen Gewichten, täglich auf diese Gewichte zurückgesetzt; keine tatsächliche Depotperformance.';return output;
 }
 return {analyze,profile,variance,quantile};
}

