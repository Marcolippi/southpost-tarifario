/* ====================================================
   SOUTHPOST — Calculadora de tarifario v7
   ==================================================== */

const ZONAS = ['ZONA I', 'ZONA II', 'ZONA III', 'ZONA IV'];

// 17 rangos de peso para capacidades por pallet (sin cambios)
const RANGOS_CAPACIDAD = [
  { nombre: '0,1 - 1 KG',     min: 0.1,    max: 1     },
  { nombre: '1,1 - 3 KG',     min: 1.1,    max: 3     },
  { nombre: '3,1 - 5 KG',     min: 3.1,    max: 5     },
  { nombre: '5,1 - 7 KG',     min: 5.1,    max: 7     },
  { nombre: '7,1 - 10 KG',    min: 7.1,    max: 10    },
  { nombre: '10,1 - 15 KG',   min: 10.1,   max: 15    },
  { nombre: '15,1 - 20 KG',   min: 15.1,   max: 20    },
  { nombre: '20,1 - 25 KG',   min: 20.1,   max: 25    },
  { nombre: '25,1 - 30 KG',   min: 25.1,   max: 30    },
  { nombre: '30,1 - 40 KG',   min: 30.1,   max: 40    },
  { nombre: '40,1 - 50 KG',   min: 40.1,   max: 50    },
  { nombre: '50,1 - 60 KG',   min: 50.1,   max: 60    },
  { nombre: '60,1 - 80 KG',   min: 60.1,   max: 80    },
  { nombre: '80,1 - 100 KG',  min: 80.1,   max: 100   },
  { nombre: '100,1 - 150 KG', min: 100.1,  max: 150   },
  { nombre: '150,1 - 200 KG', min: 150.1,  max: 200   },
  { nombre: '200,1 - 500 KG', min: 200.1,  max: 500   },
];

// 13 pesos discretos del tarifario + 1 fila "Excedente"
const PESOS_TARIFA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25];

// Mapeo peso discreto → índice del rango de capacidad correspondiente
function indiceCapacidadParaPeso(peso) {
  for (let i = 0; i < RANGOS_CAPACIDAD.length; i++) {
    if (peso <= RANGOS_CAPACIDAD[i].max + 1e-9) return i;
  }
  return RANGOS_CAPACIDAD.length - 1;
}

// Campos de costos fijos generales
const CAMPOS_FIJOS_GENERALES = [
  { key: 'alquiler',    label: 'Alquiler / depósito' },
  { key: 'personal',    label: 'Personal' },
  { key: 'servicios',   label: 'Servicios (luz, agua, internet)' },
  { key: 'combustible', label: 'Combustible / vehículos' },
  { key: 'seguros',     label: 'Seguros e impuestos' },
  { key: 'insumos',     label: 'Insumos (cajas, etiquetas)' },
  { key: 'otros',       label: 'Otros gastos' },
];

// Estado inicial por defecto
const DEFAULTS = {
  volTotal: 1000,
  margen: 30,
  absorCot: 100,
  fijosGenerales: {
    alquiler: 800000,
    personal: 1500000,
    servicios: 200000,
    combustible: 300000,
    seguros: 150000,
    insumos: 100000,
    otros: 0,
  },
  // Por zona: troncal (no para Z.I) + um (1..25) + excedente
  zonas: [
    // Zona I - no tiene troncal
    {
      troncal: 0,
      um: { 1: 4000, 2: 4500, 3: 5000, 4: 5500, 5: 6000, 6: 6500, 7: 7000, 8: 7500, 9: 8000, 10: 8500, 15: 11000, 20: 14000, 25: 17000 },
      excedente: 700,
    },
    // Zona II
    {
      troncal: 80000,
      um: { 1: 6000, 2: 6800, 3: 7500, 4: 8200, 5: 9000, 6: 9800, 7: 10500, 8: 11200, 9: 12000, 10: 12800, 15: 16500, 20: 21000, 25: 25500 },
      excedente: 1000,
    },
    // Zona III
    {
      troncal: 120000,
      um: { 1: 8000, 2: 9000, 3: 10000, 4: 11000, 5: 12000, 6: 13000, 7: 14000, 8: 15000, 9: 16000, 10: 17000, 15: 22000, 20: 28000, 25: 34000 },
      excedente: 1400,
    },
    // Zona IV
    {
      troncal: 200000,
      um: { 1: 12000, 2: 13500, 3: 15000, 4: 16500, 5: 18000, 6: 19500, 7: 21000, 8: 22500, 9: 24000, 10: 25500, 15: 33000, 20: 42000, 25: 51000 },
      excedente: 2100,
    },
  ],
  // Capacidades por pallet (17 rangos × 3 zonas destino)
  capacidades: [
    [120, 60, 40, 30, 22, 16, 12, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5, 1],
    [120, 60, 40, 30, 22, 16, 12, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5, 1],
    [120, 60, 40, 30, 22, 16, 12, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5, 1],
  ],
};

