#!/usr/bin/env python3
"""Dot guardián del bot de acceso SABI.

Revisa todas las páginas .html del repositorio e instala el bot de acceso
(https://superacion.sabicentec.com/sabi-puerta.js) donde falte, con el rol y el
texto de .sabi-puerta.json. Lo ejecuta el workflow «SABI · guardián del bot»
en cada push y cada semana. Sin dependencias.
"""
import json, os, re, sys

SRC = "https://superacion.sabicentec.com/sabi-puerta.js"
cfg = {"rol": "estudiante", "texto": "Aprender con SABI", "excluir": [], "reglas": []}
if os.path.exists(".sabi-puerta.json"):
    cfg.update(json.load(open(".sabi-puerta.json", encoding="utf-8")))
EXCL = re.compile("|".join([r"(^|/)(admin|404|privacidad)[^/]*\.html$", r"/\.git/", r"node_modules", r"(^|/)dist/"] + cfg["excluir"]), re.I)

cambiadas = []
for raiz, dirs, archivos in os.walk("."):
    dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "dist")]
    for a in archivos:
        if not a.lower().endswith(".html"):
            continue
        ruta = os.path.join(raiz, a)[2:]
        if EXCL.search(ruta) or os.path.getsize(ruta) < 1200:
            continue
        s = open(ruta, encoding="utf-8", errors="surrogateescape").read()
        if "sabi-puerta.js" in s or "</body>" not in s.lower():
            continue
        rol = cfg["rol"]
        for regla in cfg["reglas"]:
            if re.search(regla["patron"], ruta, re.I):
                rol = regla["rol"]
        etiqueta = f'<script src="{SRC}" data-rol="{rol}" data-texto="{cfg["texto"]}" defer></script>\n'
        i = s.lower().rfind("</body>")
        open(ruta, "w", encoding="utf-8", errors="surrogateescape").write(s[:i] + etiqueta + s[i:])
        cambiadas.append(ruta)

print(f"Bot instalado en {len(cambiadas)} página(s) nueva(s).")
for r in cambiadas:
    print(" -", r)
