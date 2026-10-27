(function(){
"use strict";
/* SABI Ruta del Error v2 · motor de aprendizaje
   Principios con evidencia (revisada por pares, DOI verificado):
   - Práctica de recuperación: Roediger & Karpicke (2006) doi:10.1111/j.1467-9280.2006.01693.x
   - Repaso espaciado: Cepeda et al. (2006) doi:10.1037/0033-2909.132.3.354
   - Hipercorrección de errores cometidos con seguridad: Butterfield & Metcalfe (2001) doi:10.1037/0278-7393.27.6.1491
   La fuente editable está en herramientas/ (app.js, estilos.css, banco/). index.html se genera con herramientas/construir.py */
const BANK = JSON.parse(document.getElementById("bank").textContent);
const AREAS = {matematicas:"Matemáticas",lenguaje:"Lenguaje / Lectura crítica",ciencias:"Ciencias Naturales",sociales:"Sociales y Ciudadanas",ingles:"Inglés"};
const ORDER = Object.keys(AREAS);
const PENS = ["Recordar","Comprender","Aplicar","Analizar","Evaluar","Crear"];
const PENS_TXT = {Recordar:"traer a la memoria un dato",Comprender:"explicar qué significa",Aplicar:"usar un procedimiento",Analizar:"separar partes y encontrar relaciones",Evaluar:"juzgar con criterios si algo es válido",Crear:"proponer algo nuevo"};
const LECT = ["Literal","Inferencial","Crítico"];
const MOTTO = "El error no nos detiene, nos enseña, nos fortalece y nos hace crecer.";
const KEY = "sabi_ruta_error_v1", SKEY = "sabi_ruta_sesion_v2";
const DAY = 864e5, INT = [1,1,3,7,21]; /* días hasta el siguiente repaso según la caja */
const $ = s => document.querySelector(s);
const app = $("#app");
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function load(){try{const d=JSON.parse(localStorage.getItem(KEY))||{};d.hist=d.hist||[];d.seen=d.seen||{};d.rep=d.rep||{};d.dom=d.dom||{};d.rpt=d.rpt||[];return d}catch(e){return{hist:[],seen:{},rep:{},dom:{},rpt:[]}}}
function save(db){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){toast("No pude guardar en este dispositivo (memoria llena).")}}
function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,3200)}

const AV_POSTER = "__AV_POSTER__", AV_FACE = "__AV_FACE__";
const AVATAR = `<img class="avatar" src="${AV_POSTER}" alt="SABI, tu amigo del saber CENTEC" width="520" height="650">`;
/* Estructura oficial ICFES (Guía Saber 11 2026-2 e Informe Saber 3-5-7-9) */
const SABER = {
  3:{areas:["matematicas","lenguaje"],real:"Matemáticas 36 · Lectura 36 preguntas (2 h 45 min)"},
  5:{areas:["matematicas","lenguaje","ciencias","sociales"],real:"Matemáticas 36 · Lectura 36 · Ciencias 30 o Pensamiento Ciudadano 30 (+ Escritura)"},
  7:{areas:["matematicas","lenguaje","ciencias","sociales"],real:"Matemáticas 36 · Lectura 36 · Ciencias 30 o Pensamiento Ciudadano 30 (+ Escritura)"},
  9:{areas:["matematicas","lenguaje","ciencias","sociales"],real:"Matemáticas 36 · Lectura 36 · Ciencias 36 o Pensamiento Ciudadano 36 (+ Escritura)"},
  11:{areas:["matematicas","lenguaje","sociales","ciencias","ingles"],real:"Matemáticas 50 · Lectura Crítica 41 · Sociales 50 · Ciencias 58 · Inglés 55 (7 partes)"}
};
function areaName(a,g){
  if(a==="lenguaje") return g===11?"Lectura Crítica":"Lectura";
  if(a==="sociales") return g===11?"Sociales y Ciudadanas":(g>=5&&g<=9?"Pensamiento Ciudadano":"Sociales y Ciudadanas");
  return AREAS[a];
}
const normName = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
const skey = (name,g) => normName(name)+"|"+g;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const ITEMS = new Map(BANK.map(q=>[q.id,q]));
const pool = (g,area) => [...ITEMS.values()].filter(q=>q.grado===g&&q.area===area);

/* ---------- Banco PREICFES (9°–11°): mismas preguntas Ruta del Error, en revisión docente ---------- */
const EXT = {};
async function loadExt(g,areas){
  if(g<9) return 0;
  const todo=areas.filter(a=>!EXT[g+"-"+a]); if(!todo.length) return 0;
  const ctl=typeof AbortController!=="undefined"?new AbortController():null; const tm=setTimeout(()=>ctl&&ctl.abort(),6000);
  let n=0;
  try{
    const idx=await (await fetch("/preicfes/banco/indice.json",{cache:"no-cache",signal:ctl&&ctl.signal})).json();
    await Promise.all(todo.map(async a=>{const k=g+"-"+a; if(!idx.files||!idx.files[k])return;
      const arr=await (await fetch("/preicfes/banco/"+k+".json?v="+idx.version,{signal:ctl&&ctl.signal})).json();
      arr.forEach(q=>{if(!ITEMS.has(q.id)&&q.opciones&&q.errores&&q.gemela){q._ext=1;ITEMS.set(q.id,q);n++}}); EXT[k]=1;}));
  }catch(e){}
  clearTimeout(tm); return n;
}

/* ---------- Repaso espaciado (cajas tipo Leitner) ---------- */
function repOf(db,name,g){return db.rep[skey(name,g)]=db.rep[skey(name,g)]||{}}
function dueList(db,name,g,areas){
  const r=db.rep[skey(name,g)]||{}, now=Date.now();
  return Object.entries(r).filter(([id,v])=>v.due<=now&&(!areas||areas.includes(v.area))&&(ITEMS.has(id)||v.item)).sort((a,b)=>a[1].due-b[1].due).map(([id,v])=>({id,v}));
}
function repItem(id,v){const q=ITEMS.get(id)||v.item; return q?Object.assign({},q,{_rep:1,_box:v.box}):null}

/* Selección sin repetir: primero lo no visto; equilibra niveles; mantiene juntas las preguntas de un mismo texto */
function pick(db,name,g,area,k,skip){
  const key=normName(name)+"|"+g+"|"+area; let seen=db.seen[key]||[], note="";
  const all=pool(g,area).filter(q=>!skip.has(q.id));
  let p=all.filter(q=>!seen.includes(q.id));
  if(p.length<Math.min(k,all.length)){ note=areaName(area,g); seen=[]; p=all.slice(); }
  const byLv={}; shuffle(p).forEach(q=>(byLv[q.nivel]=byLv[q.nivel]||[]).push(q));
  const lvs=["Mínimo","Satisfactorio","Avanzado"].filter(l=>byLv[l]); const out=[];
  /* completar textos compartidos para no partir una lectura */
  const take=q=>{if(out.includes(q)||out.length>=k)return; out.push(q);
    if(q.contexto&&q.contexto.length>140) p.filter(x=>x!==q&&x.contexto===q.contexto).slice(0,2).forEach(x=>{if(!out.includes(x)&&out.length<k+2)out.push(x)})};
  while(out.length<Math.min(k,p.length)){ let moved=false; for(const l of lvs){ const q=byLv[l]&&byLv[l].shift(); if(q){take(q);moved=true} } if(!moved)break; }
  const ctxOrder={}; out.forEach((q,i)=>{const c=q.contexto||q.id; if(!(c in ctxOrder))ctxOrder[c]=i});
  out.sort((a,b)=>ctxOrder[a.contexto||a.id]-ctxOrder[b.contexto||b.id]);
  db.seen[key]=seen.concat(out.map(q=>q.id));
  return {items:out,note};
}

