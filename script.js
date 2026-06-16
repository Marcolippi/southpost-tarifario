/* ====================================================
   SOUTHPOST — Calculadora de tarifario v8 (Aforo)
   ==================================================== */

const FACTOR_AFORO = 250; // 1 m³ = 250 KG aforados (hardcoded)

const ZONAS = ['ZONA I', 'ZONA II', 'ZONA III', 'ZONA IV'];

// Rutas km
const RUTAS = [
  { id: 'A', label: 'Ruta A', km: '0 - 50 km' },
  { id: 'B', label: 'Ruta B', km: '51 - 100 km' },
  { id: 'C', label: 'Ruta C', km: '101 - 150 km' },
  { id: 'D', label: 'Ruta D', km: '151 - 200 km' },
  { id: 'E', label: 'Ruta E', km: '+201 km' },
];

// 18 pesos de la tabla + 1 excedente
const PESOS_TARIFA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50];

// Campos de fijos
const CAMPOS_FIJOS_GENERALES = [
  { key: 'alquiler',    label: 'Alquiler / depósito' },
  { key: 'personal',    label: 'Personal' },
  { key: 'servicios',   label: 'Servicios (luz, agua, internet)' },
  { key: 'combustible', label: 'Combustible / vehículos' },
  { key: 'seguros',     label: 'Seguros e impuestos' },
  { key: 'insumos',     label: 'Insumos (cajas, etiquetas)' },
  { key: 'otros',       label: 'Otros gastos' },
];

// Estado inicial
const DEFAULTS = {
  volTotal: 1000,
  margen: 30,
  absorCot: 100,
  fijosGenerales: {
    alquiler: 800000, personal: 1500000, servicios: 200000, combustible: 300000,
    seguros: 150000, insumos: 100000, otros: 0,
  },
  vehiculos: [
    { id: 'v_moto',   nombre: 'Moto',          m3: 0.3 },
    { id: 'v_util',   nombre: 'Utilitario',     m3: 1.0 },
    { id: 'v_camchi', nombre: 'Camión chico',   m3: 3.0 },
    { id: 'v_cam',    nombre: 'Camión grande',  m3: 6.0 },
  ],
  // matriz [zona][ruta] = {vehiculoId, costoViaje}
  rutas: [
    [ // Zona I
      { vehiculoId: 'v_util',   costoViaje: 100000 },
      { vehiculoId: 'v_util',   costoViaje: 150000 },
      { vehiculoId: 'v_camchi', costoViaje: 250000 },
      { vehiculoId: 'v_camchi', costoViaje: 320000 },
      { vehiculoId: 'v_cam',    costoViaje: 480000 },
    ],
    [ // Zona II
      { vehiculoId: 'v_util',   costoViaje: 130000 },
      { vehiculoId: 'v_util',   costoViaje: 180000 },
      { vehiculoId: 'v_camchi', costoViaje: 290000 },
      { vehiculoId: 'v_camchi', costoViaje: 380000 },
      { vehiculoId: 'v_cam',    costoViaje: 560000 },
    ],
    [ // Zona III
      { vehiculoId: 'v_util',   costoViaje: 160000 },
      { vehiculoId: 'v_util',   costoViaje: 220000 },
      { vehiculoId: 'v_camchi', costoViaje: 340000 },
      { vehiculoId: 'v_camchi', costoViaje: 450000 },
      { vehiculoId: 'v_cam',    costoViaje: 660000 },
    ],
    [ // Zona IV
      { vehiculoId: 'v_util',   costoViaje: 200000 },
      { vehiculoId: 'v_util',   costoViaje: 280000 },
      { vehiculoId: 'v_camchi', costoViaje: 420000 },
      { vehiculoId: 'v_camchi', costoViaje: 560000 },
      { vehiculoId: 'v_cam',    costoViaje: 820000 },
    ],
  ],
};

const STORE_KEY = 'tarifario_southpost_v8';
const HIST_KEY = 'tarifario_southpost_v8_historial';
const HIST_MAX = 50;

let state = loadState();
let zonaActivaTab = 0;

function loadState() {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      const base = JSON.parse(JSON.stringify(DEFAULTS));
      for (const k in parsed) {
        if (k === 'fijosGenerales' && typeof parsed.fijosGenerales === 'object') {
          base.fijosGenerales = { ...base.fijosGenerales, ...parsed.fijosGenerales };
        } else if (k === 'vehiculos' && Array.isArray(parsed.vehiculos)) {
          base.vehiculos = parsed.vehiculos;
        } else if (k === 'rutas' && Array.isArray(parsed.rutas)) {
          for (let z = 0; z < 4; z++) {
            if (parsed.rutas[z]) {
              for (let r = 0; r < 5; r++) {
                if (parsed.rutas[z][r]) base.rutas[z][r] = parsed.rutas[z][r];
              }
            }
          }
        } else {
          base[k] = parsed[k];
        }
      }
      return base;
    }
  } catch (e) { console.error('Load error:', e); }
  return JSON.parse(JSON.stringify(DEFAULTS));
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    document.getElementById('saveState').textContent = '● GUARDADO';
    document.getElementById('saveState').style.color = 'var(--success)';
    document.getElementById('lastUpdate').textContent = 'Última edición: ' + new Date().toLocaleTimeString('es-AR');
  } catch (e) {
    document.getElementById('saveState').textContent = '⚠ NO GUARDADO';
    document.getElementById('saveState').style.color = 'var(--danger)';
  }
}