const STORE_KEY = 'tarifario_southpost_v7';
const HIST_KEY = 'tarifario_southpost_v7_historial';
const HIST_MAX = 50;

let state = loadState();

function loadState() {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      const base = JSON.parse(JSON.stringify(DEFAULTS));
      // Merge profundo
      for (const k in parsed) {
        if (k === 'fijosGenerales' && typeof parsed.fijosGenerales === 'object') {
          base.fijosGenerales = { ...base.fijosGenerales, ...parsed.fijosGenerales };
        } else if (k === 'zonas' && Array.isArray(parsed.zonas)) {
          for (let z = 0; z < base.zonas.length; z++) {
            if (parsed.zonas[z]) {
              base.zonas[z].troncal = parsed.zonas[z].troncal ?? base.zonas[z].troncal;
              base.zonas[z].excedente = parsed.zonas[z].excedente ?? base.zonas[z].excedente;
              if (parsed.zonas[z].um) {
                base.zonas[z].um = { ...base.zonas[z].um, ...parsed.zonas[z].um };
              }
            }
          }
        } else if (k === 'capacidades' && Array.isArray(parsed.capacidades)) {
          for (let z = 0; z < base.capacidades.length; z++) {
            const guardadas = parsed.capacidades[z] || [];
            for (let r = 0; r < base.capacidades[z].length; r++) {
              if (guardadas[r] !== undefined) base.capacidades[z][r] = guardadas[r];
            }
          }
        } else {
          base[k] = parsed[k];
        }
      }
      return base;
    }
  } catch (e) { console.error('Load state error:', e); }
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

/* ====================================================
   RENDER — INPUTS
   ==================================================== */
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

function renderZonas() {
  const grid = document.getElementById('zonasGrid');
  grid.innerHTML = '';
  for (let z = 0; z < 4; z++) {
    const card = document.createElement('div');
    card.className = 'zona-card' + (z === 0 ? ' hub' : '');
    let html = `<h3>${ZONAS[z]}</h3><div class="subtitle">${z === 0 ? 'Origen / Hub central' : 'Destino · Spoke'}</div>`;

    // Troncal (solo zonas destino)
    if (z > 0) {
      html += `<div class="group-label">Troncal</div>`;
      html += `<div class="input-row">
        <label>Costo por pallet (desde Z.I)</label>
        <input type="number" data-zona="${z}" data-campo="troncal" value="${state.zonas[z].troncal || 0}" min="0" step="1000">
      </div>`;
    }

    // Última milla por peso
    html += `<div class="group-label">Última milla por kilo ($/guía)</div>`;
    html += `<div class="um-rows-grid">`;
    PESOS_TARIFA.forEach(p => {
      const v = state.zonas[z].um[p] || 0;
      html += `<div class="um-grid">
        <label>${p} KG</label>
        <input type="number" data-zona="${z}" data-um="${p}" value="${v}" min="0" step="100">
      </div>`;
    });
    html += `</div>`;

    // Excedente
    html += `<div class="excedente-row um-grid">
      <label>KG excedente · $/kg extra</label>
      <input type="number" data-zona="${z}" data-campo="excedente" value="${state.zonas[z].excedente || 0}" min="0" step="50">
    </div>`;

    card.innerHTML = html;
    grid.appendChild(card);
  }

  grid.querySelectorAll('input[type=number]').forEach(inp => {
    inp.addEventListener('input', e => {
      const z = +e.target.dataset.zona;
      const campo = e.target.dataset.campo;
      const um = e.target.dataset.um;
      if (um) {
        state.zonas[z].um[um] = +e.target.value || 0;
      } else if (campo === 'troncal') {
        state.zonas[z].troncal = +e.target.value || 0;
      } else if (campo === 'excedente') {
        state.zonas[z].excedente = +e.target.value || 0;
      }
      saveState();
      recalc();
    });
  });
}

