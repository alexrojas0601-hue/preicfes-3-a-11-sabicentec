# Brief para generadores del banco (equipo: docentes expertos ICFES, pedagogos, especialistas DBA)
1. Lee COMPLETO /home/claude/preicfes-3-a-11-sabicentec/preicfes/tools/ESPECIFICACION_ITEMS.md y mira el formato en tools/ejemplos.json (no copies su contenido).
2. Genera los ítems asignados en lotes de 10–12 ítems. Cada lote es un archivo JSON (arreglo) llamado <BASE>.parteN.json dentro de /home/claude/preicfes-3-a-11-sabicentec/preicfes/banco_raw/ (escríbelo con la herramienta Write).
3. Antes de escribir cada ítem: resuélvelo tú mismo y resuelve su gemela; verifica cada cálculo (para matemáticas/ciencias usa python3 para comprobar cifras cuando haya cálculos). Si una opción incorrecta también podría defenderse, cámbiala.
4. Tras cada lote corre: python3 /home/claude/preicfes-3-a-11-sabicentec/preicfes/tools/validar_banco.py <archivo> y corrige hasta 0 errores.
5. Al final une las partes en orden: python3 /home/claude/preicfes-3-a-11-sabicentec/preicfes/tools/unir.py banco_raw/<BASE>.json banco_raw/<BASE>.parte1.json ... y valida el archivo final (0 errores; revisa que las claves A/B/C/D estén equilibradas).
6. Los ids son consecutivos con el prefijo asignado: <PREFIJO>001, <PREFIJO>002, ...
7. Respuesta final: UNA sola línea: "OK <BASE>.json <n> ítems" (o "FALLO <motivo>"). No resumas el contenido.