/* ============= RENDER ============= */
function renderFijosGenerales() {
  const cont = document.getElementById('fijosGenerales');
  let html = '';
  CAMPOS_FIJOS_GENERALES.forEach(f => {
    html += `<div class="input-row">
      <label>${f.label}</label>
      <input type="number" data-campo-fijo="${f.key}" value="${state.fijosGenerales[f.key]||0}" min="0" step="1000">
    </div>`;
  });
  html += `<div class="total-fijos">
    <span class="lbl">Total fijo mensual</span>
    <span class="val" id="totalFijoGeneral">$ 0</span>
  </div>`;
  cont.innerHTML = html;
  cont.querySelectorAll('input[type=number]').forEach(inp => {
    inp.addEventListener('input', e => {
      const k = e.target.dataset.campoFijo;
      state.fijosGenerales[k] = +e.target.value || 0;
      saveState();
      recalc();
    });
  });
}

function renderVehiculos() {
  const tbl = document.getElementById('tablaVehiculos');
  let html = `<thead><tr>
    <th>Vehículo</th>
    <th style="width:120px;">Capacidad m³</th>
    <th style="text-align:right; width:160px;">KG aforados</th>
    <th style="width:100px;">Acción</th>
  </tr></thead><tbody>`;
  state.vehiculos.forEach((v, i) => {
    const kgAf = (v.m3 || 0) * FACTOR_AFORO;
    html += `<tr>
      <td><input type="text" data-veh-i="${i}" data-veh-campo="nombre" value="${escaparHTML(v.nombre)}"></td>
      <td><input type="number" data-veh-i="${i}" data-veh-campo="m3" value="${v.m3}" min="0.01" step="0.1"></td>
      <td class="derived">${kgAf.toLocaleString('es-AR')} KG</td>
      <td><button class="del-btn" onclick="eliminarVehiculo(${i})">Eliminar</button></td>
    </tr>`;
  });
  html += `</tbody>`;
  tbl.innerHTML = html;
  tbl.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = +e.target.dataset.vehI;
      const campo = e.target.dataset.vehCampo;
      if (campo === 'm3') {
        state.vehiculos[i][campo] = +e.target.value || 0;
      } else {
        state.vehiculos[i][campo] = e.target.value;
      }
      saveState();
      renderVehiculos();
      renderZonasRutas(); // refresh dropdowns
      recalc();
    });
  });
}

function agregarVehiculo() {
  const nuevoId = 'v_' + Date.now();
  state.vehiculos.push({ id: nuevoId, nombre: 'Nuevo vehículo', m3: 1.0 });
  saveState();
  renderVehiculos();
  renderZonasRutas();
  recalc();
}

function eliminarVehiculo(i) {
  if (state.vehiculos.length <= 1) {
    toast('Debe quedar al menos un vehículo', true);
    return;
  }
  const id = state.vehiculos[i].id;
  // Verificar si está siendo usado
  let usadoEn = [];
  for (let z = 0; z < 4; z++) {
    for (let r = 0; r < 5; r++) {
      if (state.rutas[z][r].vehiculoId === id) {
        usadoEn.push(`${ZONAS[z]} ${RUTAS[r].label}`);
      }
    }
  }
  if (usadoEn.length > 0) {
    if (!confirm(`Este vehículo está siendo usado en ${usadoEn.length} combinación(es). Si lo eliminás, esas filas van a quedar con un vehículo no válido. ¿Continuar?`)) return;
  }
  state.vehiculos.splice(i, 1);
  saveState();
  renderVehiculos();
  renderZonasRutas();
  recalc();
}