let S = null; // sesión activa
function saveS(){try{if(S)localStorage.setItem(SKEY,JSON.stringify(S));else localStorage.removeItem(SKEY)}catch(e){}}
function loadS(){try{return JSON.parse(localStorage.getItem(SKEY))}catch(e){return null}}

/* ---------- INICIO ---------- */
function home(){
  S=null;
  const saved=loadS(), grades=[3,4,5,6,7,8,9,10,11];
  const pending=saved&&saved.items&&saved.items.length;
  const rutaOpen=pending&&saved.end&&Object.values(saved.ruta||{}).some(r=>r.state!=="f");
  app.innerHTML=`
  ${pending&&(!saved.end||rutaOpen)?`<section class="card pop" style="border:2px solid var(--orange)">
    <span class="eyebrow">Tienes algo pendiente</span>
    <h2>${saved.end?"La Ruta del Error de "+esc(saved.name)+" está a medio camino":"La evaluación de "+esc(saved.name)+" quedó abierta ("+Object.keys(saved.ans||{}).length+"/"+saved.items.length+" respondidas)"}</h2>
    <div class="row"><button class="primary" type="button" id="resume">${saved.end?"Continuar mi Ruta del Error":"Continuar la evaluación"}</button><button type="button" id="drop">Descartar</button></div>
  </section>`:""}
  <section class="card hero pop">
    <div class="avwrap">${AVATAR}</div>
    <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
      <span class="eyebrow">Hola, soy SABI, tu amigo del saber</span>
      <h1>Entrena como en las pruebas Saber. Tus errores se vuelven tu mejor maestro.</h1>
      <p class="motto">“${MOTTO}”</p>
      <p class="muted" style="font-size:.9rem">Cada vez que presentas, SABI te muestra preguntas nuevas, y tus errores vuelven en los días siguientes hasta que se vuelven fortaleza: aquí no se memoriza, se aprende.</p>
    </div>
  </section>
  <form class="card" id="fStart" novalidate>
    <h2>¿Quién presenta hoy?</h2>
    <div class="grid2">
      <label class="f">Nombre y apellido<input id="inName" autocomplete="name" placeholder="Ej.: Valentina Mosquera" required></label>
      <label class="f">Grado<select id="inGrade">${grades.map(g=>`<option value="${g}" ${g===5?"selected":""}>${g}°${SABER[g]?" · Saber "+g:""}</option>`).join("")}</select></label>
    </div>
    <div id="repInfo"></div>
    <div id="modes"></div>
    <div id="info"></div>
    <p class="muted" style="font-size:.9rem">En cada pregunta dirás qué tan seguro estás. Los errores que cometas <b>estando seguro</b> son los que más te enseñan: SABI los trabaja primero.</p>
    <p id="startErr" class="muted" style="color:var(--bad)" hidden>Escribe tu nombre para empezar.</p>
    <div class="row"><button class="primary" type="submit" id="go">Comenzar evaluación</button></div>
  </form>`;
  if($("#resume"))$("#resume").onclick=()=>{S=saved; if(S.end){ruta()}else quiz()};
  if($("#drop"))$("#drop").onclick=()=>{if(saved.end)persist(saved); S=null; saveS(); home()};
  const drawModes=()=>{
    if(!$("#inGrade"))return;
    const g=+$("#inGrade").value, sb=SABER[g], name=$("#inName").value.trim();
    const areas=sb?sb.areas:ORDER.filter(a=>pool(g,a).length);
    const db=load(), due=name?dueList(db,name,g,null):[], dom=name?(db.dom[skey(name,g)]||0):0;
    const prev=document.querySelector('input[name="mode"]:checked'), pv=prev?prev.value:"mixto";
    $("#repInfo").innerHTML=name&&(due.length||dom)?`<div class="box q"><span class="eyebrow">Repaso espaciado</span>
      <span>${due.length?`<b>${due.length} error(es) tuyo(s) vuelven hoy</b> para comprobar que no se olvidaron. Aparecerán al comienzo, marcados como «Repaso».`:"Hoy no tienes errores pendientes de repaso."}${dom?` Ya consolidaste <b>${dom}</b> error(es) como fortaleza duradera.`:""}</span></div>`:"";
    $("#modes").innerHTML=`<div style="display:flex;flex-direction:column;gap:6px"><b style="font-size:.9rem">¿Qué vas a presentar?</b><div class="modes">
      <label class="mode"><input type="radio" name="mode" value="mixto" ${pv==="mixto"?"checked":""}> ${sb?"Simulacro Saber "+g+"°":"Evaluación del grado"}</label>
      ${areas.map(a=>`<label class="mode"><input type="radio" name="mode" value="${a}" ${pv===a?"checked":""}> ${areaName(a,g)}</label>`).join("")}
      ${due.length?`<label class="mode"><input type="radio" name="mode" value="repaso" ${pv==="repaso"?"checked":""}> Solo mi repaso (${due.length})</label>`:""}</div></div>`;
    if(!document.querySelector('input[name="mode"]:checked')) document.querySelector('input[name="mode"]').checked=true;
    $("#info").innerHTML=sb?`<div class="box n"><span class="eyebrow">Así es la prueba Saber ${g}° real</span><span>${sb.real}. Todas las preguntas son de selección múltiple con única respuesta${g===11?"; en Inglés, varias partes tienen 3 opciones (A, B, C) y la Parte 1 tiene 7 (A–G)":""}.</span></div>`
      :`<div class="box n"><span>El ICFES evalúa los grados 3°, 5°, 7°, 9° y 11°. En ${g}° practicas con preguntas del mismo estilo para llegar listo a la siguiente prueba.</span></div>`;
  };
  $("#inGrade").addEventListener("change",drawModes);
  $("#inName").addEventListener("input",()=>{clearTimeout(drawModes.h);drawModes.h=setTimeout(drawModes,350)});
  drawModes();
  $("#fStart").addEventListener("submit",async e=>{
    e.preventDefault();
    const name=$("#inName").value.trim(); if(!name){$("#startErr").hidden=false;$("#inName").focus();return}
    const g=+$("#inGrade").value, mode=document.querySelector('input[name="mode"]:checked').value;
    const sb=SABER[g], areas=mode==="mixto"||mode==="repaso"?(sb?sb.areas:ORDER):[mode];
    $("#go").disabled=true; $("#go").textContent="Preparando tus preguntas…";
    if(mode!=="repaso") await loadExt(g,areas);
    const db=load();
    const due=dueList(db,name,g,mode==="repaso"?null:areas).slice(0,mode==="repaso"?12:4);
    const repItems=due.map(d=>repItem(d.id,d.v)).filter(Boolean);
    const skip=new Set(Object.keys(db.rep[skey(name,g)]||{}));
    let items=repItems.slice(), notes=[];
    if(mode!=="repaso"){
      const k=mode==="mixto"?(areas.length<=2?8:5):10;
      areas.forEach(a=>{const r=pick(db,name,g,a,k,skip);items=items.concat(r.items);if(r.note)notes.push(r.note)});
    }
    save(db);
    if(!items.length){$("#go").disabled=false;$("#go").textContent="Comenzar evaluación";toast("Aún no hay preguntas para esa selección");return}
    S={v:2,name,grado:g,mode,items,ans:{},cert:{},i:0,ruta:{},start:Date.now()};
    saveS(); quiz();
    if(notes.length)toast("Ya viste todo el banco de "+notes.join(", ")+". Empieza un nuevo ciclo.");
    else if(repItems.length)toast(repItems.length+" pregunta(s) de repaso al comienzo: demuéstrate que no se olvidaron.");
  });
}