function renderCapacidades() {
  const tbl = document.getElementById('tablaCapacidad');
  let html = `<thead><tr><th style="text-align:left;">Rango de peso</th>`;
  for (let z = 1; z < 4; z++) {
    html += `<th>${ZONAS[z]}<br><span style="font-size:9px; opacity:0.6; font-weight:400;">guías / pallet</span></th>`;
  }
  html += `</tr></thead><tbody>`;
  RANGOS_CAPACIDAD.forEach((r, ri) => {
    html += `<tr><td class="range-label">${r.nombre}</td>`;
    for (let z = 0; z < 3; z++) {
      const v = state.capacidades[z][ri];
      html += `<td><input type="number" data-zonaDest="${z}" data-rango="${ri}" value="${v}" min="0" step="0.5"></td>`;
    }
    html += `</tr>`;
  });
  html += `</tbody>`;
  tbl.innerHTML = html;

  tbl.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
      const z = +e.target.dataset.zonaDest;
      const r = +e.target.dataset.rango;
      state.capacidades[z][r] = +e.target.value || 0;
      saveState();
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

/* ====================================================
   FORMATEO
   ==================================================== */
function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return '—';
  const sign = n < 0 ? '-' : '';
  return sign + '$ ' + Math.abs(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}
function fmtPct(n) {
  if (!isFinite(n) || isNaN(n)) return '—';
  return n.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + '%';
}

function totalFijoGeneral() {
  let t = 0;
  CAMPOS_FIJOS_GENERALES.forEach(f => t += +state.fijosGenerales[f.key] || 0);
  return t;
}

/* ====================================================
   CÁLCULO PRINCIPAL
   ==================================================== */

/**
 * Costo por guía en (peso, zona).
 *
 *   fijos_por_guia = (fijos_totales × absor%) / volumen_total
 *   troncal_por_guia (solo zonas destino) = troncal_zona / capacidad_pallet[peso]
 *   ultima_milla:
 *     - si peso es un valor de PESOS_TARIFA → UM[zona][peso]
 *     - si peso es "excedente" → no se calcula con esta función (ver costoExcedentePorKg)
 *
 *   costo_total = fijos + troncal + UM
 */
function costoPorGuia(peso, zonaIdx) {
  const f = state.absorCot / 100;
  const volTotal = state.volTotal || 1;

  const fijosTot = totalFijoGeneral();
  const fijosPorGuia = (fijosTot * f) / volTotal;

  let troncalPorGuia = 0;
  if (zonaIdx > 0) {
    const idxCap = indiceCapacidadParaPeso(peso);
    const cap = state.capacidades[zonaIdx - 1][idxCap] || 0;
    const troncal = +state.zonas[zonaIdx].troncal || 0;
    troncalPorGuia = cap > 0 ? troncal / cap : 0;
  }

  const um = +state.zonas[zonaIdx].um[peso] || 0;

  return fijosPorGuia + troncalPorGuia + um;
}

/**
 * Costo "por kilo excedente" en una zona (sin troncal, sin fijos).
 * Por acuerdo: el excedente es solo el costo lineal cargado a mano.
 */
function costoExcedentePorKg(zonaIdx) {
  return +state.zonas[zonaIdx].excedente || 0;
}

function recalc() {
  // Subtotal fijos generales
  const totFijo = totalFijoGeneral();
  const elTotFijo = document.getElementById('totalFijoGeneral');
  if (elTotFijo) elTotFijo.textContent = fmt(totFijo);

  const margenDecimal = state.margen / 100;
  const factorPrecio = (1 - margenDecimal) > 0 ? 1 / (1 - margenDecimal) : null;

  // Matrices: filas = pesos (13) + excedente, columnas = 4 zonas
  const matCostos = [];
  const matPrecios = [];
  const matGanancias = [];

  PESOS_TARIFA.forEach(peso => {
    const filaC = [], filaP = [], filaG = [];
    for (let z = 0; z < 4; z++) {
      const c = costoPorGuia(peso, z);
      const p = factorPrecio !== null ? c * factorPrecio : null;
      const g = p !== null ? p - c : null;
      filaC.push(c); filaP.push(p); filaG.push(g);
    }
    matCostos.push(filaC); matPrecios.push(filaP); matGanancias.push(filaG);
  });

  // Fila excedente
  const filaExC = [], filaExP = [], filaExG = [];
  for (let z = 0; z < 4; z++) {
    const cExc = costoExcedentePorKg(z); // costo por KG adicional
    const pExc = factorPrecio !== null ? cExc * factorPrecio : null;
    filaExC.push(cExc); filaExP.push(pExc); filaExG.push(pExc !== null ? pExc - cExc : null);
  }
  matCostos.push(filaExC); matPrecios.push(filaExP); matGanancias.push(filaExG);

  window._matCostos = matCostos;
  window._matPrecios = matPrecios;
  window._matGanancias = matGanancias;

  renderTabla('tablaPrecios', matPrecios, 'precio');
  renderTabla('tablaCostos', matCostos, 'costo');
  renderTabla('tablaGanancia', matGanancias, 'precio');

  // PUNTO DE EQUILIBRIO
  // Para los 13 pesos: guias_necesarias = fijos / (precio - costo_variable)
  // donde costo_variable = troncal + UM (sin fijos prorrateados)
  // Para "excedente": no aplica (es por kilo, no por guía).
  const matEquilibrio = [];
  PESOS_TARIFA.forEach((peso, pi) => {
    const fila = [];
    for (let z = 0; z < 4; z++) {
      // costo variable real (sin fijos):
      let troncal = 0;
      if (z > 0) {
        const idxCap = indiceCapacidadParaPeso(peso);
        const cap = state.capacidades[z-1][idxCap] || 0;
        const t = +state.zonas[z].troncal || 0;
        troncal = cap > 0 ? t / cap : 0;
      }
      const um = +state.zonas[z].um[peso] || 0;
      const variable = troncal + um;
      const precio = matPrecios[pi][z];
      const contribucion = precio - variable;
      if (contribucion > 0) {
        fila.push(Math.ceil(totFijo / contribucion));
      } else {
        fila.push(null); // contribución negativa = nunca llega
      }
    }
    matEquilibrio.push(fila);
  });
  window._matEquilibrio = matEquilibrio;
  renderTablaEquilibrio(matEquilibrio);
}

function renderTabla(id, matriz, tipo) {
  const tbl = document.getElementById(id);
  let html = `<thead><tr><th style="text-align:left;">Peso</th>`;
  for (let z = 0; z < 4; z++) {
    html += `<th class="zone-header${z === 0 ? ' hub' : ''}">${ZONAS[z]}</th>`;
  }
  html += `</tr></thead><tbody>`;
  // Filas de pesos 1..25
  PESOS_TARIFA.forEach((peso, pi) => {
    html += `<tr><td class="range-label">${peso} KG</td>`;
    for (let z = 0; z < 4; z++) {
      const v = matriz[pi][z];
      const cls = tipo === 'costo' ? 'cost-cell' : 'price';
      html += `<td class="${cls}">${fmt(v)}</td>`;
    }
    html += `</tr>`;
  });
  // Fila Excedente
  const exIdx = PESOS_TARIFA.length;
  html += `<tr class="excedente-row"><td class="range-label">KG excedente</td>`;
  for (let z = 0; z < 4; z++) {
    const v = matriz[exIdx][z];
    const cls = tipo === 'costo' ? 'cost-cell' : 'price';
    html += `<td class="${cls}">${fmt(v)} <span style="font-size:9px; color:#999;">/ kg</span></td>`;
  }
  html += `</tr></tbody>`;
  tbl.innerHTML = html;
}

function renderTablaEquilibrio(matriz) {
  const tbl = document.getElementById('tablaEquilibrio');
  if (!tbl) return;
  let html = `<thead><tr><th style="text-align:left;">Peso</th>`;
  for (let z = 0; z < 4; z++) {
    html += `<th class="zone-header${z === 0 ? ' hub' : ''}">${ZONAS[z]}</th>`;
  }
  html += `</tr></thead><tbody>`;
  PESOS_TARIFA.forEach((peso, pi) => {
    html += `<tr><td class="range-label">${peso} KG</td>`;
    for (let z = 0; z < 4; z++) {
      const g = matriz[pi][z];
      if (g === null || !isFinite(g)) {
        html += `<td class="infinity">— sin contribución</td>`;
      } else {
        html += `<td class="price">${g.toLocaleString('es-AR')} <span class="unit">guías</span></td>`;
      }
    }
    html += `</tr>`;
  });
  html += `</tbody>`;
  tbl.innerHTML = html;
}

function showTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + id));
}