function renderZonasRutas() {
  const cont = document.getElementById('zonasRutas');
  cont.innerHTML = '';
  for (let z = 0; z < 4; z++) {
    const card = document.createElement('div');
    card.className = 'zona-rutas-card' + (z === 0 ? ' hub' : '');
    let html = `<h3>${ZONAS[z]}</h3><div class="subtitle">${z === 0 ? 'Origen / Hub central' : 'Destino · Spoke'}</div>`;
    html += `<table class="rutas-table">
      <thead><tr>
        <th style="width:120px;">Ruta</th>
        <th style="width:220px;">Vehículo</th>
        <th style="width:150px; text-align:right;">Costo viaje</th>
        <th style="text-align:right;">$ / KG aforado</th>
        <th style="text-align:right;">$ / m³</th>
      </tr></thead><tbody>`;
    for (let r = 0; r < 5; r++) {
      const ruta = state.rutas[z][r];
      const veh = state.vehiculos.find(v => v.id === ruta.vehiculoId);
      const m3 = veh ? veh.m3 : 0;
      const kgAf = m3 * FACTOR_AFORO;
      const costoPorKgAf = kgAf > 0 ? ruta.costoViaje / kgAf : 0;
      const costoPorM3 = m3 > 0 ? ruta.costoViaje / m3 : 0;
      html += `<tr>
        <td><span class="ruta-label">${RUTAS[r].label}<span class="ruta-km">${RUTAS[r].km}</span></span></td>
        <td>
          <select data-z="${z}" data-r="${r}" data-campo="vehiculoId">
            ${state.vehiculos.map(v => `<option value="${v.id}" ${v.id === ruta.vehiculoId ? 'selected' : ''}>${escaparHTML(v.nombre)} (${v.m3} m³)</option>`).join('')}
          </select>
        </td>
        <td><input type="number" data-z="${z}" data-r="${r}" data-campo="costoViaje" value="${ruta.costoViaje}" min="0" step="1000"></td>
        <td class="derived">${fmt(costoPorKgAf)}<div class="sub">por KG aforado</div></td>
        <td class="derived">${fmt(costoPorM3)}<div class="sub">por m³</div></td>
      </tr>`;
    }
    html += `</tbody></table>`;
    card.innerHTML = html;
    cont.appendChild(card);
  }

  cont.querySelectorAll('select, input').forEach(el => {
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, e => {
      const z = +e.target.dataset.z;
      const r = +e.target.dataset.r;
      const c = e.target.dataset.campo;
      if (c === 'costoViaje') {
        state.rutas[z][r][c] = +e.target.value || 0;
      } else {
        state.rutas[z][r][c] = e.target.value;
      }
      saveState();
      renderZonasRutas(); // refresh derived columns
      recalc();
    });
  });
}

function renderGlobales() {
  document.getElementById('volTotal').value = state.volTotal;
  document.getElementById('margen').value = state.margen;
  document.getElementById('absorCot').value = state.absorCot;
  document.getElementById('absorCotVal').textContent = state.absorCot;
  document.getElementById('volTotal').addEventListener('input', e => {
    state.volTotal = +e.target.value || 1; saveState(); recalc();
  });
  document.getElementById('margen').addEventListener('input', e => {
    state.margen = +e.target.value || 0; saveState(); recalc();
  });
  document.getElementById('absorCot').addEventListener('input', e => {
    state.absorCot = +e.target.value;
    document.getElementById('absorCotVal').textContent = state.absorCot;
    saveState(); recalc();
  });
}

/* ============= FORMATEO ============= */
function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return '—';
  const sign = n < 0 ? '-' : '';
  return sign + '$ ' + Math.abs(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}
function totalFijoGeneral() {
  let t = 0;
  CAMPOS_FIJOS_GENERALES.forEach(f => t += +state.fijosGenerales[f.key] || 0);
  return t;
}

/* ============= CÁLCULO ============= */
/**
 * Para cada (zona, ruta):
 *   capacidad_kg = m3_veh × 250
 *   costo_por_kg_aforado_variable = costo_viaje / capacidad_kg
 *   precio_por_kg_aforado_variable = costo_por_kg / (1 - margen)
 *
 * Para cada peso de la tabla:
 *   fijos_por_guia = (fijos_totales × absor%) / volumen_total
 *   precio_celda = (fijos_por_guia + peso × costo_por_kg_var) / (1 - margen)
 *                = fijos_por_guia / (1-margen) + peso × precio_por_kg_var
 *
 * Para excedente:
 *   precio_por_kg_excedente = precio_por_kg_aforado_variable (sin fijos)
 *
 * Punto equilibrio (para peso de referencia 25 KG):
 *   ganancia_por_guia = precio - costo_variable
 *   guias_para_cubrir_fijos = fijos / ganancia_por_guia
 */
function recalc() {
  const totFijo = totalFijoGeneral();
  const elTotFijo = document.getElementById('totalFijoGeneral');
  if (elTotFijo) elTotFijo.textContent = fmt(totFijo);

  const margenDec = state.margen / 100;
  const factorPrecio = (1 - margenDec) > 0 ? 1 / (1 - margenDec) : null;
  const fijosPorGuia = (totFijo * state.absorCot / 100) / (state.volTotal || 1);

  // Matriz [zona][ruta] de info y precios
  const datos = []; // por zona, por ruta, por peso
  for (let z = 0; z < 4; z++) {
    const filaZona = [];
    for (let r = 0; r < 5; r++) {
      const ruta = state.rutas[z][r];
      const veh = state.vehiculos.find(v => v.id === ruta.vehiculoId);
      const m3 = veh ? veh.m3 : 0;
      const capKg = m3 * FACTOR_AFORO;
      const costoKgVar = capKg > 0 ? ruta.costoViaje / capKg : 0; // costo variable por KG aforado
      const precioKgVar = factorPrecio !== null ? costoKgVar * factorPrecio : 0;
      const fijosConMargen = factorPrecio !== null ? fijosPorGuia * factorPrecio : 0;
      // Para cada peso
      const precios = PESOS_TARIFA.map(p => fijosConMargen + p * precioKgVar);
      // Excedente: solo variable
      const precioExcedente = precioKgVar;
      filaZona.push({
        vehNombre: veh ? veh.nombre : '—',
        vehM3: m3,
        capKg: capKg,
        costoViaje: ruta.costoViaje,
        costoKgVar: costoKgVar,
        precioKgVar: precioKgVar,
        precios: precios,
        precioExcedente: precioExcedente,
      });
    }
    datos.push(filaZona);
  }

  window._datos = datos;
  window._fijosPorGuia = fijosPorGuia;
  window._totalFijo = totFijo;

  renderTarifariosPorZona(datos);
  renderEquilibrio(datos);
}