/* ---------- TABLAS Y GRÁFICAS ---------- */
const fmt=v=>Math.abs(v)>=1000?Math.round(v).toLocaleString("es-CO"):(Math.round(v*100)/100).toLocaleString("es-CO");
function tablaHTML(t){if(!t||!t.cols||!t.filas)return"";return `<div class="tbl"><table>${t.titulo?`<caption>${esc(t.titulo)}</caption>`:""}<thead><tr>${t.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${t.filas.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
function graficaHTML(g){
  if(!g||!g.series||!g.etiquetas)return"";
  const W=560,H=290,L=54,R=12,T=30,B=46,cw=W-L-R,ch=H-T-B,C=["#1A2D7A","#F47C20","#2a9d8f","#b8860b"];
  const all=g.series.flatMap(s=>s.datos); let mx=Math.max(...all,0), mn=Math.min(...all,0);
  const nice=v=>{if(v<=0)return 0;const p=Math.pow(10,Math.floor(Math.log10(v)));return Math.ceil(v/p*2)/2*p};
  mx=nice(mx)||1; if(mn<0)mn=-nice(-mn);
  const y=v=>T+ch-(v-mn)/(mx-mn)*ch, n=g.etiquetas.length, bw=cw/n, k=g.series.length, lab=n*k<=14;
  let s=`<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(g.titulo||"Gráfica")}">`;
  if(g.titulo) s+=`<text x="${W/2}" y="16" text-anchor="middle" class="ct">${esc(g.titulo)}</text>`;
  for(let i=0;i<=4;i++){const v=mn+(mx-mn)*i/4,yy=y(v);s+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" class="gl"/><text x="${L-6}" y="${yy+4}" text-anchor="end" class="tk">${fmt(v)}</text>`}
  if(g.ejeY) s+=`<text x="12" y="${T+ch/2}" transform="rotate(-90 12 ${T+ch/2})" text-anchor="middle" class="tk">${esc(g.ejeY)}</text>`;
  g.etiquetas.forEach((e,i)=>{s+=`<text x="${L+bw*i+bw/2}" y="${H-B+16}" text-anchor="middle" class="tk">${esc(e)}</text>`});
  g.series.forEach((se,j)=>{const c=C[j%4];
    if(g.tipo==="barras"){const w=bw*0.7/k;se.datos.forEach((v,i)=>{const x=L+bw*i+bw*0.15+w*j,y0=y(0),yv=y(v);
      s+=`<rect x="${x}" y="${Math.min(y0,yv)}" width="${Math.max(1,w-2)}" height="${Math.abs(y0-yv)}" fill="${c}" rx="2"><title>${esc(se.nombre||"")} ${esc(g.etiquetas[i])}: ${fmt(v)}</title></rect>`;
      if(lab)s+=`<text x="${x+(w-2)/2}" y="${(v>=0?yv-4:yv+12)}" text-anchor="middle" class="tk">${fmt(v)}</text>`})}
    else{s+=`<polyline points="${se.datos.map((v,i)=>`${L+bw*i+bw/2},${y(v)}`).join(" ")}" fill="none" stroke="${c}" stroke-width="2.5"/>`;
      se.datos.forEach((v,i)=>{s+=`<circle cx="${L+bw*i+bw/2}" cy="${y(v)}" r="3.5" fill="${c}"><title>${esc(g.etiquetas[i])}: ${fmt(v)}</title></circle>`;if(lab)s+=`<text x="${L+bw*i+bw/2}" y="${y(v)-8}" text-anchor="middle" class="tk">${fmt(v)}</text>`})}});
  s+=`<line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" class="ax"/></svg>`;
  const leg=(k>1||g.series[0].nombre)?`<div class="legend">${g.series.map((se,j)=>`<span><i style="background:${C[j%4]}"></i>${esc(se.nombre||"")}</span>`).join("")}</div>`:"";
  return `<figure class="chartwrap">${s}${leg}</figure>`;
}
function ctxHTML(q){return `${q.contexto?`<div class="ctx">${esc(q.contexto)}</div>`:""}${q.tabla?tablaHTML(q.tabla):""}${q.grafica?graficaHTML(q.grafica):""}`}

/* ---------- PRUEBA ---------- */
function metaBlock(q){
  return `<details><summary>Lo que evalúa esta pregunta</summary><div class="meta">
  <div><b>Competencia:</b> ${esc(q.competencia)}</div>
  <div><b>Componente:</b> ${esc(q.componente)}</div>
  ${q.pensamiento?`<div><b>Nivel de pensamiento:</b> ${esc(q.pensamiento)} (${esc(PENS_TXT[q.pensamiento]||"")})</div>`:""}
  ${q.lectura?`<div><b>Nivel de lectura:</b> ${esc(q.lectura)}</div>`:""}
  <div><b>Afirmación:</b> ${esc(q.afirmacion)}</div>
  <div><b>Evidencia:</b> ${esc(q.evidencia)}</div>
  <div><b>DBA:</b> ${esc(q.dba)}</div>
  <div><b>Lineamiento / estándar:</b> ${esc(q.lineamiento)}</div>
  ${q.mcer?`<div><b>MCER:</b> ${esc(q.mcer)}</div>`:""}
  ${q.revision||q._ext?`<div><b>Estado:</b> en revisión docente. Si ves un error en esta pregunta, repórtalo en la Ruta del Error.</div>`:""}</div></details>`;
}
const isFlag = id => S.cert[id]&&S.cert[id]!=="alta";
function quiz(){
  const n=S.items.length,i=S.i,q=S.items[i],answered=Object.keys(S.ans).length;
  app.innerHTML=`
  <section class="card">
    <div class="row" style="justify-content:space-between"><span class="eyebrow">${esc(S.name)} · ${S.grado}° · Pregunta ${i+1} de ${n}</span><span class="muted" style="font-size:.85rem">${answered}/${n} respondidas</span></div>
    <div class="prog" aria-hidden="true"><i style="width:${answered/n*100}%"></i></div>
    <div class="dots">${S.items.map((x,k)=>`<button type="button" data-go="${k}" class="${S.ans[x.id]?"ans":""} ${k===i?"cur":""} ${isFlag(x.id)?"flag":""} ${x._rep?"rep":""}" aria-label="Ir a pregunta ${k+1}${x._rep?" (repaso)":""}">${k+1}</button>`).join("")}</div>
  </section>
  <section class="card pop">
    <div class="chips">${q._rep?`<span class="chip rep">Repaso de tu error</span>`:""}<span class="chip">${areaName(q.area,q.grado)}</span><span class="chip lv-${esc(q.nivel)}">Nivel ${esc(q.nivel)}</span>${q.pensamiento?`<span class="chip pen" title="${esc(PENS_TXT[q.pensamiento]||"")}">Pensar: ${esc(q.pensamiento)}</span>`:""}${q.lectura?`<span class="chip pen">Lectura ${esc(q.lectura.toLowerCase())}</span>`:""}<span class="chip">${esc(q.competencia)}</span>${q.revision||q._ext?`<span class="chip rev">En revisión</span>`:""}</div>
    ${q._rep?`<p class="muted" style="font-size:.9rem">Esta pregunta la fallaste o la dudaste antes. Respóndela sin ayuda: recordar por ti mismo es lo que fija el aprendizaje.</p>`:""}
    ${ctxHTML(q)}
    <p class="stem">${esc(q.enunciado)}</p>
    <div class="opts" role="radiogroup" aria-label="Opciones de respuesta">${Object.entries(q.opciones).map(([L,t])=>`
      <label class="opt"><input type="radio" name="op" value="${L}" ${S.ans[q.id]===L?"checked":""}><span class="L">${L}</span><span>${esc(t)}</span></label>`).join("")}</div>
    <div class="cert" role="radiogroup" aria-label="Qué tan seguro estás"><b style="font-size:.9rem">¿Qué tan seguro estás de tu respuesta?</b><div class="seg">
      ${[["alta","Seguro"],["media","Dudo"],["baja","Adiviné"]].map(([v,t])=>`<label><input type="radio" name="cert" value="${v}" ${S.cert[q.id]===v?"checked":""}>${t}</label>`).join("")}</div></div>
    ${q.estrategia_icfes?`<details><summary>Estrategia ICFES para este tipo de pregunta</summary><div class="meta"><span>${esc(q.estrategia_icfes)}</span></div></details>`:""}
    ${metaBlock(q)}
    <div class="row" style="justify-content:space-between">
      <button type="button" id="prev" ${i===0?"disabled":""}>Anterior</button>
      ${i<n-1?`<button type="button" class="navy" id="next">Siguiente</button>`:`<button type="button" class="primary" id="finish">Entregar evaluación</button>`}
    </div>
    <div id="confirm"></div>
  </section>`;
  app.querySelectorAll('input[name="op"]').forEach(r=>r.addEventListener("change",()=>{S.ans[q.id]=r.value;saveS();
    const answered=Object.keys(S.ans).length;app.querySelector(".prog i").style.width=(answered/n*100)+"%";
    app.querySelector(`[data-go="${i}"]`).classList.add("ans")}));
  app.querySelectorAll('input[name="cert"]').forEach(r=>r.addEventListener("change",()=>{S.cert[q.id]=r.value;saveS();
    app.querySelector(`[data-go="${i}"]`).classList.toggle("flag",r.value!=="alta")}));
  app.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{S.i=+b.dataset.go;saveS();quiz()});
  $("#prev").onclick=()=>{S.i--;saveS();quiz()};
  if($("#next"))$("#next").onclick=()=>{S.i++;saveS();quiz()};
  if($("#finish"))$("#finish").onclick=()=>{
    const miss=S.items.filter(x=>!S.ans[x.id]).length, noCert=S.items.filter(x=>S.ans[x.id]&&!S.cert[x.id]).length;
    if(!miss&&!noCert) return grade();
    $("#confirm").innerHTML=`<div class="box q">${miss?`<b>Te faltan ${miss} pregunta(s) sin responder.</b><span>En Saber, una pregunta en blanco cuenta como incorrecta.</span>`:""}
      ${noCert?`<b>En ${noCert} pregunta(s) no dijiste qué tan seguro estabas.</b><span>Ese dato le ayuda a SABI a saber cuáles errores te enseñan más. Las tomaré como «Dudo».</span>`:""}
      <div class="row"><button type="button" id="cNo" class="navy">Volver a revisar</button><button type="button" id="cYes">Entregar de todos modos</button></div></div>`;
    $("#cNo").onclick=()=>{let k=S.items.findIndex(x=>!S.ans[x.id]);if(k<0)k=S.items.findIndex(x=>!S.cert[x.id]);S.i=Math.max(0,k);quiz()};
    $("#cYes").onclick=grade;
  };
  window.scrollTo({top:0});
}