/* ====================================================
   MODAL — Exportar PDF
   ==================================================== */
function iniciarExportPDF() {
  const sugerido = 'Tarifario ' + fechaCortaArgentina();
  document.getElementById('modalClientName').value = sugerido;
  document.getElementById('modalPDF').classList.add('active');
  setTimeout(() => {
    const inp = document.getElementById('modalClientName');
    inp.focus();
    inp.select();
  }, 100);
}
function cerrarModal() {
  document.getElementById('modalPDF').classList.remove('active');
}
function confirmarExportPDF() {
  const nombre = document.getElementById('modalClientName').value.trim();
  cerrarModal();
  const titulo = nombre || ('Tarifario ' + fechaCortaArgentina());
  generarPDF(titulo);
  archivarTarifario(titulo);
  exportarExcel(titulo);
  renderHistorial();
  toast('Tarifario guardado al historial · PDF y Excel descargados');
}

function iniciarGuardarHistorial() {
  const sugerido = 'Tarifario ' + fechaCortaArgentina();
  document.getElementById('modalGuardarClientName').value = sugerido;
  document.getElementById('modalGuardar').classList.add('active');
  setTimeout(() => {
    const inp = document.getElementById('modalGuardarClientName');
    inp.focus();
    inp.select();
  }, 100);
}
function cerrarModalGuardar() {
  document.getElementById('modalGuardar').classList.remove('active');
}
function confirmarGuardarHistorial() {
  const nombre = document.getElementById('modalGuardarClientName').value.trim();
  cerrarModalGuardar();
  const titulo = nombre || ('Tarifario ' + fechaCortaArgentina());
  archivarTarifario(titulo);
  exportarExcel(titulo);
  renderHistorial();
  toast('Tarifario archivado · Excel descargado');
}