function renderZonaTabs() {
  const cont = document.getElementById('zonaTabs');
  let html = '';
  for (let z = 0; z < 4; z++) {
    html += `<button class="zona-tab ${z === zonaActivaTab ? 'active' : ''}" onclick="cambiarZonaTab(${z})">${ZONAS[z]}</button>`;
  }
  cont.innerHTML = html;
}

function cambiarZonaTab(z) {
  zonaActivaTab = z;
  renderZonaTabs();
  renderTarifariosPorZona(window._datos || []);
}

function renderTarifariosPorZona(datos) {
  const cont = document.getElementById('tarifariosPorZona');
  let html = '';
  for (let z = 0; z < 4; z++) {
    html += `<div class="tarifario-final ${z === zonaActivaTab ? 'active' : ''}">`;
    html += `<table class="output"><thead><tr><th style="text-align:left;">Peso aforado</th>`;
    for (let r = 0; r < 5; r++) {
      html += `<th class="ruta-header">${RUTAS[r].label}<br><span style="font-size:9px; opacity:0.7; font-weight:400;">${RUTAS[r].km}</span></th>`;
    }
    html += `</tr></thead><tbody>`;

    // Fila info: vehículo y $/KG
    html += `<tr class="info-row"><td class="range-label" style="font-style:italic; color:#666;">Vehículo</td>`;
    for (let r = 0; r < 5; r++) {
      const d = datos[z][r];
      html += `<td style="text-align:right; font-size:11px; color:#666;">${escaparHTML(d.vehNombre)} (${d.vehM3} m³)</td>`;
    }
    html += `</tr>`;
    html += `<tr class="info-row"><td class="range-label" style="font-style:italic; color:#666;">$ / KG aforado</td>`;
    for (let r = 0; r < 5; r++) {
      const d = datos[z][r];
      html += `<td style="text-align:right; font-size:11px; color:var(--cyan-deep); font-weight:700;">${fmt(d.precioKgVar)}</td>`;
    }
    html += `</tr>`;

    // Filas de pesos
    PESOS_TARIFA.forEach((peso, pi) => {
      html += `<tr><td class="range-label">${peso} KG</td>`;
      for (let r = 0; r < 5; r++) {
        const v = datos[z][r].precios[pi];
        html += `<td class="price">${fmt(v)}</td>`;
      }
      html += `</tr>`;
    });
    // Excedente
    html += `<tr class="excedente-row"><td class="range-label">KG excedente</td>`;
    for (let r = 0; r < 5; r++) {
      const v = datos[z][r].precioExcedente;
      html += `<td class="price">${fmt(v)} <span style="font-size:9px; color:#999;">/ kg</span></td>`;
    }
    html += `</tr>`;
    html += `</tbody></table></div>`;
  }
  cont.innerHTML = html;
}

function renderEquilibrio(datos) {
  const tbl = document.getElementById('tablaEquilibrio');
  const totFijo = totalFijoGeneral();
  if (totFijo <= 0) { tbl.innerHTML = ''; return; }

  // Punto de equilibrio: cuántas guías de 25 KG aforados se necesitan
  // por cada (Zona, Ruta) para cubrir los fijos.
  // ganancia_por_guia = precio_25 - costo_variable_25
  // costo_variable_25 = 25 × costoKgVar
  // guias = ceil(fijos / ganancia)
  const PESO_REF = 25;
  let html = `<thead><tr><th style="text-align:left;">Zona</th>`;
  for (let r = 0; r < 5; r++) {
    html += `<th class="ruta-header">${RUTAS[r].label}</th>`;
  }
  html += `</tr></thead><tbody>`;
  for (let z = 0; z < 4; z++) {
    html += `<tr><td class="range-label">${ZONAS[z]}</td>`;
    for (let r = 0; r < 5; r++) {
      const d = datos[z][r];
      const variable = PESO_REF * d.costoKgVar;
      // El precio a 25 KG ya incluye fijos+margen, pero para equilibrio queremos contribución = precio - variable
      const precio25 = d.precios[PESOS_TARIFA.indexOf(PESO_REF)];
      const contrib = precio25 - variable;
      if (contrib > 0) {
        const guias = Math.ceil(totFijo / contrib);
        html += `<td class="price">${guias.toLocaleString('es-AR')}</td>`;
      } else {
        html += `<td class="infinity">—</td>`;
      }
    }
    html += `</tr>`;
  }
  html += `</tbody>`;
  tbl.innerHTML = html;
}

