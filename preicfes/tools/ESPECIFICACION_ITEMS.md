# Especificación de ítems · SABI PREICFES CENTEC (Ruta del Error)

Cada pregunta es un objeto JSON. Un archivo de banco = un arreglo JSON de ítems de UN grado y UNA área.
Todo en español de Colombia, salvo el área de Inglés (enunciados, contextos y opciones en inglés; los campos pedagógicos —errores, explicación, tip, truco, estrategia— en español).

## Campos obligatorios
| campo | descripción |
|---|---|
| id | Único. Formato asignado, p. ej. `P11-MAT-A001` |
| area | `matematicas` · `lenguaje` (Lectura Crítica) · `sociales` · `ciencias` · `ingles` |
| grado | 9, 10 u 11 (entero) |
| prueba | `Saber 11` (grados 10 y 11) o `Saber 9 · ruta a Saber 11` (grado 9) |
| competencia | Exactamente una de las competencias oficiales ICFES del área (lista abajo) |
| componente | Componente oficial del área (lista abajo); en Inglés la parte, p. ej. `Parte 4 · Texto con espacios (gramática)` |
| nivel | `Mínimo` · `Satisfactorio` · `Avanzado` (exigencia de la pregunta; reparto aprox. 30/40/30) |
| dba | DBA del MEN para ese grado y área. Cita el número del DBA SOLO si estás seguro; si no, describe su contenido sin inventar números. Ej.: `DBA Matemáticas 10° (MEN 2016): ...` |
| lineamiento | Lineamiento curricular / Estándar Básico de Competencias (EBC 2006) que soporta el ítem |
| afirmacion | Afirmación del marco de referencia ICFES (lo que se evalúa) |
| evidencia | Evidencia observable (lo que el estudiante hace para responder) |
| contexto | Situación/texto base. Puede compartirse entre 2–4 ítems consecutivos (cadena idéntica, carácter por carácter) |
| enunciado | La pregunta (termina en `?` o en `:`) |
| opciones | `{"A":..,"B":..,"C":..,"D":..}` (4 opciones). Inglés: 3 opciones A–C en Partes 1–5; 4 opciones A–D en Partes 6–7 |
| correcta | Letra correcta. Reparte las claves de forma equilibrada entre A, B, C, D en el archivo |
| errores | Para CADA opción incorrecta: `{"error": nombre corto del error conceptual, "porque": "Elegiste X porque probablemente...", "pregunta_guia": pregunta socrática que lleva a descubrir el error, "aprende": la corrección concreta}` |
| explicacion | Solución completa `/paso_a_paso`: "Paso 1: ... Paso 2: ..." sin saltar deducciones |
| tip | Consejo breve de SABI |
| truco | Regla mnemotécnica o atajo válido |
| estrategia_icfes | Cómo pregunta el ICFES este tipo de ítem y cómo abordarlo (forma, proceso, procedimiento) |
| temas | 2–4 temas para repasar |
| gemela | Reto gemelo (mismo concepto, otros datos): `{"contexto"(opcional), "enunciado", "opciones", "correcta", "explicacion"}` |

## Campos opcionales
- `mcer`: solo Inglés: `A-`, `A1`, `A2`, `B1` o `B+`.
- `sabic`: área diferenciadora del PEI cuando aplique: `Matemática financiera`, `Estadística financiera`, `Inteligencia emocional`, `STEAM`, `Técnico SENA`, `Educación digital e IA`.
- `tabla`: `{"titulo": "...", "cols": ["...","..."], "filas": [["..",".."],...]}` — se dibuja como tabla.
- `grafica`: `{"tipo":"barras"|"lineas", "titulo":"...", "etiquetas":["2019","2020",...], "series":[{"nombre":"...","datos":[n,n,...]}], "ejeY":"unidad"}` — se dibuja como gráfica SVG. `datos` numéricos con la misma longitud que `etiquetas`.
  Usa tablas y gráficas con frecuencia: el ICFES las usa mucho (estadística, ciencias, sociales).

## Competencias y componentes oficiales (Saber 11)
- **Matemáticas** · competencias: `Interpretación y representación` · `Formulación y ejecución` · `Argumentación`. Componentes: `Estadística` · `Geometría` · `Álgebra y cálculo`. (≈50 % contenido genérico: situaciones cotidianas, porcentajes, proporciones, lectura de datos.)
- **Lectura Crítica** · competencias: `Identificar y entender los contenidos locales de un texto` · `Comprender cómo se articulan las partes de un texto para darle un sentido global` · `Reflexionar a partir de un texto y evaluar su contenido`. Componentes: `Texto continuo literario` · `Texto continuo informativo` · `Texto continuo filosófico` · `Texto continuo argumentativo` · `Texto discontinuo`.
- **Sociales y Ciudadanas** · competencias: `Pensamiento social` · `Interpretación y análisis de perspectivas` · `Pensamiento reflexivo y sistémico`. Componentes: `Constitución y ciudadanía` · `Historia` · `Geografía` · `Economía y política` · `Convivencia, paz y perspectivas`.
- **Ciencias Naturales** · competencias: `Uso comprensivo del conocimiento científico` · `Explicación de fenómenos` · `Indagación`. Componentes: `Biológico` · `Químico` · `Físico` · `Ciencia, tecnología y sociedad`.
- **Inglés** · competencias: `Lingüística` · `Pragmática` · `Sociolingüística`. Partes: `Parte 1 · Avisos y letreros` · `Parte 2 · Vocabulario (palabra-definición)` · `Parte 3 · Conversaciones cortas` · `Parte 4 · Texto con espacios (gramática)` · `Parte 5 · Comprensión de lectura literal` · `Parte 6 · Comprensión de lectura inferencial` · `Parte 7 · Texto con espacios (vocabulario y gramática)`.

## Reglas de calidad (las revisa el Dot Auditor)
1. Formato ICFES auténtico: contexto → enunciado → opciones de longitud y estructura parecidas. Nada de "todas las anteriores" ni "ninguna".
2. Una sola respuesta defendible. Resuelve tú mismo cada ítem y su gemela antes de escribirlos; verifica toda cifra.
3. Cada distractor nace de un error real y frecuente de estudiantes (el `porque` lo nombra con precisión).
4. Contextos variados y cercanos: Cali, Valle del Cauca, Pacífico, Colombia, el mundo; ciencia, finanzas personales, tecnología, deporte, cultura. Nombres diversos.
5. Textos 100 % originales o de dominio público (autores fallecidos con obra publicada antes de 1929, citando autor y obra). Nunca copies textos ni preguntas con derechos de autor ni reactivos liberados del ICFES.
6. Nada de datos de actualidad que cambien (cargos actuales, precios del día). Datos históricos y científicos verificables.
7. Lenguaje respetuoso, sin estereotipos. Tono SABI: el error enseña ("El error no nos detiene, nos enseña, nos fortalece y nos hace crecer.").
8. Sin repetir enunciados dentro del archivo; la gemela nunca es igual al ítem.
