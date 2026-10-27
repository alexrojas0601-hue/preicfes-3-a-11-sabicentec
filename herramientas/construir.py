#!/usr/bin/env python3
"""Construye index.html (SABI Ruta del Error) a partir de las fuentes de herramientas/.
Uso: python3 herramientas/construir.py
- banco/base.json: banco aprobado original.
- banco/pensamiento.json: nivel de pensamiento (Bloom revisado) y de lectura por id (en revisión docente).
- banco/nuevos_*.json: ítems nuevos, todos con "revision": true.
Valida los ítems nuevos antes de escribir y se detiene si hay errores."""
import json, glob, os, subprocess, sys, collections

H = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(H)


def main():
    base = json.load(open(f"{H}/banco/base.json", encoding="utf-8"))
    pen = json.load(open(f"{H}/banco/pensamiento.json", encoding="utf-8"))
    parche = {}
    if os.path.exists(f"{H}/banco/parche_longitud.json"):
        parche = json.load(open(f"{H}/banco/parche_longitud.json", encoding="utf-8"))
    for q in base:
        pt = parche.get(q["id"])
        if pt:
            if pt.get("opciones"):
                assert set(pt["opciones"]) == set(q["opciones"]), q["id"]
                q["opciones"] = pt["opciones"]
            if pt.get("errores"):
                q["errores"].update(pt["errores"])
            if pt.get("gemela_opciones"):
                q["gemela"]["opciones"] = pt["gemela_opciones"]
        p = pen.get(q["id"])
        if p:
            q["pensamiento"] = p["pensamiento"]
            if p.get("lectura"):
                q["lectura"] = p["lectura"]
    nuevos = sorted(glob.glob(f"{H}/banco/nuevos_*.json"))
    if nuevos:
        r = subprocess.run([sys.executable, f"{H}/validar_nuevos.py", *nuevos], capture_output=True, text=True)
        print(r.stdout.strip())
        if r.returncode:
            print(r.stderr); sys.exit("Ítems nuevos con errores: no se construye.")
    ids = {q["id"] for q in base}
    bank = list(base)
    for f in nuevos:
        for q in json.load(open(f, encoding="utf-8")):
            if q["id"] in ids:
                sys.exit(f"id repetido con el banco base: {q['id']}")
            ids.add(q["id"]); bank.append(q)
    bank.sort(key=lambda q: (q["grado"], ["matematicas", "lenguaje", "ciencias", "sociales", "ingles"].index(q["area"])))
    bj = json.dumps(bank, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    app = open(f"{H}/app.js", encoding="utf-8").read()
    app = app.replace("__AV_POSTER__", open(f"{H}/avatar_poster.b64").read().strip())
    app = app.replace("__AV_FACE__", open(f"{H}/avatar_face.b64").read().strip())
    html = open(f"{H}/plantilla.html", encoding="utf-8").read()
    html = html.replace("__CSS__", open(f"{H}/estilos.css", encoding="utf-8").read()).replace("__BANK__", bj).replace("__APP__", app)
    open(f"{R}/index.html", "w", encoding="utf-8").write(html)
    c = collections.Counter((q["grado"], q["area"]) for q in bank)
    print(f"index.html: {len(bank)} ítems, {len(html)//1024} KB")
    larga = 0
    for q in bank:
        L = sorted(len(v) for v in q["opciones"].values())
        lc = len(q["opciones"][q["correcta"]])
        if lc == L[-1] and L.count(lc) == 1 and lc > 1.3 * L[-2]:
            larga += 1
    print(f"Sesgo «la correcta es la más larga»: {larga}/{len(bank)} ({larga*100//len(bank)} %). Meta: menos de 10 %.")
    for g in range(3, 12):
        print(f"  {g}°: " + " · ".join(f"{a[:3]} {c[(g, a)]}" for a in ["matematicas", "lenguaje", "ciencias", "sociales", "ingles"]))


if __name__ == "__main__":
    main()
