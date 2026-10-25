/* LogisTank: planificador volumétrico orientativo. Sin certificación de seguridad.
 * Equivalente funcional al algoritmo Android 1.8: exclusividad de producto por
 * compartimento, llenado parcial, puntos/zonas y minimización estimada de cruces.
 * Entrada: station, tanker, side ('LEFT'|'RIGHT'), request {codigo: litros}.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LogisTankPlanner=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const POSITIVE='Introduce al menos un producto con una cantidad positiva.';
  const uppercase=x=>String(x==null?'':x).trim().toUpperCase();
  const validTanker=t=>!!t&&String(t.number||'').trim().length>0&&String(t.number).length<=48&&
    Array.isArray(t.capacities)&&t.capacities.length>=2&&t.capacities.length<=6&&
    t.capacities.every(v=>Number.isSafeInteger(v)&&v>=1&&v<=100000)&&
    ['LEFT','RIGHT','BOTH'].includes(t.dischargeSide);
  const allowedSides=(t,s)=>{
    const a=t==='BOTH'?['RIGHT','LEFT']:[t],b=s==='BOTH'?['RIGHT','LEFT']:[s];
    return ['RIGHT','LEFT'].filter(x=>a.includes(x)&&b.includes(x));
  };
  const toPoints=station=>{
    let arr=station&&((station.productos!==undefined&&station.productos)||station.tanques)||[];
    if(typeof arr==='string'){try{arr=JSON.parse(arr);}catch(_){arr=[];}}
    return Array.isArray(arr)?arr:[];
  };
  function propose(station,tanker,side,request) {
    if(!validTanker(tanker))return {error:'Configura una cisterna válida, de 2 a 6 compartimentos.'};
    const stationSide=uppercase(station&&(station.ladoDescarga||station.lado)||'RIGHT');
    if(!allowedSides(tanker.dischargeSide,stationSide).includes(side))
      return {error:'El lado de descarga no es compatible con la cisterna y la gasolinera.'};
    const demands=new Map();
    for(const [raw,val] of Object.entries(request||{})){
      const code=uppercase(raw),amount=Number(val);
      if(!code||!Number.isSafeInteger(amount)||amount<0)return {error:'Los litros tienen que ser números enteros no negativos.'};
      if(amount>0){const sum=(demands.get(code)||0)+amount;
        if(!Number.isSafeInteger(sum))return {error:'Cantidad de litros demasiado grande.'};
        demands.set(code,sum);}
    }
    if(!demands.size)return {error:POSITIVE};
    const codes=[...demands.keys()].sort(),caps=tanker.capacities.slice(),n=caps.length,total=[...demands.values()].reduce((a,b)=>a+b,0);
    if(codes.length>n)return {error:'Hay más productos diferentes que compartimentos; no se pueden mezclar.'};
    if(total>caps.reduce((a,b)=>a+b,0))return {error:'Los litros solicitados superan la capacidad total.'};
    const points=toPoints(station),zones=Math.max(1,Math.min(10,Number(station.zonasDescarga||station.zonas)||1)),sign=side==='LEFT'?-1:1;
    const outlets=codes.map(code=>points.map((p,index)=>({p,index})).filter(({p})=>
      uppercase(p.codigoProducto)===code && (p.lado==null || p.lado==='' || p.lado==='BOTH' || p.lado===side) &&
      Number(p.zonaIndex)>=1 && Number(p.zonaIndex)<=zones &&
      Number.isFinite(Number(p.nx))&&Number.isFinite(Number(p.ny))
    ).map(({p,index})=>({index,zone:Number(p.zonaIndex),
      position:Math.min(1,Math.max(0,(235+sign*Number(p.ny)-75)/320)),
      lateral:Math.abs(82+Number(p.nx))/320})));
    if(outlets.some(o=>!o.length))return {error:'Algún producto solicitado no tiene boca registrada para ese lado de descarga.'};
    const requirements=codes.map(c=>demands.get(c));
    const assigned=new Array(codes.length).fill(0),labels=new Array(n).fill(-1);
    const remaining=new Array(n+1).fill(0);
    for(let i=n-1;i>=0;i--)remaining[i]=remaining[i+1]+caps[i];
    const dist=(i,o)=>Math.abs((i+.5)/n-o.position)+.25*o.lateral;
    const nearest=outlets.map(os=>caps.map((_,i)=>Math.min(...os.map(o=>dist(i,o)))));
    let best=null;
    const EPS=1e-8;
    function better(a,b){
      if(!b)return true;
      if(a.crossings!==b.crossings)return a.crossings<b.crossings;
      if(a.used!==b.used)return a.used<b.used;
      if(Math.abs(a.distance-b.distance)>EPS)return a.distance<b.distance;
      if(a.partial!==b.partial)return a.partial<b.partial;
      return a.unused<b.unused;
    }
    function chooseOutlets(active){
      // Búsqueda exacta para combinaciones pequeñas, aproximación acotada en las grandes.
      let combinations=1;
      for(const i of active)combinations=Math.min(12001,combinations*outlets[labels[i]].length);
      const beam=combinations<=12000?12000:128;
      let paths=[{chosen:[],crossings:0,distance:0}];
      for(const i of active){
        const next=[];
        for(const path of paths)for(const o of outlets[labels[i]]){
          let cr=path.crossings;
          for(const before of path.chosen)if(before.zone===o.zone&&before.position>o.position+EPS)cr++;
          next.push({chosen:[...path.chosen,o],crossings:cr,distance:path.distance+dist(i,o)});
        }
        next.sort((a,b)=>a.crossings-b.crossings||a.distance-b.distance||
          a.chosen.map(x=>x.index).join(',').localeCompare(b.chosen.map(x=>x.index).join(',')));
        paths=next.slice(0,beam);
      }
      return paths[0];
    }
    function consider(){
      if(requirements.some((r,p)=>assigned[p]<r))return;
      const active=labels.map((p,i)=>p>=0?i:-1).filter(i=>i>=0);
      if(best&&best.crossings===0&&active.length>best.used)return;
      const liters=new Array(n).fill(0);
      for(let p=0;p<codes.length;p++){
        const slots=active.filter(i=>labels[i]===p).sort((a,b)=>caps[a]-caps[b]||nearest[p][a]-nearest[p][b]||a-b);
        if(slots.length>requirements[p])return;
        let left=requirements[p];
        slots.forEach((i,j)=>{
          const remSlots=slots.length-j-1,amount=Math.min(caps[i],left-remSlots);
          if(amount<=0)return;liters[i]=amount;left-=amount;
        });
        if(left!==0)return;
      }
      if(best&&best.crossings===0&&active.length===best.used){
        const optimistic=active.reduce((sum,i)=>sum+nearest[labels[i]][i],0);
        if(optimistic>best.distance+EPS)return;
      }
      const path=chooseOutlets(active);
      if(!path)return;
      const candidate={labels:labels.slice(),liters,crossings:path.crossings,used:active.length,
        distance:path.distance,partial:active.filter(i=>liters[i]<caps[i]).length,
        unused:active.reduce((s,i)=>s+caps[i]-liters[i],0),selected:active.map((i,j)=>[i,path.chosen[j]])};
      if(better(candidate,best))best=candidate;
    }
    function search(i){
      for(let p=0;p<codes.length;p++)if(assigned[p]+remaining[i]<requirements[p])return;
      if(assigned.filter(x=>x===0).length>n-i)return;
      if(i===n){consider();return;}
      labels[i]=-1;search(i+1);
      for(let p=0;p<codes.length;p++){
        if(assigned[p]>=requirements[p])continue;
        labels[i]=p;assigned[p]+=caps[i];search(i+1);assigned[p]-=caps[i];
      }
      labels[i]=-1;
    }
    search(0);
    if(!best)return {error:'No existe un reparto por compartimentos para estas cantidades, aunque la suma total quepa. Cada compartimento admite un único producto.'};
    const selections=new Map(best.selected),compartments=caps.map((capacity,i)=>{
      const o=selections.get(i),p=best.labels[i];
      return {number:i+1,capacityLiters:capacity,product:p<0?null:codes[p],liters:best.liters[i],
        outletZone:o?o.zone:null,outletIndex:o?o.index:null};
    });
    const crossedZones={};
    for(let i=0;i<best.selected.length;i++)for(let j=i+1;j<best.selected.length;j++){
      const a=best.selected[i][1],b=best.selected[j][1];
      if(a.zone===b.zone&&a.position>b.position+EPS)crossedZones[a.zone]=(crossedZones[a.zone]||0)+1;
    }
    return {proposal:{tankerNumber:tanker.number,dischargeSide:side,compartments,totalLiters:total,
      usedCompartments:best.used,estimatedCrossingPairs:best.crossings,estimatedLayoutDistance:best.distance,
      usedOutletCount:new Set(best.selected.map(x=>x[1].index)).size,crossedZones}};
  }
  return {propose,validTanker,allowedSides,toPoints};
});
