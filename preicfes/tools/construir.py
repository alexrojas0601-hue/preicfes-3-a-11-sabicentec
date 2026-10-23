#!/usr/bin/env python3
"""Construye SABI PREICFES (Ruta del Error) a partir del motor de saber.sabicentec.com.
Uso (desde la raíz del repo): python3 preicfes/tools/construir.py
- Une banco_raw/*.json + preguntas 9°–11° heredadas de saber en preicfes/banco/<grado>-<area>.json
- Genera preicfes/index.html, sw.js, manifest.json"""
import json, glob, os, re, sys, time, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # preicfes/
REPO = os.path.dirname(ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))
from validar_banco import validate

src = open(os.path.join(REPO, "index.html"), encoding="utf-8").read()

# ---------- 1. BANCO ----------
MAPC = {"Comprensión lectora": "Pragmática",
        "Comprender cómo se articulan las partes de un texto": "Comprender cómo se articulan las partes de un texto para darle un sentido global",
        "Reflexionar y evaluar el contenido y la forma": "Reflexionar a partir de un texto y evaluar su contenido",
        "Identificar y entender contenidos locales": "Identificar y entender los contenidos locales de un texto",
        "Pensamiento sistémico": "Pensamiento reflexivo y sistémico",
        "Multiperspectivismo": "Interpretación y análisis de perspectivas",
        "Argumentación en contextos ciudadanos": "Pensamiento reflexivo y sistémico",
        "Razonamiento y argumentación": "Argumentación",
        "Planteamiento y resolución de problemas": "Formulación y ejecución",
        "Comunicación, representación y modelación": "Interpretación y representación"}
legacy = json.loads(re.search(r'<script type="application/json" id="bank">(.*?)</script>', src, re.S).group(1))
items = []
for q in legacy:
    if q["grado"] not in (9, 10, 11): continue
    q = dict(q); q["competencia"] = MAPC.get(q["competencia"], q["competencia"])
    q.setdefault("prueba", "Saber 11" if q["grado"] >= 10 else "Saber 9 · ruta a Saber 11")
    q.setdefault("estrategia_icfes", "Lee primero la pregunta, identifica qué te piden y luego vuelve al contexto para buscar solo la información necesaria. Descarta las opciones que no responden exactamente a lo preguntado.")
    if not validate([q], "x")[0]: items.append(q)
nleg = len(items)
for f in sorted(glob.glob(os.path.join(ROOT, "banco_raw", "*.json"))):
    if ".parte" in f: continue
    items += json.load(open(f, encoding="utf-8"))
_seen, _dedup = set(), []
for q in items:
    k = (re.sub(r"\s+", " ", q["enunciado"].strip().lower()), q["contexto"][:60])
    if k in _seen: print("Duplicado descartado:", q["id"]); continue
    _seen.add(k); _dedup.append(q)
items = _dedup
E, W = validate(items, "banco")
if E:
    print("\n".join(E[:30])); sys.exit("Banco con errores: corrige antes de construir")
