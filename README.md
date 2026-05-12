Southpost · Calculadora de Tarifario
Calculadora web interna para generar tarifarios personalizados por cliente, basada en costos reales de operación logística.
📂 Estructura del proyecto
```
southpost-tarifario/
├── index.html    # Estructura de la página
├── styles.css    # Estilos visuales
├── script.js     # Lógica + generación de PDF
└── README.md     # Este archivo
```
🚀 Cómo publicar en GitHub Pages
Paso 1 — Crear el repo
Andá a https://github.com y entrá con tu cuenta.
Click en el botón verde "New" (o "Nuevo repositorio").
Nombre del repo: `southpost-tarifario` (o el que prefieras).
Marcá como Public (necesario para GitHub Pages gratis).
NO tildes "Add a README file" (ya tenemos uno).
Click en Create repository.
Paso 2 — Subir los archivos
Opción A — Vía web (la más fácil):
En tu repo recién creado, click en "uploading an existing file" (o "subir archivo existente").
Arrastrá los 4 archivos: `index.html`, `styles.css`, `script.js`, `README.md`.
Abajo en "Commit changes": escribí algo como "primera versión".
Click en Commit changes.
Opción B — Por línea de comandos (más profesional):
```bash
git clone https://github.com/TU-USUARIO/southpost-tarifario.git
cd southpost-tarifario
# copiar acá los 4 archivos
git add .
git commit -m "primera versión"
git push
```
Paso 3 — Activar GitHub Pages
En el repo, andá a Settings (arriba a la derecha).
Menú izquierdo → Pages.
En "Source": elegí Deploy from a branch.
En "Branch": elegí `main` y carpeta `/ (root)`.
Click en Save.
Esperá 1-2 minutos. Refrescá la página de Settings → Pages.
Aparece la URL del sitio: `https://TU-USUARIO.github.io/southpost-tarifario/`
✅ Listo. Cualquier cambio que hagas a los archivos (commit + push) se publica automáticamente en esa URL.
🔄 Cómo hacer cambios
Cambios chicos (vía web):
Andá al archivo en GitHub (ej: `script.js`).
Click en el ícono de lápiz (Edit).
Hacé los cambios.
Abajo "Commit changes" → escribí qué cambiaste → Commit.
En 1-2 min se publica.
Cambios grandes (con editor en tu compu):
Abrí los archivos con tu editor (VS Code, Sublime, etc.).
Editá lo que quieras.
Subí los cambios con `git add . && git commit -m "qué cambié" && git push`.
💾 Persistencia de datos
La calculadora usa `localStorage` del navegador para guardar todo lo que cargás (costos, capacidades, guías del cliente, etc.). Eso significa:
✅ Los datos se guardan automáticamente y persisten al cerrar el navegador.
⚠️ Los datos quedan en un solo navegador en una sola compu. Si cargás desde tu computadora y después abrís desde otra máquina, no vas a ver los mismos datos.
⚠️ Si limpiás caché del navegador o usás "modo incógnito", se pierden.
🚪 Botón Reset vuelve todo a valores por defecto.
Si más adelante necesitás base de datos compartida (ej: que varias personas del equipo trabajen con los mismos datos), avisame y migramos a Supabase o Firebase.
📝 Funcionamiento
Flujo de uso
Paso 01 — Cargá volumen mensual total y margen objetivo.
Paso 02 — Cargá costos fijos, troncal, y última milla por rangos en cada zona.
Paso 03 — Cargá la capacidad por pallet (cuántas guías de cada rango entran en un pallet).
Paso 04 — Cargá las guías que va a despachar el cliente (matriz 17 rangos × 4 zonas).
Paso 05 — Ajustá el slider de absorción de costos fijos.
Paso 06 — Mirá el tarifario sugerido (se calcula automáticamente).
Paso 07 — Verificá el resumen, P&L y warnings.
Click en Exportar PDF → ingresá el nombre del cliente → se descarga el PDF.
Lógica de cálculo
```
PARA Zona I:
  costo = (fijos_Z1 × absor%) / volumen_total + UM_Z1[rango]

PARA Zonas II/III/IV:
  costo = (fijos_Z1 × absor%) / volumen_total
        + (fijos_Zx × absor%) / volumen_total
        + (troncal_Zx / capacidad_pallet[rango])
        + UM_Zx[rango]

precio = costo / (1 - margen%)
```
🛠️ Tecnologías
HTML / CSS / JavaScript vanilla (sin frameworks)
jsPDF + jsPDF-AutoTable para generar PDFs (cargados desde CDN)
Google Fonts: Fraunces, JetBrains Mono, Manrope
Persistencia: `localStorage` del navegador
📄 Versión
v5.0 — última actualización: mayo 2026