/* ---------- CALIFICACIÓN ---------- */
function levelOf(p){return p<=35?"Insuficiente":p<=50?"Mínimo":p<=70?"Satisfactorio":"Avanzado"}
function grade(){
  S.end=Date.now();
  const db=load(), R=repOf(db,S.name,S.grado), now=Date.now();
  S.items.forEach(q=>{
    const a=S.ans[q.id], ok=a===q.correcta;
    if(!S.cert[q.id]&&a) S.cert[q.id]="media";
    const sure=S.cert[q.id]==="alta";
    const keepItem=q._ext?(({_rep,_box,...rest})=>rest)(q):undefined;
    if(q._rep){
      const v=R[q.id]||{box:1,area:q.area};
      if(ok&&sure){ v.box=Math.max(1,v.box)+1;
        if(v.box>=INT.length){ delete R[q.id]; db.dom[skey(S.name,S.grado)]=(db.dom[skey(S.name,S.grado)]||0)+1; S.ruta[q.id]={kind:"repaso",state:"c"}; }
        else { v.due=now+INT[v.box]*DAY; R[q.id]=v; S.ruta[q.id]={kind:"repaso",state:"f"}; } }
      else if(ok){ v.due=now+DAY; R[q.id]=v; S.ruta[q.id]={kind:"duda",state:"d",rep:1}; }
      else { v.box=0; v.due=now+DAY; R[q.id]=v; S.ruta[q.id]={kind:"error",state:"p",hc:sure,rep:1}; }
      return;
    }
    if(!ok){ S.ruta[q.id]={kind:"error",state:"p",hc:sure&&!!a}; R[q.id]={box:0,due:now+DAY,area:q.area,item:keepItem}; }
    else if(!sure){ S.ruta[q.id]={kind:"duda",state:"d"}; if(!R[q.id])R[q.id]={box:1,due:now+DAY,area:q.area,item:keepItem}; }
  });
  save(db); persist(); saveS(); results();
}
function tally(list,key){const m={};list.forEach(q=>{const k=key(q);if(!k)return;m[k]=m[k]||{t:0,o:0};m[k].t++;if(S.ans[q.id]===q.correcta)m[k].o++});return m}
function stats(){
  const nw=S.items.filter(q=>!q._rep), rp=S.items.filter(q=>q._rep), n=nw.length, ok=nw.filter(q=>S.ans[q.id]===q.correcta).length;
  const sure=S.items.filter(q=>S.cert[q.id]==="alta"&&S.ans[q.id]);
  const ordered=(m,ord)=>Object.fromEntries(ord.filter(k=>m[k]).map(k=>[k,m[k]]));
  return {n,ok,pct:n?Math.round(ok/n*100):0,
    area:tally(nw,q=>areaName(q.area,q.grado)),comp:tally(nw,q=>q.competencia),
    niv:ordered(tally(nw,q=>q.nivel),["Mínimo","Satisfactorio","Avanzado"]),
    pen:ordered(tally(S.items,q=>q.pensamiento),PENS),lec:ordered(tally(S.items,q=>q.lectura),LECT),
    rep:{t:rp.length,o:rp.filter(q=>S.ans[q.id]===q.correcta).length},
    cal:{t:sure.length,o:sure.filter(q=>S.ans[q.id]===q.correcta).length}};
}
function bars(m){return Object.entries(m).map(([k,v])=>`<div class="bar"><span>${esc(k)}</span><span class="t"><i style="width:${v.o/v.t*100}%"></i></span><b>${v.o}/${v.t}</b></div>`).join("")}
function rutaCounts(s){s=s||S;const v=Object.values(s.ruta||{}).filter(x=>x.kind!=="repaso");
  return{err:v.filter(x=>x.kind==="error").length,conv:v.filter(x=>x.kind==="error"&&x.state==="f").length,dud:v.filter(x=>x.kind==="duda").length,dudOk:v.filter(x=>x.kind==="duda"&&x.state==="f").length,hc:v.filter(x=>x.hc).length}}