groups = collections.defaultdict(list)
for q in items: groups[f'{q["grado"]}-{q["area"]}'].append(q)
os.makedirs(os.path.join(ROOT, "banco"), exist_ok=True)
for f in glob.glob(os.path.join(ROOT, "banco", "*.json")): os.remove(f)
version = time.strftime("%Y%m%d%H%M")
for k, arr in groups.items():
    json.dump(arr, open(os.path.join(ROOT, "banco", k + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
idx = {"version": version, "total": len(items), "files": {k: len(v) for k, v in sorted(groups.items())}}
json.dump(idx, open(os.path.join(ROOT, "banco", "indice.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"Banco: {len(items)} preguntas ({nleg} heredadas de saber) en {len(groups)} archivos")

# ---------- 2. HTML ----------
h = src
h = re.sub(r'<script type="application/json" id="bank">.*?</script>\s*', "", h, flags=re.S)
def rep(old, new, count=1):
    global h
    if old not in h: sys.exit("No encontré en el motor: " + old[:80])
    h = h.replace(old, new, count)

rep("<title>SABI Ruta del Error</title>", '<title>SABI PREICFES CENTEC</title>\n<meta name="description" content="Entrenamiento tipo Saber 11 con Ruta del Error · CENTEC Córdoba">\n<link rel="manifest" href="manifest.json"><meta name="theme-color" content="#1A2D7A"><link rel="icon" href="assets/icono.png"><link rel="apple-touch-icon" href="assets/icono.png">')
h = re.sub(r'const AV_POSTER = "data:[^"]+", AV_FACE = "data:[^"]+";', 'const AV_POSTER = "assets/avatar_sabi.jpg", AV_FACE = "assets/avatar_face.jpg";', h)
if 'assets/avatar_sabi.jpg' not in h: sys.exit("No pude reemplazar el avatar")
rep('SABI · Ruta del Error<small>CENTEC Córdoba · Evaluación tipo Saber</small>', 'SABI PREICFES · Ruta del Error<small>CENTEC Córdoba · Entrenamiento Saber 11</small>')
rep('<button id="btnHome" type="button">Inicio</button>', '<button id="btnHome" type="button">Inicio</button>\n  <button id="btnGuia" type="button">Guía ICFES</button>')
rep('const BANK = JSON.parse(document.getElementById("bank").textContent);', r'''let BANK = []; const LOADED = {}; let INDEX = null;
async function loadIndex(){ if(INDEX) return INDEX; try{ INDEX = await (await fetch("banco/indice.json",{cache:"no-cache"})).json(); }catch(e){ INDEX = {version:"0",total:0,files:{}}; } return INDEX; }
async function loadGrade(g){ const idx = await loadIndex();
  const fs = Object.keys(idx.files).filter(k=>k.split("-")[0]===String(g) && !LOADED[k]);
  await Promise.all(fs.map(async k=>{ try{ const arr = await (await fetch("banco/"+k+".json?v="+idx.version)).json(); if(!LOADED[k]){ LOADED[k]=1; BANK = BANK.concat(arr); } }catch(e){} })); }''')
rep('const KEY = "sabi_ruta_error_v1";', 'const KEY = "sabi_preicfes_ruta_v1";\nconst REAL11 = {matematicas:50,lenguaje:41,sociales:50,ciencias:58,ingles:55};\nconst DOC_PIN = "CENTEC2026";')

# SABER y nombres de área
h = re.sub(r"const SABER = \{.*?\n\};", r'''const SABER = {
  9:{areas:["matematicas","lenguaje","sociales","ciencias","ingles"],real:"Saber 9 evalúa Matemáticas (36), Lectura (36) y Ciencias o Pensamiento Ciudadano (36). En CENTEC entrenas desde 9° con la forma de Saber 11, incluido Inglés"},
  10:{areas:["matematicas","lenguaje","sociales","ciencias","ingles"],real:"Pre-Saber 11 con la estructura real: Matemáticas 50 · Lectura Crítica 41 · Sociales y Ciudadanas 50 · Ciencias Naturales 58 · Inglés 55"},
  11:{areas:["matematicas","lenguaje","sociales","ciencias","ingles"],real:"Saber 11: Matemáticas 50 · Lectura Crítica 41 · Sociales y Ciudadanas 50 · Ciencias Naturales 58 · Inglés 55 (7 partes), en dos sesiones"}
};''', h, flags=re.S)
h = re.sub(r"function areaName\(a,g\)\{.*?\n\}", r'''function areaName(a,g){
  if(a==="lenguaje") return "Lectura Crítica";
  if(a==="sociales") return "Sociales y Ciudadanas";
  return AREAS[a];
}''', h, flags=re.S)

# Contexto con tablas y gráficas
rep('${q.contexto?`<div class="ctx">${esc(q.contexto)}</div>`:""}', '${ctxHTML(q)}', 2)
rep('<p class="stem">${esc(g.enunciado)}</p>', '${ctxHTML(g)}<p class="stem">${esc(g.enunciado)}</p>')

# INICIO nuevo
h = re.sub(r"function home\(\)\{.*?\n\}\n\n/\* ---------- PRUEBA ---------- \*/", r'''function home(){
  S=null;
  const grades=[9,10,11], db=load();
  app.innerHTML=`
  <section class="card hero pop">
    <div class="avwrap">${AVATAR}</div>
    <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
      <span class="eyebrow">Hola, soy SABI, tu amigo del saber</span>
      <h1>Entrena como en Saber 11. Tus errores se vuelven tu mejor maestro.</h1>
      <p class="motto">“${MOTTO}”</p>
      <p class="muted" style="font-size:.9rem"><b id="nBank">Más de 2.500</b> preguntas tipo ICFES por competencias, DBA y lineamientos. Cada vez que presentas, SABI te muestra preguntas que no has visto: aquí no se memoriza, se aprende.</p>
      <div class="row"><button type="button" id="goGuia">Cómo pregunta el ICFES</button></div>
    </div>
  </section>
  <form class="card" id="fStart" novalidate>
    <h2>¿Quién presenta hoy?</h2>
    <div class="grid2">
      <label class="f">Nombre y apellido<input id="inName" autocomplete="name" placeholder="Ej.: Valentina Mosquera" value="${esc(db.lastName||"")}" required></label>
      <label class="f">Grado<select id="inGrade">${grades.map(g=>`<option value="${g}" ${g===(db.lastGrade||11)?"selected":""}>${g}°</option>`).join("")}</select></label>
    </div>
    <div id="modes"></div>
    <label class="f">Duración<select id="inSize">
      <option value="0.2">Corta · práctica rápida</option>
      <option value="0.4" selected>Estándar · entrenamiento</option>
      <option value="1">Completa · igual que el ICFES</option></select></label>
    <div id="info"></div>
    <p class="muted" style="font-size:.9rem">Si dudas en una pregunta, márcala con <b>“Tengo duda”</b>: también la revisaremos al final. En Saber 11 una respuesta en blanco cuenta como incorrecta y no hay penalización por intentar.</p>
    <p id="startErr" class="muted" style="color:var(--bad)" hidden>Escribe tu nombre para empezar.</p>
    <div class="row"><button class="primary" type="submit">Comenzar</button><button type="button" class="navy" id="goRep">Repasar mis errores</button></div>
  </form>`;
  loadIndex().then(i=>{ if(i.total) $("#nBank").textContent=i.total.toLocaleString("es-CO"); });
  const drawModes=()=>{
    const g=+$("#inGrade").value, sb=SABER[g];
    $("#modes").innerHTML=`<div style="display:flex;flex-direction:column;gap:6px"><b style="font-size:.9rem">¿Qué vas a presentar?</b><div class="modes">
      <label class="mode"><input type="radio" name="mode" value="mixto" checked> Simulacro Saber 11 (5 pruebas)</label>
      ${sb.areas.map(a=>`<label class="mode"><input type="radio" name="mode" value="${a}"> ${areaName(a,g)}</label>`).join("")}</div></div>`;
    $("#info").innerHTML=`<div class="box n"><span class="eyebrow">Así es la prueba real</span><span>${sb.real}. Selección múltiple con única respuesta; en Inglés varias partes tienen 3 opciones (A, B, C). Tiempo de referencia: unos 2 minutos por pregunta.</span></div>`;
  };
  $("#inGrade").addEventListener("change",drawModes); drawModes();
  $("#goGuia").onclick=guia;
  $("#goRep").onclick=()=>{ const name=$("#inName").value.trim(); if(!name){$("#startErr").hidden=false;$("#inName").focus();return} repaso(name); };
  $("#fStart").addEventListener("submit",async e=>{
    e.preventDefault();
    const name=$("#inName").value.trim(); if(!name){$("#startErr").hidden=false;$("#inName").focus();return}
    const g=+$("#inGrade").value, mode=document.querySelector('input[name="mode"]:checked').value, size=+$("#inSize").value;
    const btn=e.submitter||$("#fStart button[type=submit]"); btn.disabled=true; btn.textContent="Preparando tus preguntas…";
    await loadGrade(g);
    const areas=mode==="mixto"?SABER[g].areas:[mode];
    let items=[],notes=[];
    areas.forEach(a=>{const k=Math.max(5,Math.round(REAL11[a]*size*(mode==="mixto"?1:1.25)));const r=pick(name,g,a,mode==="mixto"?k:Math.min(REAL11[a],Math.max(10,k)));items=items.concat(r.items);if(r.note)notes.push(r.note)});
    if(!items.length){btn.disabled=false;btn.textContent="Comenzar";toast("No pude cargar el banco. Conéctate una vez a internet para descargarlo.");return}
    const db2=load(); db2.lastName=name; db2.lastGrade=g; save(db2);
    S={name,grado:g,mode,items,ans:{},flag:{},i:0,ruta:{},start:Date.now()};
    quiz();
    if(notes.length)toast("Ya viste todo el banco de "+notes.join(", ")+". Empieza un nuevo ciclo.");
  });
}

/* ---------- REPASO ESPACIADO DE ERRORES ---------- */
async function repaso(name){
  const db=load(); const P=(db.pend||{})[normName(name)]||{}; const ids=Object.keys(P);
  if(!ids.length){toast("No tienes errores pendientes. ¡Presenta una evaluación!");return}
  for(const g of [...new Set(ids.map(i=>P[i].g))]) await loadGrade(g);
  const items=shuffle(BANK.filter(q=>P[q.id])).slice(0,20);
  if(!items.length){toast("No pude cargar tus preguntas pendientes.");return}
  S={name,grado:items[0].grado,mode:"repaso",items,ans:{},flag:{},i:0,ruta:{},start:Date.now()};
  quiz(); toast("Repaso: vuelves a las preguntas que fallaste. Si aciertas, salen de tu lista.");
}

/* ---------- GUÍA: CÓMO PREGUNTA EL ICFES ---------- */
function guia(){
  if(S&&!S.end&&Object.keys(S.ans).length){toast("Termina primero la evaluación en curso.");return}
  const C=[["Matemáticas","50 preguntas","Interpretación y representación · Formulación y ejecución · Argumentación","Estadística, Geometría, Álgebra y cálculo. Cerca de la mitad son situaciones cotidianas (porcentajes, proporciones, lectura de tablas y gráficas)."],
   ["Lectura Crítica","41 preguntas","Identificar y entender los contenidos locales · Comprender cómo se articulan las partes del texto · Reflexionar y evaluar su contenido","Textos continuos (literarios, informativos, filosóficos, argumentativos) y discontinuos (tablas, infografías, caricaturas)."],
   ["Sociales y Ciudadanas","50 preguntas","Pensamiento social · Interpretación y análisis de perspectivas · Pensamiento reflexivo y sistémico","Constitución de 1991, historia, geografía, economía y dilemas ciudadanos analizados desde distintos actores."],
   ["Ciencias Naturales","58 preguntas","Uso comprensivo del conocimiento científico · Explicación de fenómenos · Indagación","Componentes biológico, químico, físico y ciencia, tecnología y sociedad; muchos ítems parten de experimentos con tablas y gráficas."],
   ["Inglés","55 preguntas","Lingüística · Pragmática · Sociolingüística","7 partes: avisos, vocabulario, conversaciones, textos con espacios y comprensión de lectura. Resultado en niveles A-, A1, A2, B1 y B+."]];
  app.innerHTML=`
  <section class="card"><span class="eyebrow">Dot Tutor · Guía ICFES</span><h2>Así está construido Saber 11</h2>
  <p>Son 5 pruebas en dos sesiones. Cada prueba da un puntaje de 0 a 100 y el <b>puntaje global va de 0 a 500</b>: Matemáticas, Lectura Crítica, Sociales y Ciencias pesan 3 cada una e Inglés pesa 1. Por eso subir 5 puntos en una prueba de peso 3 mueve el global mucho más que en Inglés.</p>
  <div class="tbl"><table><thead><tr><th>Prueba</th><th>Preguntas</th><th>Competencias</th><th>Qué encuentras</th></tr></thead><tbody>${C.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>
  <section class="card"><h3>La forma de cada pregunta</h3>
  <p>Todas son de selección múltiple con única respuesta. Cada una nace de una <b>afirmación</b> (lo que el ICFES quiere saber que puedes hacer) y una <b>evidencia</b> (lo que haces para demostrarlo). Las opciones incorrectas no son al azar: cada una representa un error típico. Por eso en SABI cada error tiene nombre, causa y corrección.</p>
  <div class="tt"><div class="box q"><span class="eyebrow">Proceso en 4 pasos</span><span class="pre">1. Lee primero el enunciado: ¿qué verbo usa? (identificar, calcular, inferir, evaluar)
2. Vuelve al contexto y subraya solo lo que necesitas.
3. Resuelve o anticipa tu respuesta antes de mirar las opciones.
4. Descarta: busca en cada opción el error típico y quédate con la que responde exactamente lo preguntado.</span></div>
  <div class="box q"><span class="eyebrow">Manejo del tiempo</span><span class="pre">Unos 2 minutos por pregunta.
Si una te bloquea, márcala y sigue: vuelve al final.
Nunca dejes respuestas en blanco: no restan.
Lee las gráficas por sus ejes, unidades y título antes de los datos.</span></div></div></section>
  <section class="card"><h3>Niveles de desempeño</h3><p>Además del puntaje, el ICFES ubica a cada estudiante en niveles (1 a 4; en Inglés A-, A1, A2, B1, B+). En SABI cada pregunta indica su exigencia (Mínimo, Satisfactorio, Avanzado) para que veas en qué nivel ya respondes con seguridad y cuál es tu siguiente reto.</p>
  <p class="motto">“${MOTTO}”</p><div class="row"><button class="primary" type="button" id="gBack">Empezar a entrenar</button></div></section>`;
  $("#gBack").onclick=home; window.scrollTo({top:0});
}

/* ---------- TABLAS Y GRÁFICAS ---------- */
const fmt=v=>Math.abs(v)>=1000?Math.round(v).toLocaleString("es-CO"):(Math.round(v*100)/100).toLocaleString("es-CO");
function tablaHTML(t){return `<div class="tbl"><table>${t.titulo?`<caption>${esc(t.titulo)}</caption>`:""}<thead><tr>${t.cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${t.filas.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
function graficaHTML(g){
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

/* ---------- PRUEBA ---------- */''', h, flags=re.S)
if "function repaso" not in h: sys.exit("No pude reemplazar home()")

# Temporizador en la prueba
rep('<span class="muted" style="font-size:.85rem">${answered}/${n} respondidas</span>', '<span class="muted" style="font-size:.85rem">${answered}/${n} respondidas · <span id="tmr"></span> de ~${n*2} min</span>')
# Calificación: lista de repaso por estudiante
rep('  persist(); results();\n}', '''  const db=load(), pk=normName(S.name); db.pend=db.pend||{}; const P=db.pend[pk]=db.pend[pk]||{};
  S.items.forEach(q=>{ if(S.ans[q.id]===q.correcta) delete P[q.id]; else P[q.id]={g:q.grado,a:q.area,t:Date.now()}; });
  save(db); persist(); results();
}''')
# Puntaje estimado tipo Saber 11
rep('function results(){', r'''function puntajeHTML(){
  const Wt={matematicas:3,lenguaje:3,sociales:3,ciencias:3,ingles:1}, by={};
  S.items.forEach(q=>{by[q.area]=by[q.area]||{t:0,o:0};by[q.area].t++;if(S.ans[q.id]===q.correcta)by[q.area].o++});
  const areas=ORDER.filter(a=>by[a]), pa=a=>Math.round(by[a].o/by[a].t*100);
  const glob=areas.length===5?Math.round(areas.reduce((x,a)=>x+pa(a)*Wt[a],0)/13*5):0;
  return `<section class="card"><span class="eyebrow">Proyección tipo Saber 11</span><h3>${glob?`Puntaje global estimado: ${glob} de 500`:"Puntaje estimado de la prueba"}</h3>
  <div class="bars">${areas.map(a=>`<div class="bar"><span>${esc(areaName(a,S.grado))}${a==="ingles"?" (peso 1)":" (peso 3)"}</span><span class="t"><i style="width:${pa(a)}%"></i></span><b>${pa(a)}/100</b></div>`).join("")}</div>
  <p class="muted" style="font-size:.85rem">Estimación SABI: tu porcentaje de acierto en escala 0–100 por prueba y el global con la ponderación oficial (Matemáticas, Lectura Crítica, Sociales y Ciencias ×3; Inglés ×1). El ICFES usa un modelo estadístico propio: úsala para ver tu tendencia, no como puntaje oficial.</p></section>`;
}
function results(){''')
rep('  ${rc.err+rc.dud?`<section class="card" style="border:2px solid var(--orange)">', '  ${S.mode!=="repaso"?puntajeHTML():""}\n  ${rc.err+rc.dud?`<section class="card" style="border:2px solid var(--orange)">')
# Panel docente
rep('${h.mode==="mixto"?"Simulacro":AREAS[h.mode]}', '${h.mode==="mixto"?"Simulacro":h.mode==="repaso"?"Repaso":AREAS[h.mode]}')
rep('${BANK.length} preguntas tipo Saber (grados 3° a 11°, 5 áreas), cada una con diagnóstico por opción incorrecta y reto gemelo.', '${(INDEX&&INDEX.total||BANK.length).toLocaleString("es-CO")} preguntas tipo Saber 11 (grados 9° a 11°, 5 pruebas), cada una con competencia, DBA, lineamiento, diagnóstico por opción incorrecta y reto gemelo. Versión del banco: ${INDEX?INDEX.version:"—"}.')
rep('$("#btnDocente").onclick=()=>{if(S&&!S.end&&Object.keys(S.ans).length){toast("Termina primero la evaluación en curso.");return}docente()};',
    '''$("#btnDocente").onclick=()=>{if(S&&!S.end&&Object.keys(S.ans).length){toast("Termina primero la evaluación en curso.");return}
  let ok=false;try{ok=sessionStorage.getItem("sabi_doc")==="1"}catch(e){}
  if(!ok){const p=prompt("Clave del panel docente");if((p||"").trim().toUpperCase()!==DOC_PIN){toast("Clave incorrecta");return}try{sessionStorage.setItem("sabi_doc","1")}catch(e){}}
  loadIndex().then(docente)};
$("#btnGuia").onclick=guia;
setInterval(()=>{const el=document.getElementById("tmr");if(el&&S&&!S.end){const s=Math.floor((Date.now()-S.start)/1000);el.textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}},1000);
if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));''')

# CSS de gráficas
rep("</style>", """.chartwrap{margin:0;display:flex;flex-direction:column;gap:6px}
.chart{width:100%;height:auto;color:var(--fg);background:var(--surface-2);border-radius:12px}
.chart text{fill:currentColor;font-size:11px;font-family:var(--font)}.chart .ct{font-weight:800;font-size:13px}
.chart .gl{stroke:var(--line);stroke-width:1}.chart .ax{stroke:var(--muted);stroke-width:1.2}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:.85rem}.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
caption{font-weight:800;text-align:left;padding:6px 0;caption-side:top}
</style>""")

open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(h)

# ---------- 3. PWA ----------
open(os.path.join(ROOT, "sw.js"), "w").write(f'''/* SABI PREICFES · funciona sin internet tras la primera visita */
const V="sabi-preicfes-{version}";
const SHELL=["./","index.html","manifest.json","assets/avatar_sabi.jpg","assets/avatar_face.jpg","assets/icono.png"];
self.addEventListener("install",e=>{{e.waitUntil((async()=>{{
  const c=await caches.open(V); await c.addAll(SHELL);
  try{{ const r=await fetch("banco/indice.json",{{cache:"no-store"}}); const idx=await r.clone().json(); await c.put("banco/indice.json",r);
    await c.addAll(Object.keys(idx.files).map(k=>"banco/"+k+".json?v="+idx.version)); }}catch(err){{}}
  self.skipWaiting(); }})())}});
self.addEventListener("activate",e=>{{e.waitUntil((async()=>{{for(const k of await caches.keys()) if(k!==V) await caches.delete(k); await self.clients.claim();}})())}});
self.addEventListener("fetch",e=>{{
  const u=new URL(e.request.url); if(e.request.method!=="GET"||u.origin!==location.origin) return;
  const fresh=e.request.mode==="navigate"||u.pathname.endsWith("indice.json");
  e.respondWith((async()=>{{
    const c=await caches.open(V);
    if(fresh){{ try{{ const r=await fetch(e.request,{{cache:"no-store"}}); if(r.ok) c.put(u.pathname.endsWith("indice.json")?"banco/indice.json":e.request,r.clone()); return r; }}
      catch(err){{ return (await c.match(u.pathname.endsWith("indice.json")?"banco/indice.json":e.request))||(await c.match("index.html")); }} }}
    const hit=await c.match(e.request); if(hit) return hit;
    try{{ const r=await fetch(e.request); if(r.ok) c.put(e.request,r.clone()); return r; }}catch(err){{ return new Response("",{{status:504}}); }}
  }})());
}});
''')
json.dump({"name": "SABI PREICFES CENTEC", "short_name": "SABI PREICFES", "start_url": "./", "scope": "./",
           "display": "standalone", "background_color": "#f4f6fb", "theme_color": "#1A2D7A", "lang": "es-CO",
           "icons": [{"src": "assets/icono.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]},
          open(os.path.join(ROOT, "manifest.json"), "w"), ensure_ascii=False, indent=1)
print("Listo: index.html, sw.js, manifest.json · versión", version)