/* ============= MODALES ============= */
function iniciarExportPDF() {
  document.getElementById('modalClientName').value = 'Tarifario ' + fechaCortaArgentina();
  document.getElementById('modalPDF').classList.add('active');
  setTimeout(() => { const i = document.getElementById('modalClientName'); i.focus(); i.select(); }, 100);
}
function cerrarModal() { document.getElementById('modalPDF').classList.remove('active'); }
function confirmarExportPDF() {
  const t = document.getElementById('modalClientName').value.trim() || ('Tarifario ' + fechaCortaArgentina());
  cerrarModal();
  generarPDF(t);
  archivarTarifario(t);
  exportarExcel(t);
  renderHistorial();
  toast('Tarifario guardado al historial · PDF y Excel descargados');
}
function iniciarGuardarHistorial() {
  document.getElementById('modalGuardarClientName').value = 'Tarifario ' + fechaCortaArgentina();
  document.getElementById('modalGuardar').classList.add('active');
  setTimeout(() => { const i = document.getElementById('modalGuardarClientName'); i.focus(); i.select(); }, 100);
}
function cerrarModalGuardar() { document.getElementById('modalGuardar').classList.remove('active'); }
function confirmarGuardarHistorial() {
  const t = document.getElementById('modalGuardarClientName').value.trim() || ('Tarifario ' + fechaCortaArgentina());
  cerrarModalGuardar();
  archivarTarifario(t);
  exportarExcel(t);
  renderHistorial();
  toast('Tarifario archivado · Excel descargado');
}
document.addEventListener('click', e => {
  if (e.target.id === 'modalPDF') cerrarModal();
  if (e.target.id === 'modalGuardar') cerrarModalGuardar();
  if (e.target.id === 'modalDetalle') cerrarModalDetalle();
});
document.addEventListener('keydown', e => {
  const mPDF = document.getElementById('modalPDF');
  const mG = document.getElementById('modalGuardar');
  const mD = document.getElementById('modalDetalle');
  if (mPDF && mPDF.classList.contains('active')) {
    if (e.key === 'Escape') cerrarModal();
    if (e.key === 'Enter') confirmarExportPDF();
  } else if (mG && mG.classList.contains('active')) {
    if (e.key === 'Escape') cerrarModalGuardar();
    if (e.key === 'Enter') confirmarGuardarHistorial();
  } else if (mD && mD.classList.contains('active')) {
    if (e.key === 'Escape') cerrarModalDetalle();
  }
});