function nextChallenge(st){
  /* el reto es el nivel de pensamiento más alto que todavía no dominas; si no hay datos, la competencia más baja */
  const pen=Object.entries(st.pen).filter(([,v])=>v.o<v.t);
  if(pen.length){const [k,v]=pen.sort((a,b)=>PENS.indexOf(a[0])-PENS.indexOf(b[0]))[0];
    return `Tu siguiente escalón es <b>${esc(k.toLowerCase())}</b> (${esc(PENS_TXT[k])}): acertaste ${v.o} de ${v.t}. En la Ruta del Error, antes de mirar la explicación, intenta decir con tus palabras por qué cada opción falla.`}
  const c=Object.entries(st.comp).filter(([,v])=>v.o<v.t).sort((a,b)=>a[1].o/a[1].t-b[1].o/b[1].t)[0];
  return c?`Tu siguiente reto está en <b>${esc(c[0])}</b>: acertaste ${c[1].o} de ${c[1].t}.`:"";
}
function results(){
  const st=stats(), rc=rutaCounts(), lv=levelOf(st.pct), nc=nextChallenge(st);
  app.innerHTML=`
  <section class="card score pop">
    <div><div class="big">${st.pct}</div><div class="muted" style="font-size:.85rem">de 100 · ${st.ok}/${st.n} correctas</div></div>
    <div style="display:flex;flex-direction:column;gap:8px;min-width:0">
      <span class="eyebrow">Resultado de ${esc(S.name)} · ${S.grado}°</span>
      <h2>${st.n?"Nivel de desempeño de referencia: "+lv:"Sesión de repaso"}</h2>
      <p class="muted" style="font-size:.9rem">Escala institucional SABI inspirada en los 4 niveles Saber (Insuficiente, Mínimo, Satisfactorio, Avanzado). No reemplaza el puntaje oficial del ICFES.${st.rep.t?" Las preguntas de repaso no cuentan en este puntaje: se miden aparte.":""}</p>
    </div>
  </section>
  <section class="card"><div class="kpis">
    ${st.rep.t?`<div class="kpi"><b>${st.rep.o}/${st.rep.t}</b><span>Errores de días anteriores que ya recuerdas</span></div>`:""}
    <div class="kpi"><b>${st.cal.t?st.cal.o+"/"+st.cal.t:"—"}</b><span>Aciertos cuando dijiste «Seguro»</span></div>
    <div class="kpi"><b>${rc.hc}</b><span>Errores cometidos estando seguro: los que más te enseñan</span></div>
  </div>
  ${st.cal.t&&st.cal.o<st.cal.t?`<p class="muted" style="font-size:.9rem">Cuando dices «Seguro» y te equivocas, tu mente tenía una idea que parecía cierta. Corregirla ahora es de lo que más fija el aprendizaje.</p>`:""}</section>
  ${rc.err+rc.dud?`<section class="card" style="border:2px solid var(--orange)">
    <span class="eyebrow">Tu siguiente paso</span>
    <h2>Tienes ${rc.err} error(es) y ${rc.dud} duda(s) listos para convertirse en aprendizaje.</h2>
    <p class="motto">“${MOTTO}”</p>
    <div class="row"><button class="primary" type="button" id="goRuta">Empezar mi Ruta del Error</button></div>
  </section>`:`<section class="card"><h2>¡Todo correcto y con seguridad!</h2><p>Reta tu nivel: presenta el simulacro de un grado superior o explica a un compañero cómo resolviste las preguntas Avanzadas. Explicar a otro es otra forma de aprender.</p><div class="row"><button type="button" id="again2" class="navy">Nueva evaluación</button></div></section>`}
  ${nc?`<section class="card"><span class="eyebrow">Tu próximo reto</span><p>${nc}</p></section>`:""}
  ${Object.keys(st.pen).length?`<section class="card"><h3>Por nivel de pensamiento</h3><p class="muted" style="font-size:.85rem">De lo más sencillo (recordar) a lo más exigente (evaluar y crear). Subir de nivel es la meta.</p><div class="bars">${bars(st.pen)}</div></section>`:""}
  ${Object.keys(st.lec).length?`<section class="card"><h3>Por nivel de lectura</h3><p class="muted" style="font-size:.85rem">Literal: lo que dice el texto · Inferencial: lo que se deduce · Crítico: lo que se evalúa y argumenta.</p><div class="bars">${bars(st.lec)}</div></section>`:""}
  ${st.n?`<section class="card"><h3>Por área</h3><div class="bars">${bars(st.area)}</div></section>
  <section class="card"><h3>Por competencia</h3><div class="bars">${bars(st.comp)}</div></section>
  <section class="card"><h3>Por nivel de exigencia de la pregunta</h3><div class="bars">${bars(st.niv)}</div></section>`:""}`;
  if($("#goRuta"))$("#goRuta").onclick=ruta;
  if($("#again2"))$("#again2").onclick=()=>{S=null;saveS();home()};
  window.scrollTo({top:0});
}

/* ---------- RUTA DEL ERROR ---------- */
const STL={p:["p","Por resolver"],e:["e","En camino"],f:["f","Fortaleza en camino"],d:["d","Duda por aclarar"],c:["c","Consolidado"]};
function ruta(){
  const rc=rutaCounts();
  const ids=Object.keys(S.ruta).filter(id=>S.ruta[id].kind!=="repaso")
    .sort((a,b)=>{const A=S.ruta[a],B=S.ruta[b],w=r=>r.kind==="error"?(r.hc?0:1):2;return w(A)-w(B)});
  const total=rc.err+rc.dud, done=rc.conv+rc.dudOk;
  const all=done===total&&total>0;
  app.innerHTML=`
  <section class="card">
    <span class="eyebrow">Ruta del Error · ${esc(S.name)}</span>
    <h2>${all?"¡Convertiste cada error en fortaleza!":"Elige un error y conviértelo en aprendizaje"}</h2>
    <div class="prog" aria-hidden="true"><i style="width:${total?done/total*100:0}%"></i></div>
    <p class="muted">${done} de ${total} en camino a fortaleza. Volverán en tus próximos repasos (1, 3, 7 y 21 días) hasta consolidarse.</p>
  </section>
  ${all?`<section class="card pop" style="border:2px solid var(--ok)">
    <div class="row" style="flex-wrap:nowrap"><img class="face" src="${AV_FACE}" alt="SABI" width="56" height="56"><h3>Cierre de tu ruta</h3></div>
    <p>Hoy demostraste lo que dice nuestro lema: <b>“${MOTTO}”</b></p>
    <label class="f">Antes de irte: ¿qué harás distinto en tu próxima evaluación?<textarea id="meta" rows="3" placeholder="Ej.: leer dos veces la pregunta antes de mirar las opciones">${esc(S.meta||"")}</textarea></label>
    <div class="row"><button class="primary" id="saveMeta" type="button">Guardar mi compromiso</button><button type="button" id="again">Nueva evaluación</button></div>
  </section>`:""}
  <section class="card"><div class="errlist">${ids.map(id=>{const q=S.items.find(x=>x.id===id),r=S.ruta[id],s=STL[r.state];
    const e=(q.errores||{})[S.ans[q.id]];
    return `<button type="button" class="erritem" data-id="${esc(id)}"><span class="chip">${esc(areaName(q.area,q.grado).split(" ")[0])}</span><span style="min-width:0">${esc(q.enunciado.slice(0,90))}${q.enunciado.length>90?"…":""}<br><span class="muted" style="font-size:.8rem;font-weight:700">${r.kind==="error"?(r.hc?"Estabas seguro · ":"")+"Error: "+esc(e?e.error:"Pregunta sin responder"):"Acertaste, pero dudaste"}${r.rep?" · volvió del repaso":""}</span></span><span class="st ${s[0]}">${s[1]}</span></button>`}).join("")}</div>
    <div class="row"><button type="button" id="back">Ver mis resultados</button>${!all?`<button type="button" id="later">Seguir otro día</button>`:""}</div></section>`;
  app.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>step(b.dataset.id,1));
  $("#back").onclick=results;
  if($("#later"))$("#later").onclick=()=>{persist();saveS();toast("Tu ruta queda guardada en este dispositivo.");S=null;home()};
  if($("#saveMeta"))$("#saveMeta").onclick=()=>{S.meta=$("#meta").value.trim();persist();saveS();toast("Compromiso guardado")};
  if($("#again"))$("#again").onclick=()=>{persist();S=null;saveS();home()};
  window.scrollTo({top:0});
}

