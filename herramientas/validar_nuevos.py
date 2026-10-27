#!/usr/bin/env python3
"""Validador estructural para ítems nuevos de SABI Ruta del Error (grados 3-11)."""
import json, sys, re, collections

AREAS = {"matematicas", "lenguaje", "sociales", "ciencias", "ingles"}
NIV = {"Mínimo", "Satisfactorio", "Avanzado"}
PEN = {"Recordar", "Comprender", "Aplicar", "Analizar", "Evaluar", "Crear"}
LEC = {"Literal", "Inferencial", "Crítico"}
REQ = ["id", "area", "grado", "competencia", "componente", "nivel", "dba", "lineamiento", "afirmacion", "evidencia",
       "enunciado", "opciones", "correcta", "errores", "explicacion", "tip", "truco", "temas", "gemela", "pensamiento"]
ERRF = ["error", "porque", "pregunta_guia", "aprende"]


def opts_ok(o, w, E):
    if not isinstance(o, dict) or not (3 <= len(o) <= 7):
        E.append(f"{w}: opciones 3-7"); return False
    if list(o) != list("ABCDEFG")[:len(o)]:
        E.append(f"{w}: letras en orden A,B,C..."); return False
    v = [str(x).strip().lower() for x in o.values()]
    if any(not x for x in v): E.append(f"{w}: opción vacía")
    if len(set(v)) != len(v): E.append(f"{w}: opciones repetidas")
    for x in v:
        if re.search(r"(todas|ninguna) (las|de las) anteriores|all of the above|none of the above", x):
            E.append(f"{w}: opción prohibida")
    return True


def main(paths):
    E = []
    allitems = []
    for p in paths:
        try:
            items = json.load(open(p, encoding="utf-8"))
        except Exception as ex:
            print(f"ERROR {p}: JSON inválido: {ex}"); sys.exit(1)
        if not isinstance(items, list): print("ERROR: no es arreglo"); sys.exit(1)
        allitems += items
    ids = collections.Counter(q.get("id") for q in allitems)
    for i, c in ids.items():
        if c > 1: E.append(f"id duplicado {i}")
    for q in allitems:
        w = q.get("id", "?")
        miss = [f for f in REQ if q.get(f) in (None, "", [], {})]
        if miss: E.append(f"{w}: faltan {miss}"); continue
        if q["area"] not in AREAS: E.append(f"{w}: área")
        if not isinstance(q["grado"], int) or not 3 <= q["grado"] <= 11: E.append(f"{w}: grado")
        if q["nivel"] not in NIV: E.append(f"{w}: nivel")
        if q["pensamiento"] not in PEN: E.append(f"{w}: pensamiento '{q['pensamiento']}'")
        if q["area"] == "lenguaje" and q.get("lectura") not in LEC: E.append(f"{w}: lectura requerida en lenguaje")
        if q.get("lectura") and q["lectura"] not in LEC: E.append(f"{w}: lectura inválida")
        if q["area"] == "ingles" and not q.get("mcer"): E.append(f"{w}: mcer")
        if q.get("revision") is not True: E.append(f"{w}: revision debe ser true")
        if opts_ok(q["opciones"], w, E):
            if q["correcta"] not in q["opciones"]: E.append(f"{w}: correcta fuera")
            wrong = set(q["opciones"]) - {q["correcta"]}
            if set(q["errores"]) != wrong: E.append(f"{w}: errores debe cubrir {sorted(wrong)}")
            for L, e in q["errores"].items():
                for f in ERRF:
                    if not isinstance(e, dict) or not str(e.get(f, "")).strip(): E.append(f"{w}: errores[{L}].{f}")
        g = q["gemela"]
        for f in ("enunciado", "opciones", "correcta", "explicacion"):
            if not g.get(f): E.append(f"{w}: gemela.{f}")
        if g.get("opciones") and opts_ok(g["opciones"], w + " gemela", E):
            if g.get("correcta") not in g["opciones"]: E.append(f"{w}: gemela correcta fuera")
        if g.get("enunciado", "").strip().lower() == q["enunciado"].strip().lower(): E.append(f"{w}: gemela idéntica")
        if not isinstance(q["temas"], list): E.append(f"{w}: temas lista")
    if E:
        print("\n".join(E)); print(f"{len(E)} errores"); sys.exit(1)
    c = collections.Counter((q["grado"], q["area"]) for q in allitems)
    print("OK", len(allitems), "ítems", dict(c))
    print("niveles", dict(collections.Counter(q["nivel"] for q in allitems)))
    print("pensamiento", dict(collections.Counter(q["pensamiento"] for q in allitems)))
    print("claves", dict(collections.Counter(q["correcta"] for q in allitems)))


if __name__ == "__main__":
    main(sys.argv[1:])
