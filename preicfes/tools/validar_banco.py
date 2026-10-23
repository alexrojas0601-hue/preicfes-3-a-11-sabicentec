#!/usr/bin/env python3
"""Dot Auditor estructural del banco SABI PREICFES.
Uso: python3 validar_banco.py archivo.json [archivo2.json ...]
Sale con código 1 si hay errores. Las advertencias no bloquean."""
import json, sys, collections, re

AREAS = {"matematicas", "lenguaje", "sociales", "ciencias", "ingles"}
NIVELES = {"Mínimo", "Satisfactorio", "Avanzado"}
COMP = {
    "matematicas": {"Interpretación y representación", "Formulación y ejecución", "Argumentación"},
    "lenguaje": {"Identificar y entender los contenidos locales de un texto",
                 "Comprender cómo se articulan las partes de un texto para darle un sentido global",
                 "Reflexionar a partir de un texto y evaluar su contenido"},
    "sociales": {"Pensamiento social", "Interpretación y análisis de perspectivas", "Pensamiento reflexivo y sistémico"},
    "ciencias": {"Uso comprensivo del conocimiento científico", "Explicación de fenómenos", "Indagación"},
    "ingles": {"Lingüística", "Pragmática", "Sociolingüística"},
}
REQ = ["id", "area", "grado", "prueba", "competencia", "componente", "nivel", "dba", "lineamiento", "afirmacion",
       "evidencia", "contexto", "enunciado", "opciones", "correcta", "errores", "explicacion", "tip", "truco",
       "estrategia_icfes", "temas", "gemela"]
ERRF = ["error", "porque", "pregunta_guia", "aprende"]


def check_opts(o, where, E):
    if not isinstance(o, dict) or not (3 <= len(o) <= 4):
        E.append(f"{where}: opciones debe tener 3 o 4 entradas"); return False
    if list(o.keys()) != list("ABCD")[:len(o)]:
        E.append(f"{where}: letras de opciones deben ser A,B,C(,D) en orden"); return False
    vals = [str(v).strip() for v in o.values()]
    if any(not v for v in vals): E.append(f"{where}: opción vacía")
    if len(set(v.lower() for v in vals)) != len(vals): E.append(f"{where}: opciones repetidas")
    for v in vals:
        if re.search(r"(todas|ninguna) (las|de las) anteriores|all of the above|none of the above", v, re.I):
            E.append(f"{where}: opción prohibida '{v}'")
    return True


def validate(items, fname):
    E, W = [], []
    if not isinstance(items, list): return [f"{fname}: no es un arreglo"], W
    ids, stems = set(), set()
    keys = collections.Counter()
    for k, q in enumerate(items):
        w = f"{fname}[{k}] {q.get('id', '?')}"
        for f in REQ:
            if f not in q or q[f] in (None, "", [], {}):
                E.append(f"{w}: falta '{f}'")
        if E and E[-1].startswith(w): continue
        if q["id"] in ids: E.append(f"{w}: id duplicado")
        ids.add(q["id"])
        if q["area"] not in AREAS: E.append(f"{w}: área inválida")
        if q["grado"] not in (9, 10, 11): E.append(f"{w}: grado inválido")
        if q["nivel"] not in NIVELES: E.append(f"{w}: nivel inválido '{q['nivel']}'")
        if q["area"] in COMP and q["competencia"] not in COMP[q["area"]]:
            E.append(f"{w}: competencia no oficial '{q['competencia']}'")
        if q["area"] == "ingles" and q.get("mcer") not in ("A-", "A1", "A2", "B1", "B+"):
            E.append(f"{w}: mcer inválido")
        st = re.sub(r"\s+", " ", q["enunciado"].strip().lower())
        if (st, q["contexto"][:60]) in stems: E.append(f"{w}: enunciado repetido")
        stems.add((st, q["contexto"][:60]))
        if check_opts(q["opciones"], w, E):
            if q["correcta"] not in q["opciones"]: E.append(f"{w}: correcta fuera de opciones")
            wrong = set(q["opciones"]) - {q["correcta"]}
            if set(q["errores"]) != wrong:
                E.append(f"{w}: errores debe cubrir exactamente {sorted(wrong)}")
            for L, e in q["errores"].items():
                for f in ERRF:
                    if not isinstance(e, dict) or not str(e.get(f, "")).strip():
                        E.append(f"{w}: errores[{L}] falta '{f}'")
            keys[q["correcta"]] += 1
        g = q["gemela"]
        if not isinstance(g, dict): E.append(f"{w}: gemela inválida")
        else:
            for f in ("enunciado", "opciones", "correcta", "explicacion"):
                if not g.get(f): E.append(f"{w}: gemela falta '{f}'")
            if g.get("opciones") and check_opts(g["opciones"], w + " gemela", E):
                if g.get("correcta") not in g["opciones"]: E.append(f"{w}: gemela correcta fuera de opciones")
            if g.get("enunciado", "").strip().lower() == q["enunciado"].strip().lower():
                E.append(f"{w}: gemela idéntica al ítem")
        if not isinstance(q["temas"], list): E.append(f"{w}: temas debe ser lista")
        if "Paso" not in q["explicacion"] and q["area"] == "matematicas":
            W.append(f"{w}: explicación sin pasos")
        t = q.get("tabla")
        if t is not None:
            if not (isinstance(t, dict) and isinstance(t.get("cols"), list) and isinstance(t.get("filas"), list)
                    and all(isinstance(r, list) and len(r) == len(t["cols"]) for r in t["filas"])):
                E.append(f"{w}: tabla mal formada")
        gr = q.get("grafica")
        if gr is not None:
            ok = isinstance(gr, dict) and gr.get("tipo") in ("barras", "lineas") and isinstance(gr.get("etiquetas"), list) \
                and isinstance(gr.get("series"), list) and gr["series"]
            if ok:
                for s in gr["series"]:
                    d = s.get("datos")
                    if not (isinstance(d, list) and len(d) == len(gr["etiquetas"]) and all(isinstance(x, (int, float)) for x in d)):
                        ok = False
            if not ok: E.append(f"{w}: grafica mal formada")
    n = sum(keys.values())
    if n >= 12:
        for L, c in keys.items():
            if c / n > 0.40: W.append(f"{fname}: clave {L} concentra {c}/{n}")
    return E, W


if __name__ == "__main__":
    tot, bad = 0, 0
    for fn in sys.argv[1:]:
        try:
            data = json.load(open(fn, encoding="utf-8"))
        except Exception as ex:
            print(f"ERROR {fn}: JSON inválido: {ex}"); bad += 1; continue
        E, W = validate(data, fn)
        tot += len(data) if isinstance(data, list) else 0
        for e in E: print("ERROR", e)
        for x in W: print("AVISO", x)
        bad += len(E)
        print(f"{fn}: {len(data) if isinstance(data, list) else 0} ítems, {len(E)} errores, {len(W)} avisos")
    print(f"TOTAL {tot} ítems · {bad} errores")
    sys.exit(1 if bad else 0)