// Listeners de cierre modal
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

/* ====================================================
   FECHAS
   ==================================================== */
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

/* ====================================================
   GENERAR PDF
   ==================================================== */
function generarPDF(titulo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;
  const margin = 15;

  // Logo
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

  // Fecha derecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('FECHA DE EMISIÓN', pageW - margin, margin + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(13, 44, 102);
  doc.text(fechaArgentina(), pageW - margin, margin + 9, { align: 'right' });

  // Separador
  doc.setDrawColor(10, 22, 40);
  doc.setLineWidth(0.6);
  doc.line(margin, margin + 14, pageW - margin, margin + 14);

  // Título
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 75, 168);
  doc.text('TARIFARIO VIGENTE', pageW / 2, margin + 22, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(13, 44, 102);
  doc.text(titulo, pageW / 2, margin + 31, { align: 'center' });

  // Tabla
  const matPrecios = window._matPrecios || [];
  const headers = [['Peso', 'Z. I', 'Z. II', 'Z. III', 'Z. IV']];
  const body = [];
  PESOS_TARIFA.forEach((peso, pi) => {
    const fila = [`${peso} KG`];
    for (let z = 0; z < 4; z++) {
      fila.push(fmt(matPrecios[pi] ? matPrecios[pi][z] : 0));
    }
    body.push(fila);
  });
  // Fila excedente
  const ex = matPrecios[PESOS_TARIFA.length] || [];
  const filaEx = ['KG excedente'];
  for (let z = 0; z < 4; z++) filaEx.push(fmt(ex[z] || 0) + ' / kg');
  body.push(filaEx);

  doc.autoTable({
    head: headers,
    body: body,
    startY: margin + 38,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2,
      lineColor: [197, 210, 227],
      lineWidth: 0.1,
      textColor: [13, 44, 102],
    },
    headStyles: {
      fillColor: [10, 22, 40],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'right',
      cellPadding: 2.5,
    },
    columnStyles: {
      0: {
        halign: 'left',
        cellWidth: 38,
        fillColor: [244, 247, 251],
        fontStyle: 'italic',
        textColor: [10, 22, 40],
        fontSize: 10,
      },
      1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      3: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [246, 249, 253] },
    didParseCell: function (data) {
      if (data.section === 'head') {
        if (data.column.index === 1) data.cell.styles.fillColor = [10, 165, 170];
        else if (data.column.index >= 2) data.cell.styles.fillColor = [13, 44, 102];
      }
      // Fila excedente (última fila del body)
      if (data.section === 'body' && data.row.index === body.length - 1) {
        data.cell.styles.fillColor = [228, 247, 248];
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 0) {
          data.cell.styles.textColor = [10, 165, 170];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY;

  // Aviso
  const warnY = finalY + 8;
  doc.setFillColor(244, 247, 251);
  doc.rect(margin, warnY, pageW - 2 * margin, 11, 'F');
  doc.setFillColor(43, 212, 217);
  doc.rect(margin, warnY, 1.2, 11, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(10, 165, 170);
  doc.text('AVISO', margin + 4, warnY + 4);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(13, 44, 102);
  doc.text('Tarifario de uso interno · No para envío comercial', margin + 4, warnY + 8.5);

  // Pie
  const footerY = pageH - margin + 2;
  doc.setDrawColor(197, 210, 227);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text('SOUTHPOST · Calculadora de tarifario v7', margin, footerY);
  doc.text('Página 1 de 1', pageW - margin, footerY, { align: 'right' });

  // Guardar
  const fechaArchivo = new Date().toISOString().slice(0, 10);
  const safeName = titulo.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
  doc.save(`Tarifario_${safeName || 'general'}_${fechaArchivo}.pdf`);
}

/* ====================================================
   HISTORIAL — Snapshot, storage, render
   ==================================================== */
function leerHistorial() {
  try {
    const s = localStorage.getItem(HIST_KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
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
    matPrecios: JSON.parse(JSON.stringify(window._matPrecios || [])),
    matCostos: JSON.parse(JSON.stringify(window._matCostos || [])),
    matEquilibrio: JSON.parse(JSON.stringify(window._matEquilibrio || [])),
    totalFijoGeneral: totalFijoGeneral(),
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
  if (!confirm('¿Reemplazar la configuración actual con los datos de este tarifario archivado? Los cambios sin guardar se perderán.')) return;
  const hist = leerHistorial();
  const cot = hist.find(c => c.id === id);
  if (!cot) return;
  state = JSON.parse(JSON.stringify(cot.estado));
  saveState();
  renderGlobales();
  renderFijosGenerales();
  renderZonas();
  renderCapacidades();
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
  return String(s||'').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

function renderHistorial() {
  const hist = leerHistorial();
  const empty = document.getElementById('emptyHistorial');
  const list = document.getElementById('historialList');
  if (!list || !empty) return;
  if (hist.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '';
    return;
  }
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

/* ====================================================
   HISTORIAL — Detalle (modal)
   ==================================================== */
function verDetalleTarifario(id) {
  const hist = leerHistorial();
  const cot = hist.find(c => c.id === id);
  if (!cot) return;

  document.getElementById('detalleTitulo').textContent = cot.titulo;
  document.getElementById('detalleFecha').textContent = 'Archivado el ' + fmtFechaHumana(cot.fecha);

  const e = cot.estado;
  let html = '';

  // Parámetros
  html += `<div class="detalle-block">
    <h4>Parámetros</h4>
    <div class="detalle-grid">
      <div class="label-d">Volumen mensual total</div><div class="value-d">${(e.volTotal||0).toLocaleString('es-AR')}</div>
      <div class="label-d">Margen objetivo</div><div class="value-d">${e.margen||0}%</div>
      <div class="label-d">% absorción</div><div class="value-d">${e.absorCot||0}%</div>
      <div class="label-d">Total fijo mensual</div><div class="value-d">${fmt(cot.totalFijoGeneral||0)}</div>
    </div>
  </div>`;

  // Fijos generales
  html += `<div class="detalle-block"><h4>Costos fijos generales</h4>`;
  html += `<table class="detalle-table"><tbody>`;
  CAMPOS_FIJOS_GENERALES.forEach(f => {
    const v = e.fijosGenerales ? e.fijosGenerales[f.key] : 0;
    html += `<tr><td>${f.label}</td><td>${fmt(v||0)}</td></tr>`;
  });
  html += `<tr><td style="background:var(--ink); color:var(--cyan);">TOTAL</td><td style="background:var(--ink); color:var(--cyan); font-weight:700;">${fmt(cot.totalFijoGeneral||0)}</td></tr>`;
  html += `</tbody></table></div>`;

  // Variables por zona
  html += `<div class="detalle-block"><h4>Costos variables por zona</h4>`;
  html += `<table class="detalle-table"><thead><tr><th>Concepto</th>`;
  for (let z = 0; z < 4; z++) html += `<th>${ZONAS[z]}</th>`;
  html += `</tr></thead><tbody>`;
  // troncal
  html += `<tr><td>Troncal por pallet</td>`;
  for (let z = 0; z < 4; z++) {
    const v = e.zonas ? (e.zonas[z].troncal||0) : 0;
    html += `<td>${z===0 ? '<span style="color:#bbb;">—</span>' : fmt(v)}</td>`;
  }
  html += `</tr>`;
  // UM por peso
  PESOS_TARIFA.forEach(p => {
    html += `<tr><td>UM ${p} KG</td>`;
    for (let z = 0; z < 4; z++) {
      const v = e.zonas ? (e.zonas[z].um[p]||0) : 0;
      html += `<td>${fmt(v)}</td>`;
    }
    html += `</tr>`;
  });
  // excedente
  html += `<tr><td style="color:var(--cyan-deep); font-weight:700;">KG excedente / kg</td>`;
  for (let z = 0; z < 4; z++) {
    const v = e.zonas ? (e.zonas[z].excedente||0) : 0;
    html += `<td style="color:var(--cyan-deep); font-weight:700;">${fmt(v)}</td>`;
  }
  html += `</tr></tbody></table></div>`;

  // Tarifario sugerido (snapshot)
  html += `<div class="detalle-block"><h4>Tarifario sugerido (precios por guía)</h4>`;
  html += `<table class="detalle-table"><thead><tr><th>Peso</th>`;
  for (let z = 0; z < 4; z++) html += `<th>${ZONAS[z]}</th>`;
  html += `</tr></thead><tbody>`;
  const matP = cot.matPrecios || [];
  PESOS_TARIFA.forEach((p, pi) => {
    html += `<tr><td>${p} KG</td>`;
    for (let z = 0; z < 4; z++) {
      const v = matP[pi] ? matP[pi][z] : 0;
      html += `<td>${fmt(v)}</td>`;
    }
    html += `</tr>`;
  });
  // excedente
  const exFila = matP[PESOS_TARIFA.length] || [];
  html += `<tr><td style="color:var(--cyan-deep); font-weight:700;">KG excedente</td>`;
  for (let z = 0; z < 4; z++) html += `<td style="color:var(--cyan-deep); font-weight:700;">${fmt(exFila[z]||0)} / kg</td>`;
  html += `</tr></tbody></table></div>`;

  document.getElementById('detalleContent').innerHTML = html;
  document.getElementById('modalDetalle').classList.add('active');
}

function cerrarModalDetalle() {
  document.getElementById('modalDetalle').classList.remove('active');
}

/* ====================================================
   EXCEL — exportación
   ==================================================== */
function exportarExcel(titulo) {
  const snap = crearSnapshot(titulo);
  exportarExcelDesdeSnapshot(snap);
}

function exportarExcelDesdeSnapshot(cot) {
  if (typeof XLSX === 'undefined') {
    toast('Error: librería Excel no cargada', true);
    return;
  }
  const wb = XLSX.utils.book_new();
  const e = cot.estado;
  const matP = cot.matPrecios || [];

  // Hoja 1 - Resumen
  const fechaArr = new Date(cot.fecha).toLocaleString('es-AR');
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['SOUTHPOST · Tarifario archivado'],
    [],
    ['Título', cot.titulo],
    ['Fecha y hora', fechaArr],
    [],
    ['PARÁMETROS GENERALES'],
    ['Volumen mensual total (operación)', e.volTotal],
    ['Margen objetivo', (e.margen||0) + '%'],
    ['% absorción de costos fijos', (e.absorCot||0) + '%'],
    [],
    ['ESTRUCTURA DE COSTOS'],
    ['Total fijo mensual', cot.totalFijoGeneral||0],
  ]);
  ws1['!cols'] = [{wch: 38}, {wch: 22}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // Hoja 2 - Costos fijos generales
  const fdata = [['Concepto', 'Importe mensual']];
  CAMPOS_FIJOS_GENERALES.forEach(f => {
    fdata.push([f.label, +(e.fijosGenerales ? e.fijosGenerales[f.key] : 0) || 0]);
  });
  fdata.push(['TOTAL', cot.totalFijoGeneral||0]);
  const ws2 = XLSX.utils.aoa_to_sheet(fdata);
  ws2['!cols'] = [{wch: 40}, {wch: 18}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Costos fijos generales');

  // Hoja 3 - Costos variables por zona
  const headerZ = ['Concepto', 'ZONA I', 'ZONA II', 'ZONA III', 'ZONA IV'];
  const vdata = [headerZ];
  vdata.push(['Troncal por pallet (desde Z.I)',
    '—',
    +(e.zonas[1].troncal||0),
    +(e.zonas[2].troncal||0),
    +(e.zonas[3].troncal||0)
  ]);
  PESOS_TARIFA.forEach(p => {
    const fila = [`UM ${p} KG`];
    for (let z = 0; z < 4; z++) fila.push(+(e.zonas[z].um[p]||0));
    vdata.push(fila);
  });
  const filaEx = ['KG excedente ($/kg adicional)'];
  for (let z = 0; z < 4; z++) filaEx.push(+(e.zonas[z].excedente||0));
  vdata.push(filaEx);
  const ws3 = XLSX.utils.aoa_to_sheet(vdata);
  ws3['!cols'] = [{wch: 32}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 14}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Costos variables');

  // Hoja 4 - Capacidad por pallet
  const cdata = [['Rango', 'ZONA II', 'ZONA III', 'ZONA IV']];
  RANGOS_CAPACIDAD.forEach((rg, ri) => {
    cdata.push([rg.nombre, e.capacidades[0][ri]||0, e.capacidades[1][ri]||0, e.capacidades[2][ri]||0]);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(cdata);
  ws4['!cols'] = [{wch: 22}, {wch: 12}, {wch: 12}, {wch: 12}];
  XLSX.utils.book_append_sheet(wb, ws4, 'Capacidad por pallet');

  // Hoja 5 - Tarifario sugerido
  const tdata = [['Peso', 'ZONA I', 'ZONA II', 'ZONA III', 'ZONA IV']];
  PESOS_TARIFA.forEach((p, pi) => {
    const fila = matP[pi] || [0,0,0,0];
    tdata.push([`${p} KG`, +fila[0]||0, +fila[1]||0, +fila[2]||0, +fila[3]||0]);
  });
  const exFila = matP[PESOS_TARIFA.length] || [0,0,0,0];
  tdata.push(['KG excedente ($/kg)', +exFila[0]||0, +exFila[1]||0, +exFila[2]||0, +exFila[3]||0]);
  const ws5 = XLSX.utils.aoa_to_sheet(tdata);
  ws5['!cols'] = [{wch: 22}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 14}];
  XLSX.utils.book_append_sheet(wb, ws5, 'Tarifario sugerido');

  // Hoja 6 - Punto de equilibrio
  const eqdata = [['Peso', 'ZONA I (guías)', 'ZONA II (guías)', 'ZONA III (guías)', 'ZONA IV (guías)']];
  const matEq = cot.matEquilibrio || [];
  PESOS_TARIFA.forEach((p, pi) => {
    const fila = matEq[pi] || [null, null, null, null];
    eqdata.push([`${p} KG`,
      fila[0] === null || !isFinite(fila[0]) ? 'sin contribución' : fila[0],
      fila[1] === null || !isFinite(fila[1]) ? 'sin contribución' : fila[1],
      fila[2] === null || !isFinite(fila[2]) ? 'sin contribución' : fila[2],
      fila[3] === null || !isFinite(fila[3]) ? 'sin contribución' : fila[3],
    ]);
  });
  const ws6 = XLSX.utils.aoa_to_sheet(eqdata);
  ws6['!cols'] = [{wch: 22}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 18}];
  XLSX.utils.book_append_sheet(wb, ws6, 'Punto de equilibrio');

  const fechaArchivo = new Date(cot.fecha).toISOString().slice(0, 10);
  const safeName = String(cot.titulo).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
  XLSX.writeFile(wb, `Tarifario_${safeName || 'general'}_${fechaArchivo}.xlsx`);
}

/* ====================================================
   TOAST
   ==================================================== */
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

/* ====================================================
   RESET
   ==================================================== */
function resetAll() {
  if (!confirm('¿Estás seguro? Se van a borrar todos los datos cargados y volver a los valores por defecto. (El historial NO se borra)')) return;
  state = JSON.parse(JSON.stringify(DEFAULTS));
  saveState();
  renderGlobales();
  renderFijosGenerales();
  renderZonas();
  renderCapacidades();
  recalc();
  toast('Datos reseteados');
}

/* ====================================================
   INIT
   ==================================================== */
renderGlobales();
renderFijosGenerales();
renderZonas();
renderCapacidades();
renderHistorial();
recalc();
document.getElementById('lastUpdate').textContent = 'Cargado: ' + new Date().toLocaleTimeString('es-AR');
