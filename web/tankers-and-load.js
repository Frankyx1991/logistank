/* LogisTank Web 1.8 — cisternas por cuenta y preparador de carga.
 * La copia local NO se sincroniza con Android. La sincronización requiere
 * confirmar un backend compatible y protegido (acción syncTankers).
 */
(function(){
'use strict';
const $=id=>document.getElementById(id), escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('es-ES',{maximumFractionDigits:0});
const storeKey=()=> 'logistank_web_tankers_v1_'+String(user&&user.id||'').replace(/[^a-zA-Z0-9_-]/g,'_');
let editing=null,station=null,chosenSide='RIGHT',lastProposal=null;
function state(){
 if(!user||!user.id)return {profiles:[],active:null};
 try{let raw=JSON.parse(localStorage.getItem(storeKey())||'null');
   if(raw&&Array.isArray(raw.profiles))return {profiles:raw.profiles.filter(LogisTankPlanner.validTanker),active:raw.active||null};}catch(_){}
 return {profiles:[],active:null};
}
function save(s){const valid=s.profiles.filter(LogisTankPlanner.validTanker);localStorage.setItem(storeKey(),JSON.stringify({profiles:valid,active:valid.some(x=>x.number===s.active)?s.active:null}));}
function selected(){let s=state();return s.profiles.find(x=>x.number===s.active)||null;}
function notice(){return '<div class="lt-web-alert"><strong>Almacenamiento local:</strong> tus cisternas y la selección activa se guardan solo en este navegador y en este dispositivo. No se han sincronizado con Android ni con Google Sheets. Evita borrar los datos del navegador antes de exportarlos.</div>';}
function baseScreen(){ocultarTodo();$('nav-superior').style.display='none';$('btn-fab').style.display='none';$('zona-cisternas').style.display='none';$('zona-carga').style.display='none';resetMessage();window.scrollTo({top:0});}
function tankerVisual(t,assign){
 let count=t.capacities.length;
 let parts=t.capacities.map((v,i)=>{
   let p=assign&&assign.find(x=>x.number===i+1),prod=p&&p.product,liters=p&&p.liters||0;
   return '<div class="lt-web-slot '+(!prod?'empty':'')+'" '+(prod?'data-product="1"':'')+'><strong>'+String(i+1)+'</strong><small>'+fmt(v)+' L</small>'+(prod?'<strong>'+escapeHtml(prod)+'</strong><small>'+fmt(liters)+' L</small>':'')+'</div>';
 }).reverse().join('');
 return '<div class="lt-web-tanker" style="--lt-count:'+count+'">'+parts+'</div><div class="lt-web-ends"><span>← Trasera</span><span>Cabina · Delantera →</span></div>';
}
function openTankers(){
 if(!user)return;
 baseScreen();$('zona-cisternas').style.display='block';
 renderTankers();
}
function renderTankers(){
 let s=state(),active=selected();
 let h='<div class="lt-web-panel"><div class="lt-web-actions justify-content-between"><h2 class="m-0">Cisternas</h2><button class="btn btn-outline-secondary" onclick="irPestana(\'GAS\')">← Volver</button></div><p class="lt-web-muted mt-2">Cada cisterna tiene entre 2 y 6 compartimentos, numerados del 1 delantero al último trasero.</p>';
 h+='<div class="lt-web-success">Cisterna activa: <strong>'+(active?escapeHtml(active.number):'ninguna')+'</strong></div>'+notice()+'<button class="btn btn-purple mt-2" onclick="LTWeb.editTanker()">+ Crear cisterna</button></div>';
 for(const p of s.profiles.slice().sort((a,b)=>String(a.number).localeCompare(String(b.number),'es',{numeric:true}))){
  h+='<article class="lt-web-panel"><div class="lt-web-actions justify-content-between"><h3 class="m-0">N.º '+escapeHtml(p.number)+'</h3>'+(p.number===s.active?'<span class="badge bg-success">Activa</span>':'')+'</div>';
  h+='<div class="lt-web-muted">'+p.capacities.length+' compartimentos · '+fmt(p.capacities.reduce((a,b)=>a+b,0))+' L · Descarga: '+({BOTH:'ambos lados',RIGHT:'derecha',LEFT:'izquierda'}[p.dischargeSide])+'</div>'+tankerVisual(p);
  h+='<div class="lt-web-actions mt-3">';
  if(p.number!==s.active)h+='<button class="btn btn-success btn-sm" onclick="LTWeb.selectTanker(this.dataset.num)" data-num="'+escapeHtml(p.number)+'">Seleccionar</button>';
  if(user.r!=='INVITADO')h+='<button class="btn btn-outline-primary btn-sm" onclick="LTWeb.editTanker(this.dataset.num)" data-num="'+escapeHtml(p.number)+'">Editar</button><button class="btn btn-outline-danger btn-sm" onclick="LTWeb.deleteTanker(this.dataset.num)" data-num="'+escapeHtml(p.number)+'">Eliminar</button>';
  h+='</div></article>';
 }
 $('zona-cisternas').innerHTML=h;
}
function editTanker(number){
 if(user.r==='INVITADO')return alert('Los invitados tienen acceso de solo lectura.');
 const existing=number?state().profiles.find(t=>t.number===number):null;
 editing=existing?existing.number:null;
 const profile=existing||{number:'',capacities:[10000,5000,5000,10000,5000],dischargeSide:'BOTH'};
 const h='<div class="lt-web-panel"><div class="lt-web-actions justify-content-between"><h2>'+(existing?'Editar cisterna':'Crear cisterna')+'</h2><button class="btn btn-outline-secondary" onclick="LTWeb.openTankers()">Cancelar</button></div>'+
 '<form onsubmit="LTWeb.saveTanker(event)"><div class="lt-web-grid">'+
 '<div class="lt-web-field"><label for="lt-tanker-number">Número de cisterna</label><input class="form-control" id="lt-tanker-number" required maxlength="48" value="'+escapeHtml(profile.number)+'"></div>'+
 '<div class="lt-web-field"><label for="lt-tanker-count">Compartimentos</label><select class="form-select" id="lt-tanker-count" onchange="LTWeb.drawCapacityInputs()">'+[2,3,4,5,6].map(n=>'<option value="'+n+'" '+(profile.capacities.length===n?'selected':'')+'>'+n+'</option>').join('')+'</select></div>'+
 '<div class="lt-web-field"><label for="lt-tanker-side">Lados de descarga</label><select class="form-select" id="lt-tanker-side">'+[['RIGHT','Derecha'],['LEFT','Izquierda'],['BOTH','Ambos lados']].map(([v,n])=>'<option value="'+v+'" '+(profile.dischargeSide===v?'selected':'')+'>'+n+'</option>').join('')+'</select></div></div>'+
 '<h3 class="fs-5 mt-3">Capacidad por compartimento (litros)</h3><div class="lt-web-capacity" id="lt-tanker-capacities"></div><div id="lt-tanker-total" class="lt-web-total mt-3"></div>'+
 '<button class="btn btn-purple mt-3" type="submit">Guardar cisterna</button></form></div>';
 $('zona-cisternas').innerHTML=h;
 $('zona-cisternas').dataset.prev=JSON.stringify(profile.capacities);
 drawCapacityInputs();
}
function drawCapacityInputs(){
 let count=Number($('lt-tanker-count').value),prev=[];
 try{prev=JSON.parse($('zona-cisternas').dataset.prev||'[]');}catch(_){}
 const old=[...document.querySelectorAll('.lt-cap-input')].map(n=>n.value);
 const values=old.length?old:prev;
 $('lt-tanker-capacities').innerHTML=Array.from({length:count},(_,i)=>
 '<div class="lt-web-field"><label for="lt-c-'+i+'">Compartimento '+(i+1)+(i===0?' (delantero)':'')+'</label><input class="form-control lt-cap-input" id="lt-c-'+i+'" type="number" min="1" max="100000" step="1" required value="'+escapeHtml(values[i]??5000)+'" oninput="LTWeb.totalCapacity()"></div>').join('');
 totalCapacity();
}
function totalCapacity(){
 const values=[...document.querySelectorAll('.lt-cap-input')].map(n=>Number(n.value));
 $('lt-tanker-total').textContent='Capacidad total: '+fmt(values.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0))+' L';
}
function saveTanker(event){
 event.preventDefault();
 const number=$('lt-tanker-number').value.trim(),capacities=[...document.querySelectorAll('.lt-cap-input')].map(x=>Number(x.value));
 const profile={number,capacities,dischargeSide:$('lt-tanker-side').value};
 if(!LogisTankPlanner.validTanker(profile))return alert('Comprueba identificador, capacidades enteras (1–100000 L) y lados.');
 const s=state();
 if(s.profiles.some(p=>p.number.toLowerCase()===number.toLowerCase()&&p.number!==editing))return alert('Ya existe una cisterna con ese número.');
 if(editing)s.profiles=s.profiles.filter(x=>x.number!==editing);
 s.profiles.push(profile);
 if(s.active===editing)s.active=number;
 if(!s.active)s.active=number;
 save(s);editing=null;renderTankers();
}
function deleteTanker(number){
 if(user.r==='INVITADO')return;
 if(!confirm('¿Eliminar la cisterna '+number+' de este navegador?'))return;
 const s=state();s.profiles=s.profiles.filter(x=>x.number!==number);if(s.active===number)s.active=null;save(s);renderTankers();
}
function selectTanker(number){const s=state();if(!s.profiles.some(x=>x.number===number))return;s.active=number;save(s);renderTankers();}
function openLoad(){
 if(!user||!vGas)return;
 station=vGas;chosenSide='RIGHT';lastProposal=null;baseScreen();$('zona-carga').style.display='block';renderLoad();
}
function gasProductCodes(s,side){
 const points=LogisTankPlanner.toPoints(s);
 return [...new Set(points.filter(p=>p.lado==null||p.lado===''||p.lado==='BOTH'||p.lado===side)
 .map(p=>String(p.codigoProducto||'').trim().toUpperCase()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
}
function loadInputs(){
 return [...document.querySelectorAll('[data-lt-product]')].reduce((a,e)=>{a[e.dataset.ltProduct]=Number(e.value||0);return a;},{});
}
function changeSide(side){
 const previous=loadInputs();chosenSide=side;lastProposal=null;renderLoad(previous);
}
function renderLoad(previous){
 const t=selected(),s=station,allow=t?LogisTankPlanner.allowedSides(t.dischargeSide,String(s.ladoDescarga||s.lado||'RIGHT')):[];
 if(!allow.includes(chosenSide))chosenSide=allow[0]||'RIGHT';
 const codes=gasProductCodes(s,chosenSide);
 let h='<div class="lt-web-panel"><div class="lt-web-actions justify-content-between"><h2 class="m-0">Preparar carga</h2><button class="btn btn-outline-secondary" onclick="LTWeb.closeLoad()">← Volver</button></div><h3 class="fs-5 mt-3">'+escapeHtml(s.nombre)+'</h3>';
 h+='<p class="lt-web-muted">Cisterna activa: <strong>'+(t?escapeHtml(t.number):'ninguna')+'</strong> · <button class="btn btn-outline-primary btn-sm" onclick="LTWeb.openTankers()">Gestionar cisternas</button></p>';
 if(!t)h+='<div class="lt-web-error">Primero crea o selecciona una cisterna.</div>';
 else{
  h+='<div>Capacidad: <strong>'+fmt(t.capacities.reduce((a,b)=>a+b,0))+' L</strong> · '+t.capacities.length+' compartimentos</div>'+tankerVisual(t);
  if(!allow.length)h+='<div class="lt-web-error">La cisterna y esta estación no comparten un lado de descarga.</div>';
  else{
   h+='<div class="lt-web-field mt-3"><label>Lado de descarga</label><div class="lt-web-actions">';
   for(const v of allow)h+='<button class="btn '+(chosenSide===v?'btn-purple':'btn-outline-secondary')+'" onclick="LTWeb.changeSide(\''+v+'\')">'+(v==='LEFT'?'Izquierda':'Derecha')+'</button>';
   h+='</div></div>';
   if(!codes.length)h+='<div class="lt-web-error">La gasolinera no tiene bocas registradas para este lado.</div>';
   else{
    h+='<form onsubmit="LTWeb.calculate(event)" class="mt-3"><h3 class="fs-5">Productos y litros</h3><div class="lt-web-grid">';
    for(const code of codes)h+='<div class="lt-web-field"><label for="lt-product-'+escapeHtml(code)+'">'+escapeHtml(code)+' · litros</label><input data-lt-product="'+escapeHtml(code)+'" id="lt-product-'+escapeHtml(code)+'" class="form-control" type="number" min="0" max="9999999" step="1" value="'+escapeHtml(previous&&previous[code]||'')+'" placeholder="0"></div>';
    h+='</div><button class="btn btn-purple mt-3" type="submit">Calcular distribución preliminar</button></form>';
   }
  }
 }
 h+='<div id="lt-proposal"></div><div class="lt-web-alert mt-3">Cálculo volumétrico orientativo, no una instrucción de carga certificada. No verifica masas por eje, quinta rueda, estabilidad, límites de llenado ni procedimientos ADR. No se deben ejecutar cargas reales únicamente con esta propuesta.</div></div>';
 $('zona-carga').innerHTML=h;
}
function calculate(e){
 e.preventDefault();
 const t=selected();
 if(!t)return;
 const result=LogisTankPlanner.propose(station,t,chosenSide,loadInputs());lastProposal=result;
 if(result.error){$('lt-proposal').innerHTML='<div class="lt-web-error mt-3">'+escapeHtml(result.error)+'</div>';return;}
 const p=result.proposal;
 let h='<div class="lt-web-panel mt-3"><h3>Propuesta de distribución</h3>';
 h+='<p>'+fmt(p.totalLiters)+' L · '+p.usedCompartments+' compartimentos utilizados · Cruces potenciales estimados: '+p.estimatedCrossingPairs+'</p>';
 h+=tankerVisual(t,p.compartments);
 h+='<table class="lt-web-results mt-3"><thead><tr><th>Compartimento</th><th>Producto</th><th>Carga</th><th>Capacidad</th><th>Boca</th></tr></thead><tbody>';
 for(const c of p.compartments)h+='<tr><td>'+c.number+'</td><td>'+escapeHtml(c.product||'—')+'</td><td>'+fmt(c.liters)+' L</td><td>'+fmt(c.capacityLiters)+' L</td><td>'+(c.outletZone?'Zona '+c.outletZone+', boca '+(c.outletIndex+1):'—')+'</td></tr>';
 h+='</tbody></table><div class="lt-web-alert">Los cruces se estiman por posición en el plano; cero cruces estimados no garantiza ausencia de cruces reales. Propuesta no validada para efectuar una carga real.</div></div>';
 $('lt-proposal').innerHTML=h;
}
function closeLoad(){irPestana('GAS');if(station)abrirVisor(String(station.id));}
function backToTop(){window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function scrollControl(){const btn=$('lt-backtotop');if(btn)btn.style.display=window.scrollY>220&&$('pantalla-app').style.display!=='none'?'flex':'none';}
window.addEventListener('scroll',scrollControl,{passive:true});
window.LTWeb={openTankers,renderTankers,editTanker,drawCapacityInputs,totalCapacity,saveTanker,deleteTanker,selectTanker,openLoad,renderLoad,changeSide,calculate,closeLoad,backToTop,selected,scrollControl};
})();
