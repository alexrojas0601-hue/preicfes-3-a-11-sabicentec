# Reingeniería de aprendizaje · SABI Ruta del Error (v2, octubre 2026)

**Pregunta de partida (ingeniería a la inversa):** ¿qué tiene que pasar para que un estudiante de 3° a 11° *de verdad* suba de nivel en DBA, competencias Saber, lectura y pensamiento? Se partió del resultado deseado hacia atrás y cada pieza de la app se clasificó en CONSERVAR · CORREGIR · SIMPLIFICAR · AUTOMATIZAR · ELIMINAR.

## Diagnóstico de la v1

| Hallazgo | Por qué frenaba el aprendizaje | Decisión |
| --- | --- | --- |
| La Ruta del Error terminaba el mismo día: acertar la gemela justo después de leer la explicación se marcaba «fortaleza». | Acertar inmediatamente después de ver la solución mide memoria de corto plazo, no aprendizaje. | **CORREGIR**: repaso espaciado entre sesiones. «Fortaleza en camino» hasta pasar 4 repasos (1, 3, 7, 21 días); luego «Consolidado». |
| La casilla «Tengo duda» era opcional y binaria. | No distinguía el error cometido con seguridad, que es el que más se corrige cuando se explica (hipercorrección). | **CORREGIR**: certeza en cada respuesta (Seguro / Dudo / Adiviné); errores con seguridad van primero en la ruta. |
| En el paso 2 la pregunta guía no pedía nada al estudiante. | Leer una pista no es recuperar. | **CORREGIR**: segundo intento con la pista antes de ver la explicación, y autoexplicación breve. |
| 4°, 6°, 8° y 10° tenían 2 preguntas por área; Inglés 3°–9°, 2 por grado. | Con tan pocas preguntas se repiten y se memorizan. | **CORREGIR**: +30 ítems por grado en 4°, 6°, 8° y 10°; +24 de Inglés; en 9°–11° se suman con internet los 2.502 ítems del banco PREICFES. |
| 35 % de los ítems tenía la correcta claramente más larga. | Enseña a «adivinar por la forma» en vez de pensar. | **CORREGIR**: distractores reescritos; el constructor mide el sesgo en cada construcción (meta < 10 %). |
| No había dato de nivel de pensamiento ni de lectura. | No se podía saber si el estudiante sube de recordar a analizar y evaluar. | **AUTOMATIZAR**: cada ítem trae `pensamiento` (Bloom revisado) y `lectura` (literal, inferencial, crítico); resultados y panel los reportan. |
| Recargar la página borraba la evaluación en curso. | Se pierde el trabajo y la motivación. | **CORREGIR**: autoguardado y «Continuar». |
| El panel docente se abría sin clave en equipos compartidos. | Un estudiante podía ver nombres y puntajes de otros (Ley 1581 de 2012). | **CORREGIR**: PIN docente (barrera ligera, guardado con hash en el equipo) y botón para borrar datos. |
| El banco PREICFES traía tablas y gráficas que esta app no dibujaba. | | **CORREGIR**: se dibujan tablas y gráficas SVG. |
| El puntaje mezclaba preguntas de repaso con preguntas nuevas. | Inflaba el puntaje. | **CORREGIR**: el repaso se mide aparte como «retención». |

## Evidencia que sostiene los cambios (revisada por pares, DOI verificado)
- Práctica de recuperación: Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science, 17*(3), 249–255. https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Repaso espaciado: Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks. *Psychological Bulletin, 132*(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354
- Hipercorrección: Butterfield, B., & Metcalfe, J. (2001). Errors committed with high confidence are hypercorrected. *JEP: Learning, Memory, and Cognition, 27*(6), 1491–1494. https://doi.org/10.1037/0278-7393.27.6.1491

Límite honesto: los intervalos 1-3-7-21 días son una convención razonable, no un óptimo demostrado para cada edad; Cepeda et al. muestran que el intervalo ideal depende de cuánto tiempo se quiere recordar. Las clasificaciones de pensamiento las hizo un Dot y están **en revisión docente**.

## Cómo se construye
`python3 herramientas/construir.py` arma `index.html` desde `herramientas/` (app.js, estilos.css, plantilla.html, banco/). Valida los ítems nuevos y se detiene si hay errores. `herramientas/` y `docs/` no se publican (ver `.assetsignore`).

## Pendientes para el equipo humano
1. Docentes de área: aprobar o corregir los ítems marcados `revision: true` (ver `herramientas/banco/*_auditoria.json`).
2. Docentes de área: revisar la clasificación de pensamiento y lectura (`herramientas/banco/pensamiento.json`).
3. Confirmar el número oficial de los DBA que los Dots dejaron «sin número verificado».
4. Unificar componentes: «Espacial-métrico» frente a «Geométrico-métrico» en Matemáticas 6°; Sociales 6° con competencias de Saber 7.
5. Clasificar pensamiento y lectura en los 2.502 ítems del banco PREICFES.
6. Llevar los datos del panel a una base compartida con cuentas por estudiante (hoy viven en cada equipo).