/* ============= FECHAS ============= */
function fechaArgentina() {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date();
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}, ${d.getFullYear()}`;
}
function fechaCortaArgentina() {
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const d = new Date();
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtFechaHumana(iso) {
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

/* ============= PDF ============= */
function generarPDF(titulo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const datos = window._datos || [];
  const pageW = 210;
  const pageH = 297;
  const margin = 15;

  let pageNum = 0;
  const totalPages = 4; // una hoja por zona

  for (let z = 0; z < 4; z++) {
    if (pageNum > 0) doc.addPage();
    pageNum++;

    // Logo + fecha
    const logoX = margin + 4;
    const logoY = margin + 6;
    doc.setFillColor(43, 128, 200);
    doc.circle(logoX, logoY, 2.5, 'F');
    doc.setFillColor(43, 212, 217);
    doc.circle(logoX + 0.6, logoY + 0.6, 1.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(13, 44, 102);
    doc.text('SOUTHPOST', logoX + 5, logoY + 1.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('FECHA DE EMISIÓN', pageW - margin, margin + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(13, 44, 102);
    doc.text(fechaArgentina(), pageW - margin, margin + 9, { align: 'right' });

    doc.setDrawColor(10, 22, 40);
    doc.setLineWidth(0.6);
    doc.line(margin, margin + 14, pageW - margin, margin + 14);

    // Título
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 75, 168);
    doc.text(`TARIFARIO VIGENTE · ${ZONAS[z]}`, pageW / 2, margin + 22, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(13, 44, 102);
    doc.text(titulo, pageW / 2, margin + 30, { align: 'center' });

    // Tabla por zona
    const headers = [['Peso aforado', 'Ruta A\n0-50 km', 'Ruta B\n51-100 km', 'Ruta C\n101-150 km', 'Ruta D\n151-200 km', 'Ruta E\n+201 km']];
    const body = [];

    // Fila info: vehículo
    body.push([
      'Vehículo',
      `${datos[z][0].vehNombre} (${datos[z][0].vehM3} m³)`,
      `${datos[z][1].vehNombre} (${datos[z][1].vehM3} m³)`,
      `${datos[z][2].vehNombre} (${datos[z][2].vehM3} m³)`,
      `${datos[z][3].vehNombre} (${datos[z][3].vehM3} m³)`,
      `${datos[z][4].vehNombre} (${datos[z][4].vehM3} m³)`,
    ]);
    // Fila info: $/KG aforado
    body.push([
      '$ / KG aforado',
      fmt(datos[z][0].precioKgVar),
      fmt(datos[z][1].precioKgVar),
      fmt(datos[z][2].precioKgVar),
      fmt(datos[z][3].precioKgVar),
      fmt(datos[z][4].precioKgVar),
    ]);
    // Filas de pesos
    PESOS_TARIFA.forEach((peso, pi) => {
      body.push([`${peso} KG`, fmt(datos[z][0].precios[pi]), fmt(datos[z][1].precios[pi]), fmt(datos[z][2].precios[pi]), fmt(datos[z][3].precios[pi]), fmt(datos[z][4].precios[pi])]);
    });
    // Excedente
    body.push([
      'KG excedente',
      fmt(datos[z][0].precioExcedente) + ' /kg',
      fmt(datos[z][1].precioExcedente) + ' /kg',
      fmt(datos[z][2].precioExcedente) + ' /kg',
      fmt(datos[z][3].precioExcedente) + ' /kg',
      fmt(datos[z][4].precioExcedente) + ' /kg',
    ]);

    doc.autoTable({
      head: headers, body: body, startY: margin + 36, theme: 'grid', margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.8, lineColor: [197, 210, 227], lineWidth: 0.1, textColor: [13, 44, 102] },
      headStyles: { fillColor: [10, 22, 40], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', halign: 'center', cellPadding: 2.5 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 30, fillColor: [244, 247, 251], fontStyle: 'italic', textColor: [10, 22, 40], fontSize: 8 },
        1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
        2: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
        3: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
        4: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
        5: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [246, 249, 253] },
      didParseCell: function (data) {
        if (data.section === 'head' && data.column.index >= 1) {
          data.cell.styles.fillColor = [13, 44, 102];
        }
        // Filas info (2 primeras): gris claro
        if (data.section === 'body' && data.row.index < 2) {
          data.cell.styles.fillColor = [230, 237, 246];
          data.cell.styles.fontStyle = 'normal';
          data.cell.styles.fontSize = 7;
          if (data.column.index === 0) data.cell.styles.textColor = [102, 102, 102];
        }
        // Última fila (excedente)
        if (data.section === 'body' && data.row.index === body.length - 1) {
          data.cell.styles.fillColor = [228, 247, 248];
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 0) data.cell.styles.textColor = [10, 165, 170];
        }
      },
    });

    const finalY = doc.lastAutoTable.finalY;

    // Aviso
    const warnY = finalY + 6;
    doc.setFillColor(244, 247, 251);
    doc.rect(margin, warnY, pageW - 2 * margin, 9, 'F');
    doc.setFillColor(43, 212, 217);
    doc.rect(margin, warnY, 1.2, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(10, 165, 170);
    doc.text('AVISO', margin + 4, warnY + 3.5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(13, 44, 102);
    doc.text('Tarifario de uso interno · KG aforado: max(peso real, m³ × 250) · No para envío comercial', margin + 4, warnY + 7);

    // Footer
    const footerY = pageH - margin + 2;
    doc.setDrawColor(197, 210, 227);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text('SOUTHPOST · Calculadora de tarifario v8', margin, footerY);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, footerY, { align: 'right' });
  }

  const fechaArchivo = new Date().toISOString().slice(0, 10);
  const safeName = titulo.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
  doc.save(`Tarifario_${safeName || 'general'}_${fechaArchivo}.pdf`);
}

/* ============= HISTORIAL ============= */
function leerHistorial() {
  try { const s = localStorage.getItem(HIST_KEY); if (s) return JSON.parse(s); }
  catch(e) {}
  return [];
}
function guardarHistorialEnDisco(hist) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(hist)); }
  catch(e) { toast('No se pudo guardar al historial: ' + e.message, true); }
}
function crearSnapshot(titulo) {
  return {
    id: 'tar_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    titulo: titulo,
    fecha: new Date().toISOString(),
    estado: JSON.parse(JSON.stringify(state)),
    datos: JSON.parse(JSON.stringify(window._datos || [])),
    totalFijoGeneral: totalFijoGeneral(),
    fijosPorGuia: window._fijosPorGuia || 0,
  };
}
function archivarTarifario(titulo) {
  const snap = crearSnapshot(titulo);
  let hist = leerHistorial();
  hist.unshift(snap);
  if (hist.length > HIST_MAX) hist = hist.slice(0, HIST_MAX);
  guardarHistorialEnDisco(hist);
}
function eliminarTarifario(id) {
  if (!confirm('¿Eliminar este tarifario del historial? Esta acción no se puede deshacer.')) return;
  let hist = leerHistorial();
  hist = hist.filter(c => c.id !== id);
  guardarHistorialEnDisco(hist);
  renderHistorial();
  toast('Tarifario eliminado');
}
function recargarTarifario(id) {
  if (!confirm('¿Reemplazar la configuración actual con los datos de este tarifario archivado?')) return;
  const hist = leerHistorial();
  const cot = hist.find(c => c.id === id);
  if (!cot) return;
  state = JSON.parse(JSON.stringify(cot.estado));
  saveState();
  renderGlobales();
  renderFijosGenerales();
  renderVehiculos();
  renderZonasRutas();
  recalc();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Tarifario re-cargado en la calculadora');
}
function descargarExcelDe(id) {
  const hist = leerHistorial();
  const cot = hist.find(c => c.id === id);
  if (!cot) return;
  exportarExcelDesdeSnapshot(cot);
}
function inicialesTitulo(t) {
  const tokens = (t||'').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '?';
  if (tokens.length === 1) return tokens[0].slice(0,2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
}
function escaparHTML(s) {
  return String(s||'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function renderHistorial() {
  const hist = leerHistorial();
  const empty = document.getElementById('emptyHistorial');
  const list = document.getElementById('historialList');
  if (!list || !empty) return;
  if (hist.length === 0) { empty.style.display = 'block'; list.innerHTML = ''; return; }
  empty.style.display = 'none';
  let html = '';
  hist.forEach(cot => {
    const abs = cot.estado.absorCot || 0;
    const fijos = cot.totalFijoGeneral || 0;
    html += `<div class="hist-item">
      <div class="hist-icon">${inicialesTitulo(cot.titulo)}</div>
      <div class="hist-info">
        <div class="hist-cliente">${escaparHTML(cot.titulo)}</div>
        <div class="hist-meta">
          <span>${fmtFechaHumana(cot.fecha)}</span>
          <span>fijos <strong>${fmt(fijos)}</strong></span>
          <span>absorción <strong>${abs}%</strong></span>
          <span>margen <strong>${cot.estado.margen||0}%</strong></span>
        </div>
      </div>
      <div class="hist-actions">
        <button class="hist-btn" onclick="verDetalleTarifario('${cot.id}')">Ver detalle</button>
        <button class="hist-btn primary" onclick="recargarTarifario('${cot.id}')">Re-cargar</button>
        <button class="hist-btn" onclick="descargarExcelDe('${cot.id}')">Excel</button>
        <button class="hist-btn danger" onclick="eliminarTarifario('${cot.id}')">Eliminar</button>
      </div>
    </div>`;
  });
  list.innerHTML = html;
}

/* ============= DETALLE MODAL ============= */
function verDetalleTarifario(id) {
  const hist = leerHistorial();
  const cot = hist.find(c => c.id === id);
  if (!cot) return;
  document.getElementById('detalleTitulo').textContent = cot.titulo;
  document.getElementById('detalleFecha').textContent = 'Archivado el ' + fmtFechaHumana(cot.fecha);
  const e = cot.estado;
  let html = '';
  // Parámetros
  html += `<div class="detalle-block"><h4>Parámetros</h4><table class="detalle-table"><tbody>
    <tr><td>Volumen mensual</td><td>${(e.volTotal||0).toLocaleString('es-AR')}</td></tr>
    <tr><td>Margen objetivo</td><td>${e.margen||0}%</td></tr>
    <tr><td>% absorción</td><td>${e.absorCot||0}%</td></tr>
    <tr><td>Total fijo mensual</td><td>${fmt(cot.totalFijoGeneral||0)}</td></tr>
    <tr><td>Fijos por guía (con absorción)</td><td>${fmt(cot.fijosPorGuia||0)}</td></tr>
  </tbody></table></div>`;
  // Vehículos
  html += `<div class="detalle-block"><h4>Vehículos</h4><table class="detalle-table"><thead><tr><th>Nombre</th><th>m³</th><th>KG aforados</th></tr></thead><tbody>`;
  (e.vehiculos||[]).forEach(v => {
    html += `<tr><td>${escaparHTML(v.nombre)}</td><td>${v.m3} m³</td><td>${(v.m3 * FACTOR_AFORO).toLocaleString('es-AR')} KG</td></tr>`;
  });
  html += `</tbody></table></div>`;
  // Rutas por zona
  for (let z = 0; z < 4; z++) {
    html += `<div class="detalle-block"><h4>${ZONAS[z]} — Costos por ruta</h4><table class="detalle-table"><thead><tr><th>Ruta</th><th>Vehículo</th><th>Costo viaje</th><th>$/KG af.</th></tr></thead><tbody>`;
    for (let r = 0; r < 5; r++) {
      const ru = e.rutas[z][r];
      const veh = (e.vehiculos||[]).find(v => v.id === ru.vehiculoId);
      const d = (cot.datos && cot.datos[z]) ? cot.datos[z][r] : null;
      html += `<tr><td>${RUTAS[r].label} (${RUTAS[r].km})</td><td>${veh ? escaparHTML(veh.nombre) : '—'}</td><td>${fmt(ru.costoViaje)}</td><td>${d ? fmt(d.precioKgVar) : '—'}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }
  document.getElementById('detalleContent').innerHTML = html;
  document.getElementById('modalDetalle').classList.add('active');
}
function cerrarModalDetalle() { document.getElementById('modalDetalle').classList.remove('active'); }