function step(id,k){
  const q=S.items.find(x=>x.id===id), r=S.ruta[id], chosen=S.ans[id], e=(q.errores||{})[chosen];
  if(r.state==="p")r.state="e";
  const isDuda=r.kind==="duda";
  const titles=["Lo que tu error revela","Piénsalo tú primero","Aprende y resuelve tus dudas","Reto gemelo"];
  if(isDuda)titles[0]="Acertaste, pero dudaste";
  let body="";
  if(k===1){
    body=`${ctxHTML(q)}<p class="stem">${esc(q.enunciado)}</p>
    ${isDuda?`<div class="box ok"><b>Elegiste ${esc(chosen)}: ${esc(q.opciones[chosen])}. ¡Es correcta!</b><span>Dijiste que no estabas seguro. Vamos a asegurar que la próxima vez respondas con certeza.</span></div>`
    : e?`<div class="box bad"><b>Elegiste ${esc(chosen)}: ${esc(q.opciones[chosen])}</b><span class="chip" style="align-self:flex-start">${esc(e.error)}</span><span>${esc(e.porque)}</span></div>`
    :`<div class="box bad"><b>Dejaste esta pregunta en blanco.</b><span>Una respuesta en blanco no nos dice nada; un intento sí nos enseña. Vamos a construirla juntos.</span></div>`}
    ${r.hc?`<div class="box q"><b>Estabas seguro de esta respuesta.</b><span>Eso es buena noticia: los errores que cometemos con seguridad son los que más se corrigen cuando los entendemos. Este es tu error más valioso de hoy.</span></div>`:""}
    <p class="muted">Equivocarse aquí no es fallar: es encontrar exactamente qué ajustar.</p>`;
  } else if(k===2){
    const guide=isDuda||!e? (Object.values(q.errores||{})[0]||{}).pregunta_guia : e.pregunta_guia;
    const opts=Object.entries(q.opciones).filter(([L])=>isDuda||L!==chosen);
    body=`<div class="box q"><span class="eyebrow">Pregunta guía</span><b class="pre">${esc(guide)}</b></div>
    ${isDuda?`<label class="f">Antes de ver la explicación: ¿por qué la opción ${esc(chosen)} es la correcta? Explícalo con tus palabras<textarea id="refl" rows="3" placeholder="Es correcta porque…">${esc(r.refl||"")}</textarea></label>`
    :`<div class="cert"><b style="font-size:.95rem">Segundo intento: con esta pista, ¿cuál eliges ahora?</b>
      <div class="opts">${opts.map(([L,t])=>`<label class="opt ${r.a2?(L===q.correcta?"is-ok":(L===r.a2?"is-bad":"")):""}"><input type="radio" name="a2" value="${L}" ${r.a2===L?"checked":""} ${r.a2?"disabled":""}><span class="L">${L}</span><span>${esc(t)}</span></label>`).join("")}</div></div>
      <div id="a2r">${r.a2?a2Msg(q,r):""}</div>
      <label class="f">Explícalo con tus palabras (te ayuda a recordarlo)<textarea id="refl" rows="2" placeholder="Me equivoqué porque… La clave era…">${esc(r.refl||"")}</textarea></label>`}
    <p class="muted" style="font-size:.9rem">Tómate un minuto. Descubrirlo tú vale más que leer la respuesta.</p>`;
  } else if(k===3){
    body=`${(!isDuda&&e)?`<div class="box n"><span class="eyebrow">Corrige tu error</span><span>${esc(e.aprende)}</span></div>`:""}
    <div class="box ok"><b>La respuesta correcta es ${esc(q.correcta)}: ${esc(q.opciones[q.correcta])}</b><span class="pre">${esc(q.explicacion)}</span></div>
    <div class="tt"><div class="box q"><span class="eyebrow">Tip de SABI</span><span>${esc(q.tip)}</span></div><div class="box q"><span class="eyebrow">Truco</span><span>${esc(q.truco)}</span></div></div>
    ${q.estrategia_icfes?`<div class="box n"><span class="eyebrow">Así pregunta el ICFES</span><span>${esc(q.estrategia_icfes)}</span></div>`:""}
    ${q.pensamiento?`<div class="box n"><span class="eyebrow">Qué tipo de pensamiento pedía</span><span><b>${esc(q.pensamiento)}</b>: ${esc(PENS_TXT[q.pensamiento]||"")}.${q.lectura?` Lectura <b>${esc(q.lectura.toLowerCase())}</b>.`:""} Reconocerlo te ayuda a saber qué hacer en la próxima pregunta parecida.</span></div>`:""}
    <div class="chips">${(q.temas||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>
    <h3>¿Te queda alguna duda?</h3>
    <div class="doubts">
      <button type="button" data-d="q">No entendí qué me preguntaban</button>
      <button type="button" data-d="o">Dudé entre dos opciones</button>
      <button type="button" data-d="t">No conozco un tema o palabra</button>
      <button type="button" data-d="w">¿Para qué me sirve esto?</button>
    </div>
    <div id="dAns"></div>
    <details><summary>¿Encontraste un error en esta pregunta?</summary><div class="meta"><label class="f">Cuéntale a tu docente qué viste<textarea id="rpt" rows="2" placeholder="Ej.: la opción B también podría ser correcta porque…"></textarea></label><div class="row"><button type="button" id="sendRpt">Reportar al docente</button></div></div></details>`;
  } else {
    const g=q.gemela, ga=r.gAns;
    body=`<p class="muted">Mismo concepto, otros datos. Demuéstrate que ya lo dominas.</p>
    ${g.contexto?`<div class="ctx">${esc(g.contexto)}</div>`:""}${g.tabla?tablaHTML(g.tabla):""}${g.grafica?graficaHTML(g.grafica):""}
    <p class="stem">${esc(g.enunciado)}</p>
    <div class="opts">${Object.entries(g.opciones).map(([L,t])=>`<label class="opt ${ga?(L===g.correcta?"is-ok":(L===ga?"is-bad":"")):""}"><input type="radio" name="gop" value="${L}" ${ga===L?"checked":""} ${r.state==="f"?"disabled":""}><span class="L">${L}</span><span>${esc(t)}</span></label>`).join("")}</div>
    <div id="gRes">${ga?gemelaMsg(q,ga):""}</div>`;
  }
  app.innerHTML=`
  <section class="card pop">
    <div class="row" style="justify-content:space-between"><span class="eyebrow">Paso ${k} de 4 · ${areaName(q.area,q.grado)} · ${S.grado}°</span><span class="chip lv-${esc(q.nivel)}">Nivel ${esc(q.nivel)}</span></div>
    <div class="steps" aria-hidden="true">${[1,2,3,4].map(x=>`<span class="${x<=k?"on":""}"></span>`).join("")}</div>
    <h2>${titles[k-1]}</h2>
    ${body}
    ${k>1?metaBlock(q):""}
    <div class="row" style="justify-content:space-between">
      <button type="button" id="sBack">${k===1?"Volver a mi ruta":"Anterior"}</button>
      ${k<4?`<button type="button" class="navy" id="sNext">${k===2?"Ya lo pensé, quiero aprender":"Siguiente"}</button>`:`<button type="button" id="sRuta">Volver a mi ruta</button>`}
    </div>
  </section>`;
  $("#sBack").onclick=()=>{saveRefl(r);k===1?ruta():step(id,k-1)};
  if($("#sNext"))$("#sNext").onclick=()=>{saveRefl(r);step(id,k+1)};
  if($("#sRuta"))$("#sRuta").onclick=ruta;
  if($("#retry"))$("#retry").onclick=()=>{r.gAns=null;saveS();step(id,4)};
  if($("#review"))$("#review").onclick=()=>step(id,3);
  if($("#sendRpt"))$("#sendRpt").onclick=()=>{const t=$("#rpt").value.trim();if(!t){toast("Escribe qué viste");return}
    const db=load();db.rpt.push({id:q.id,grado:q.grado,area:q.area,nota:t.slice(0,500),fecha:new Date().toISOString()});save(db);$("#rpt").value="";toast("Gracias: tu docente lo revisará. Así también aprendemos del error.")};
  app.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>doubt(q,b.dataset.d,chosen));
  app.querySelectorAll('input[name="a2"]').forEach(x=>x.addEventListener("change",()=>{saveRefl(r);r.a2=x.value;saveS();step(id,2)}));
  app.querySelectorAll('input[name="gop"]').forEach(x=>x.addEventListener("change",()=>{
    r.gAns=x.value; r.tries=(r.tries||0)+1;
    if(x.value===q.gemela.correcta){r.state="f";
      const db=load(),R=repOf(db,S.name,S.grado);if(R[q.id]){R[q.id].box=Math.max(1,R[q.id].box);R[q.id].due=Date.now()+DAY;save(db)}
      toast(r.kind==="error"?"¡Error en camino a fortaleza! Vuelve mañana en tu repaso.":"¡Duda resuelta!")}
    persist(); saveS(); step(id,4);
  }));
  window.scrollTo({top:0});
}
function a2Msg(q,r){
  if(r.a2===q.correcta) return `<div class="box ok pop"><b>¡Lo descubriste tú!</b><span>Con una sola pista encontraste la respuesta. Eso es aprender: ahora mira la explicación para asegurarte de que sabes por qué.</span></div>`;
  const e=(q.errores||{})[r.a2];
  return `<div class="box bad"><b>Todavía no, y está bien.</b>${e?`<span>${esc(e.porque)}</span>`:""}<span>En el siguiente paso verás la explicación completa.</span></div>`;
}
function saveRefl(r){const t=$("#refl");if(t){r.refl=t.value.trim();saveS()}}
function gemelaMsg(q,ga){
  const g=q.gemela;
  if(ga===g.correcta) return `<div class="box ok pop"><b>¡Correcto! Este error va en camino a ser fortaleza.</b><span class="pre">${esc(g.explicacion)}</span><span>Para que no se olvide, SABI te lo volverá a preguntar en tus próximos repasos.</span><span>“${MOTTO}”</span></div>`;
  return `<div class="box bad"><b>Todavía no. Y está bien: cada intento te acerca.</b><span class="pre">${esc(g.explicacion)}</span>
  <div class="row"><button type="button" class="navy" id="review">Repasar la explicación</button><button type="button" id="retry">Intentar de nuevo</button></div></div>`;
}
function doubt(q,d,chosen){
  let h="";
  if(d==="q") h=`<div class="box n"><b>Volvamos a la pregunta, por partes.</b><span><b>Qué se busca:</b> ${esc(q.afirmacion)}</span><span><b>Qué debes hacer:</b> ${esc(q.evidencia)}</span><span>Truco de lectura: subraya el verbo de la pregunta (identificar, calcular, inferir, explicar) y lo que te piden encontrar, antes de leer las opciones.</span></div>`;
  if(d==="o"){const rows=Object.keys(q.opciones).filter(L=>L!==q.correcta).map(L=>{const e=(q.errores||{})[L]||{};return `<tr><td><b>${L}</b></td><td>${esc(q.opciones[L])}</td><td>${esc(e.error||"")}${e.aprende?": "+esc(e.aprende):""}</td></tr>`}).join("");
    h=`<div class="box n"><b>Por qué cada opción incorrecta no funciona</b><div class="tbl"><table><thead><tr><th>Opción</th><th>Dice</th><th>Por qué no</th></tr></thead><tbody>${rows}</tbody></table></div><span>La correcta (${esc(q.correcta)}) es la única que cumple todo lo que pide la pregunta.</span></div>`}
  if(d==="t") h=`<div class="box n"><b>Temas para repasar</b><div class="chips">${(q.temas||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div><span>${esc(q.dba)}</span><span>Pídele a tu docente o a SABI Tutor una explicación de estos temas con un ejemplo distinto. Luego vuelve y haz el reto gemelo.</span></div>`;
  if(d==="w") h=`<div class="box n"><b>Para qué te sirve</b><span>${esc(q.afirmacion)}</span><span>Esta habilidad aparece en las pruebas Saber de ${S.grado<=5?"3° y 5°":S.grado<=9?"7° y 9°":"11°"} y, sobre todo, en decisiones reales: leer bien, calcular bien y argumentar bien.</span></div>`;
  $("#dAns").innerHTML=h;
}

/* ---------- PERSISTENCIA Y PANEL DOCENTE ---------- */
function persist(s){
  s=s||S; if(!s||!s.end)return;
  const keep=S; S=s; const st=stats(), rc=rutaCounts(s); S=keep;
  const db=load();
  const rec={sid:s.start,name:s.name,grado:s.grado,mode:s.mode,fecha:new Date(s.start).toISOString(),pct:st.pct,ok:st.ok,n:st.n,
    err:rc.err,conv:rc.conv,dud:rc.dud,hc:rc.hc,meta:s.meta||"",rep:st.rep,cal:st.cal,pen:st.pen,lec:st.lec,
    fallos:s.items.filter(q=>s.ans[q.id]!==q.correcta).map(q=>({id:q.id,area:q.area,comp:q.competencia,pen:q.pensamiento||"",elig:s.ans[q.id]||"—",error:((q.errores||{})[s.ans[q.id]]||{}).error||"En blanco",conv:(s.ruta[q.id]||{}).state==="f",seguro:s.cert[q.id]==="alta"}))};
  const i=db.hist.findIndex(h=>h.sid===rec.sid); if(i>=0)db.hist[i]=rec; else db.hist.push(rec);
  if(db.hist.length>400) db.hist=db.hist.slice(-400);
  save(db);
}
/* PIN docente: barrera ligera para que un estudiante no vea los resultados de sus compañeros en un equipo compartido (Ley 1581 de 2012) */
async function hashPin(p){const t="sabi-ruta|"+p;try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){let h=2166136261;for(const c of t){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return "f"+h.toString(16)}}
let UNLOCK=false;
function docenteGate(){
  const db=load();
  if(UNLOCK) return docente();
  const nuevo=!db.pin;
  app.innerHTML=`<form class="card" id="fPin" novalidate><span class="eyebrow">Panel docente</span>
    <h2>${nuevo?"Crea el PIN docente de este equipo":"Escribe el PIN docente"}</h2>
    <p class="muted" style="font-size:.9rem">${nuevo?"El panel muestra resultados de varios estudiantes. Con un PIN, solo el docente los ve. Guárdalo bien: si lo olvidas, tendrás que borrar los datos del navegador.":"Así protegemos los datos de cada estudiante."}</p>
    <label class="f">PIN (4 a 8 números)<input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></label>
    ${nuevo?`<label class="f">Repite el PIN<input id="pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></label>`:""}
    <p id="pinErr" class="muted" style="color:var(--bad)" hidden></p>
    <div class="row"><button class="primary" type="submit">${nuevo?"Crear PIN y entrar":"Entrar"}</button></div></form>`;
  $("#pin").focus();
  $("#fPin").onsubmit=async ev=>{ev.preventDefault();const p=$("#pin").value.trim(),err=$("#pinErr");
    if(!/^\d{4,8}$/.test(p)){err.textContent="El PIN debe tener entre 4 y 8 números.";err.hidden=false;return}
    if(nuevo){if(p!==$("#pin2").value.trim()){err.textContent="Los dos PIN no coinciden.";err.hidden=false;return}
      const d=load();d.pin=await hashPin(p);save(d);UNLOCK=true;return docente()}
    if(await hashPin(p)===load().pin){UNLOCK=true;docente()}else{err.textContent="PIN incorrecto.";err.hidden=false}};
}
function docente(){
  const db=load(), H=db.hist.slice().reverse();
  const freq={}; db.hist.forEach(h=>h.fallos.forEach(f=>{const k=f.id+"|"+f.error;freq[k]=freq[k]||{id:f.id,area:f.area,error:f.error,n:0,c:0,s:0};freq[k].n++;if(f.conv)freq[k].c++;if(f.seguro)freq[k].s++}));
  const top=Object.values(freq).sort((a,b)=>b.n-a.n).slice(0,12);
  const agg={}; db.hist.forEach(h=>Object.entries(h.pen||{}).forEach(([k,v])=>{agg[k]=agg[k]||{t:0,o:0};agg[k].t+=v.t;agg[k].o+=v.o}));
  const aggO=Object.fromEntries(PENS.filter(k=>agg[k]).map(k=>[k,agg[k]]));
  const rep=db.hist.reduce((a,h)=>{if(h.rep){a.t+=h.rep.t;a.o+=h.rep.o}return a},{t:0,o:0});
  const dom=Object.values(db.dom).reduce((a,b)=>a+b,0);
  app.innerHTML=`
  <section class="card"><span class="eyebrow">Panel docente</span><h2>Aprendizaje real, no solo puntajes</h2>
  <p class="muted" style="font-size:.9rem">Datos guardados solo en este dispositivo. Para consolidar el colegio, copia el CSV y pégalo en la hoja de cálculo del área.</p>
  <div class="kpis"><div class="kpi"><b>${H.length}</b><span>Evaluaciones presentadas</span></div>
    <div class="kpi"><b>${rep.t?Math.round(rep.o/rep.t*100)+"%":"—"}</b><span>Retención: errores que el estudiante recordó días después (${rep.o}/${rep.t})</span></div>
    <div class="kpi"><b>${dom}</b><span>Errores consolidados tras 4 repasos espaciados</span></div></div></section>
  ${Object.keys(aggO).length?`<section class="card"><h3>Desempeño por nivel de pensamiento (todo el dispositivo)</h3><div class="bars">${bars(aggO)}</div><p class="muted" style="font-size:.85rem">Si Analizar y Evaluar están bajos, planee clases con preguntas del tipo «¿por qué esta opción no funciona?» y «¿qué tan válida es esta conclusión?».</p></section>`:""}
  <section class="card"><h3>Errores más frecuentes y su conversión</h3>
  ${top.length?`<div class="tbl"><table><thead><tr><th>Ítem</th><th>Área</th><th>Error conceptual</th><th>Veces</th><th>Con seguridad</th><th>Convertidos</th></tr></thead><tbody>${top.map(t=>`<tr><td>${esc(t.id)}</td><td>${esc(AREAS[t.area]||t.area)}</td><td>${esc(t.error)}</td><td>${t.n}</td><td>${t.s}</td><td>${t.c}</td></tr>`).join("")}</tbody></table></div><p class="muted" style="font-size:.85rem">«Con seguridad» = el estudiante estaba seguro y falló: es una idea errónea arraigada que vale la pena trabajar en clase.</p>`:`<p>Aún no hay evaluaciones en este dispositivo. Cuando un estudiante termine, aparecerán aquí sus errores y cuántos convirtió en fortaleza.</p>`}
  </section>
  ${db.rpt.length?`<section class="card"><h3>Preguntas reportadas por estudiantes (${db.rpt.length})</h3><div class="tbl"><table><thead><tr><th>Fecha</th><th>Ítem</th><th>Grado</th><th>Lo que vio el estudiante</th></tr></thead><tbody>${db.rpt.slice().reverse().map(r=>`<tr><td>${esc(r.fecha.slice(0,10))}</td><td>${esc(r.id)}</td><td>${r.grado}°</td><td>${esc(r.nota)}</td></tr>`).join("")}</tbody></table></div></section>`:""}
  <section class="card"><h3>Evaluaciones presentadas (${H.length})</h3>
  ${H.length?`<div class="tbl"><table><thead><tr><th>Fecha</th><th>Estudiante</th><th>Grado</th><th>Prueba</th><th>Puntaje</th><th>Retención</th><th>Errores convertidos</th><th>Compromiso</th></tr></thead><tbody>${H.map(h=>`<tr><td>${esc(h.fecha.slice(0,10))}</td><td>${esc(h.name)}</td><td>${h.grado}°</td><td>${h.mode==="mixto"?"Simulacro":h.mode==="repaso"?"Repaso":esc(AREAS[h.mode]||h.mode)}</td><td>${h.n?h.pct:"—"}</td><td>${h.rep&&h.rep.t?h.rep.o+"/"+h.rep.t:"—"}</td><td>${h.conv}/${h.err}</td><td>${esc(h.meta)}</td></tr>`).join("")}</tbody></table></div>
  <div class="row"><button type="button" class="navy" id="csv">Copiar CSV</button></div><textarea id="csvBox" rows="4" hidden readonly></textarea>`:""}
  </section>
  <section class="card"><h3>Banco cargado</h3><p class="muted">${BANK.length} preguntas tipo Saber en este archivo (grados 3° a 11°, 5 áreas), cada una con diagnóstico por opción incorrecta y reto gemelo${BANK.some(q=>q.revision)?`; ${BANK.filter(q=>q.revision).length} son nuevas y están en revisión docente`:""}. En 9°, 10° y 11°, con internet, se suman las preguntas del banco PREICFES (en revisión docente).</p>
  <div class="row"><button type="button" id="lock">Cerrar panel</button><button type="button" id="wipe">Borrar datos de este dispositivo</button></div><div id="wipeBox"></div></section>`;
  if($("#csv"))$("#csv").onclick=()=>{
    const rows=[["fecha","estudiante","grado","prueba","puntaje","correctas","total","errores","convertidos","dudas","errores_con_seguridad","repaso_recordados","repaso_total","item","area","competencia","pensamiento","opcion_elegida","error_conceptual","estaba_seguro","convertido"]];
    db.hist.forEach(h=>(h.fallos.length?h.fallos:[{}]).forEach(f=>rows.push([h.fecha,h.name,h.grado,h.mode,h.pct,h.ok,h.n,h.err,h.conv,h.dud,h.hc||0,(h.rep||{}).o||0,(h.rep||{}).t||0,f.id||"",f.area||"",f.comp||"",f.pen||"",f.elig||"",f.error||"",f.seguro===undefined?"":f.seguro?"sí":"no",f.conv===undefined?"":f.conv?"sí":"no"])));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const box=$("#csvBox");box.value=csv;
    navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(csv).then(()=>toast("CSV copiado"),()=>{box.hidden=false;box.select();toast("Selecciona y copia el texto")}):(box.hidden=false,box.select());
  };
  $("#lock").onclick=()=>{UNLOCK=false;home()};
  $("#wipe").onclick=()=>{$("#wipeBox").innerHTML=`<div class="box bad"><b>Esto borra todas las evaluaciones, repasos y el PIN de este dispositivo.</b><span>No se puede deshacer. Copia antes el CSV si lo necesitas.</span><div class="row"><button type="button" id="wNo" class="navy">Cancelar</button><button type="button" id="wYes">Sí, borrar todo</button></div></div>`;
    $("#wNo").onclick=()=>{$("#wipeBox").innerHTML=""};
    $("#wYes").onclick=()=>{try{localStorage.removeItem(KEY);localStorage.removeItem(SKEY)}catch(e){}UNLOCK=false;toast("Datos borrados");home()}};
  window.scrollTo({top:0});
}

const busy=()=>S&&!S.end&&Object.keys(S.ans).length;
$("#btnHome").onclick=()=>{if(busy()){saveS();toast("Tu evaluación queda guardada: la puedes continuar desde Inicio.")}S=null;home()};
$("#btnDocente").onclick=()=>{if(busy()){saveS();toast("Tu evaluación queda guardada.")}S=null;docenteGate()};
$("#hdrFace").src=AV_FACE;
home();
})();