/* ============= EXCEL ============= */
function exportarExcel(titulo) {
  const snap = crearSnapshot(titulo);
  exportarExcelDesdeSnapshot(snap);
}
function exportarExcelDesdeSnapshot(cot) {
  if (typeof XLSX === 'undefined') { toast('Librería Excel no cargada', true); return; }
  const wb = XLSX.utils.book_new();
  const e = cot.estado;
  const datos = cot.datos || [];

  // Hoja 1: Resumen
  const fechaArr = new Date(cot.fecha).toLocaleString('es-AR');
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['SOUTHPOST · Tarifario archivado (modelo aforo)'],
    [],
    ['Título', cot.titulo],
    ['Fecha y hora', fechaArr],
    [],
    ['Factor de aforo', `1 m³ = ${FACTOR_AFORO} KG`],
    ['Volumen mensual', e.volTotal],
    ['Margen objetivo', (e.margen||0) + '%'],
    ['% absorción', (e.absorCot||0) + '%'],
    ['Total fijo mensual', cot.totalFijoGeneral||0],
    ['Fijos por guía', cot.fijosPorGuia||0],
  ]);
  ws1['!cols'] = [{wch: 30}, {wch: 22}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // Hoja 2: Fijos
  const fdata = [['Concepto', 'Mensual']];
  CAMPOS_FIJOS_GENERALES.forEach(f => fdata.push([f.label, +(e.fijosGenerales[f.key])||0]));
  fdata.push(['TOTAL', cot.totalFijoGeneral||0]);
  const ws2 = XLSX.utils.aoa_to_sheet(fdata);
  ws2['!cols'] = [{wch: 35}, {wch: 16}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Costos fijos');

  // Hoja 3: Vehículos
  const vdata = [['Nombre', 'm³', 'KG aforados']];
  (e.vehiculos||[]).forEach(v => vdata.push([v.nombre, v.m3, v.m3 * FACTOR_AFORO]));
  const ws3 = XLSX.utils.aoa_to_sheet(vdata);
  ws3['!cols'] = [{wch: 28}, {wch: 10}, {wch: 14}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Vehículos');

  // Hoja 4: Costos por ruta
  const rdata = [['Zona', 'Ruta', 'KM', 'Vehículo', 'm³', 'Costo viaje', 'KG aforado', '$ / KG aforado', '$ / m³']];
  for (let z = 0; z < 4; z++) {
    for (let r = 0; r < 5; r++) {
      const ru = e.rutas[z][r];
      const veh = (e.vehiculos||[]).find(v => v.id === ru.vehiculoId);
      const m3 = veh ? veh.m3 : 0;
      const capKg = m3 * FACTOR_AFORO;
      const costoKg = capKg > 0 ? ru.costoViaje / capKg : 0;
      const costoM3 = m3 > 0 ? ru.costoViaje / m3 : 0;
      rdata.push([ZONAS[z], RUTAS[r].label, RUTAS[r].km, veh ? veh.nombre : '—', m3, ru.costoViaje, capKg, +(costoKg.toFixed(2)), +(costoM3.toFixed(2))]);
    }
  }
  const ws4 = XLSX.utils.aoa_to_sheet(rdata);
  ws4['!cols'] = [{wch: 10}, {wch: 10}, {wch: 14}, {wch: 22}, {wch: 8}, {wch: 14}, {wch: 14}, {wch: 16}, {wch: 14}];
  XLSX.utils.book_append_sheet(wb, ws4, 'Costos por ruta');

  // Hoja 5: Tarifario por zona (las 4 zonas en una sola hoja)
  const tdata = [['Zona', 'Peso', 'Ruta A', 'Ruta B', 'Ruta C', 'Ruta D', 'Ruta E']];
  for (let z = 0; z < 4; z++) {
    PESOS_TARIFA.forEach((peso, pi) => {
      const fila = [ZONAS[z], `${peso} KG`];
      for (let r = 0; r < 5; r++) fila.push(+(datos[z][r].precios[pi].toFixed(2)));
      tdata.push(fila);
    });
    const filaEx = [ZONAS[z], 'KG excedente ($/kg)'];
    for (let r = 0; r < 5; r++) filaEx.push(+(datos[z][r].precioExcedente.toFixed(2)));
    tdata.push(filaEx);
  }
  const ws5 = XLSX.utils.aoa_to_sheet(tdata);
  ws5['!cols'] = [{wch: 10}, {wch: 22}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 14}];
  XLSX.utils.book_append_sheet(wb, ws5, 'Tarifario sugerido');

  const fechaArchivo = new Date(cot.fecha).toISOString().slice(0, 10);
  const safeName = String(cot.titulo).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
  XLSX.writeFile(wb, `Tarifario_${safeName || 'general'}_${fechaArchivo}.xlsx`);
}

/* ============= TOAST ============= */
let _toastTimer = null;
function toast(msg, isError) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('danger', !!isError);
  el.classList.add('active');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('active'), 3500);
}

/* ============= RESET ============= */
function resetAll() {
  if (!confirm('¿Estás seguro? Se van a borrar los datos cargados y volver a los valores por defecto. (El historial NO se borra)')) return;
  state = JSON.parse(JSON.stringify(DEFAULTS));
  saveState();
  renderGlobales();
  renderFijosGenerales();
  renderVehiculos();
  renderZonasRutas();
  recalc();
  toast('Datos reseteados');
}

/* ============= INIT ============= */
renderGlobales();
renderFijosGenerales();
renderVehiculos();
renderZonasRutas();
renderZonaTabs();
renderHistorial();
recalc();
document.getElementById('lastUpdate').textContent = 'Cargado: ' + new Date().toLocaleTimeString('es-AR');
