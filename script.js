/* ====================================================
   SOUTHPOST — Calculadora de tarifario v11 (Sucursales)
   ==================================================== */

const FACTOR_AFORO = 250; // 1 m³ = 250 KG aforados (hardcoded)
const ZONAS = ['ZONA I', 'ZONA II', 'ZONA III', 'ZONA IV'];
const ZONAS_KEY = ['Z1', 'Z2', 'Z3', 'Z4'];

const RUTAS = [
  { id: 'A', label: 'Ruta A', km: '0 - 50 km' },
  { id: 'B', label: 'Ruta B', km: '51 - 100 km' },
  { id: 'C', label: 'Ruta C', km: '101 - 150 km' },
  { id: 'D', label: 'Ruta D', km: '151 - 200 km' },
  { id: 'E', label: 'Ruta E', km: '+201 km' },
];

const PESOS_TARIFA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50];

const CONCEPTOS_FIJOS = [
  { key: 'alquiler',    label: 'Alquiler / depósito' },
  { key: 'personal',    label: 'Personal' },
  { key: 'servicios',   label: 'Servicios' },
  { key: 'seguros',     label: 'Seguros e impuestos' },
  { key: 'otros',       label: 'Otros gastos' },
];

const PESO_REF_EQUILIBRIO = 5; // peso de referencia para el punto de equilibrio (guías de 5 KG)

let _sucId = 0;
function nextSucId() { _sucId++; return 'suc_' + Date.now() + '_' + _sucId; }

function sucursalNueva(nombre) {
  const suc = {
    id: nextSucId(),
    nombre: nombre || 'Nueva sucursal',
    fijos: {},
    mixZonas: { Z1: 0, Z2: 0, Z3: 0, Z4: 0 },
    troncal: 0,
    rutas: {},
  };
  CONCEPTOS_FIJOS.forEach(c => suc.fijos[c.key] = 0);
  RUTAS.forEach(r => suc.rutas[r.id] = { vehiculoId: null, costoViaje: 0, paradas: 0 });
  return suc;
}

const DEFAULTS = {
  margen: 30,
  pallet: { largo: 1.0, ancho: 1.2, alto: 1.5 },
  mixRutas: { A: 50, B: 25, C: 15, D: 7, E: 3 },
  vehiculos: [
    { id: 'v_moto',   nombre: 'Moto',          m3: 0.3 },
    { id: 'v_util',   nombre: 'Utilitario',     m3: 1.0 },
    { id: 'v_camchi', nombre: 'Camión chico',   m3: 3.0 },
    { id: 'v_cam',    nombre: 'Camión grande',  m3: 6.0 },
  ],
  sucursales: [],
  // Ediciones manuales del tarifario: { "Z2_25": 12345 } -> precio fijado a mano
  tarifarioManual: {},
};

const STORE_KEY = 'tarifario_southpost_v11';
const HIST_KEY = 'tarifario_southpost_v11_historial';
const HIST_MAX = 50;

let state = loadState();

function sucursalEjemplo() {
  const s = sucursalNueva('Rosario');
  s.fijos = { alquiler: 350000, personal: 600000, servicios: 120000, seguros: 80000, otros: 50000 };
  s.mixZonas = { Z1: 10, Z2: 50, Z3: 25, Z4: 15 };
  s.troncal = 90000;
  s.rutas = {
    A: { vehiculoId: 'v_util',   costoViaje: 90000,  paradas: 55 },
    B: { vehiculoId: 'v_util',   costoViaje: 130000, paradas: 40 },
    C: { vehiculoId: 'v_camchi', costoViaje: 240000, paradas: 28 },
    D: { vehiculoId: 'v_camchi', costoViaje: 310000, paradas: 18 },
    E: { vehiculoId: 'v_cam',    costoViaje: 460000, paradas: 10 },
  };
  return s;
}

function loadState() {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      const base = JSON.parse(JSON.stringify(DEFAULTS));
      for (const k in parsed) {
        if (k === 'pallet' && typeof parsed.pallet === 'object') {
          base.pallet = { ...base.pallet, ...parsed.pallet };
        } else if (k === 'mixRutas' && typeof parsed.mixRutas === 'object') {
          base.mixRutas = { ...base.mixRutas, ...parsed.mixRutas };
        } else if (k === 'vehiculos' && Array.isArray(parsed.vehiculos)) {
          base.vehiculos = parsed.vehiculos;
        } else if (k === 'sucursales' && Array.isArray(parsed.sucursales)) {
          base.sucursales = parsed.sucursales;
        } else if (k === 'tarifarioManual' && typeof parsed.tarifarioManual === 'object') {
          base.tarifarioManual = parsed.tarifarioManual;
        } else {
          base[k] = parsed[k];
        }
      }
      return base;
    }
  } catch (e) { console.error('Load error:', e); }
  const init = JSON.parse(JSON.stringify(DEFAULTS));
  init.sucursales = [sucursalEjemplo()];
  return init;
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    const ss = document.getElementById('saveState');
    if (ss) { ss.textContent = '● GUARDADO'; ss.style.color = 'var(--success)'; }
    const lu = document.getElementById('lastUpdate');
    if (lu) lu.textContent = 'Última edición: ' + new Date().toLocaleTimeString('es-AR');
  } catch (e) {
    const ss = document.getElementById('saveState');
    if (ss) { ss.textContent = '⚠ NO GUARDADO'; ss.style.color = 'var(--danger)'; }
  }
}

/* ============= HELPERS ============= */
function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return '—';
  const sign = n < 0 ? '-' : '';
  return sign + '$ ' + Math.abs(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}
function escaparHTML(s) {
  return String(s||'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function palletM3() {
  return (state.pallet.largo || 0) * (state.pallet.ancho || 0) * (state.pallet.alto || 0);
}
function palletKgAforado() {
  return palletM3() * FACTOR_AFORO;
}
function totalMixRutas() {
  return RUTAS.reduce((acc, r) => acc + (+state.mixRutas[r.id] || 0), 0);
}
function totalFijosSucursal(suc) {
  return CONCEPTOS_FIJOS.reduce((a, c) => a + (+suc.fijos[c.key] || 0), 0);
}
function totalFijosGlobal() {
  return state.sucursales.reduce((a, s) => a + totalFijosSucursal(s), 0);
}
function vehiculoPorId(id) {
  return state.vehiculos.find(v => v.id === id) || null;
}

/* ============= CÁLCULO ============= */
// Mix de zonas de una sucursal (compatible con sucursales viejas que tenían `zonas` booleano)
function mixZonasSuc(suc) {
  if (suc.mixZonas && typeof suc.mixZonas === 'object') return suc.mixZonas;
  // migración: si venía con checkboxes, repartir 100% en partes iguales entre las tildadas
  const mz = { Z1: 0, Z2: 0, Z3: 0, Z4: 0 };
  if (suc.zonas) {
    const ats = ZONAS_KEY.filter(z => suc.zonas[z]);
    if (ats.length) ats.forEach(z => mz[z] = +(100 / ats.length).toFixed(2));
  }
  return mz;
}
function totalMixZonas(suc) {
  const mz = mixZonasSuc(suc);
  return ZONAS_KEY.reduce((a, z) => a + (+mz[z] || 0), 0);
}

// Costo variable puro (sin margen) ponderado por mix de rutas, para una sucursal y un peso.
// Troncal amortizado por aforo del pallet + última milla con aforo-vs-jornada.
function costoVariableSucursal(suc, peso) {
  const troncalKg = palletKgAforado() > 0 ? suc.troncal / palletKgAforado() : 0;
  const sumMix = totalMixRutas() > 0 ? totalMixRutas() : 1;
  let cv = 0;
  RUTAS.forEach(r => {
    const rd = suc.rutas[r.id];
    const veh = vehiculoPorId(rd.vehiculoId);
    const m3 = veh ? veh.m3 : 0;
    const entranAforo = peso > 0 ? (m3 * FACTOR_AFORO) / peso : 0;   // cuántos paquetes entran por volumen
    const entranJornada = rd.paradas || 0;                           // tope por jornada (paradas)
    const capEf = Math.min(entranAforo, entranJornada);              // cuello de botella real
    const umGuia = capEf > 0 ? rd.costoViaje / capEf : 0;
    cv += (peso * troncalKg + umGuia) * ((+state.mixRutas[r.id] || 0) / sumMix);
  });
  return cv;
}

// Precio variable (costo + margen de ganancia global), para una sucursal y un peso.
function precioVariableSucursal(suc, peso) {
  const margenDec = (state.margen || 0) / 100;
  const factorPrecio = (1 - margenDec) > 0 ? 1 / (1 - margenDec) : 0;
  return costoVariableSucursal(suc, peso) * factorPrecio;
}

// SUGERIDO por (zona, peso) — modelo A1:
// promedio de precios de las sucursales, ponderado por el % que cada sucursal dedica a esa zona.
function sugeridoBrutoZona(zonaKey, peso) {
  let num = 0, den = 0;
  state.sucursales.forEach(s => {
    const mz = mixZonasSuc(s);
    const w = +mz[zonaKey] || 0;
    if (w > 0) { num += precioVariableSucursal(s, peso) * w; den += w; }
  });
  return den > 0 ? num / den : null;
}

// SUGERIDO con monotonía forzada: Z1 <= Z2 <= Z3 <= Z4 dentro de cada peso.
// Si una zona no tiene cobertura (null), arrastra el valor de la zona anterior.
function sugeridosZonasMonotono(peso) {
  const out = {};
  let prev = null;
  ZONAS_KEY.forEach(zk => {
    let v = sugeridoBrutoZona(zk, peso);
    if (v === null) {
      v = prev; // sin cobertura: hereda el piso anterior (puede quedar null si es la primera)
    } else if (prev !== null && v < prev) {
      v = prev; // forzar que nunca baje respecto de la zona anterior
    }
    out[zk] = v;
    if (v !== null) prev = v;
  });
  return out;
}

// Precio sugerido individual (con monotonía) por zona y peso.
function precioSugeridoZona(zonaKey, peso) {
  return sugeridosZonasMonotono(peso)[zonaKey];
}

// Precio FINAL (manual si existe, sino sugerido)
function precioFinalZona(zonaKey, peso) {
  const manualKey = zonaKey + '_' + peso;
  if (state.tarifarioManual[manualKey] !== undefined && state.tarifarioManual[manualKey] !== null) {
    return state.tarifarioManual[manualKey];
  }
  return precioSugeridoZona(zonaKey, peso);
}

function esManual(zonaKey, peso) {
  const manualKey = zonaKey + '_' + peso;
  return state.tarifarioManual[manualKey] !== undefined && state.tarifarioManual[manualKey] !== null;
}

// EQUILIBRIO de una sucursal:
// cobra la tarifa publicada (final) a 5 KG, ponderada por SU mix de zonas, con su costo variable propio a 5 KG.
function equilibrioSucursal(suc) {
  const mz = mixZonasSuc(suc);
  const zonasAt = ZONAS_KEY.filter(z => (+mz[z] || 0) > 0);
  const sumZ = totalMixZonas(suc);
  if (sumZ <= 0) return { guias: null, precioCobra: 0, cv: 0, contrib: 0, zonasAt, fijo: totalFijosSucursal(suc) };

  // precio que cobra: tarifa final a PESO_REF_EQUILIBRIO ponderada por el mix de zonas de la sucursal
  let num = 0, den = 0;
  zonasAt.forEach(z => {
    const p = precioFinalZona(z, PESO_REF_EQUILIBRIO);
    const w = +mz[z] || 0;
    if (p !== null && p !== undefined) { num += p * w; den += w; }
  });
  if (den <= 0) return { guias: null, precioCobra: 0, cv: 0, contrib: 0, zonasAt, fijo: totalFijosSucursal(suc) };

  const precioCobra = num / den;
  const cv = costoVariableSucursal(suc, PESO_REF_EQUILIBRIO);
  const contrib = precioCobra - cv;
  const fijo = totalFijosSucursal(suc);
  const guias = contrib > 0 ? Math.ceil(fijo / contrib) : null;
  return { guias, precioCobra, cv, contrib, zonasAt, fijo };
}

/* ============= RENDER: GLOBALES ============= */
function renderGlobales() {
  const pl = document.getElementById('palletLargo'); if (pl) pl.value = state.pallet.largo;
  const pa = document.getElementById('palletAncho'); if (pa) pa.value = state.pallet.ancho;
  const ph = document.getElementById('palletAlto'); if (ph) ph.value = state.pallet.alto;
  actualizarPalletDerivado();

  // Margen / % de ganancia global (vive arriba del tarifario, tabla 06)
  const mg = document.getElementById('margenGlobal');
  if (mg) {
    mg.value = state.margen;
    if (!mg.dataset.bound) {
      mg.addEventListener('input', e => { state.margen = +e.target.value || 0; saveState(); recalc(); });
      mg.dataset.bound = '1';
    }
  }

  [pl, pa, ph].forEach(inp => {
    if (inp && !inp.dataset.bound) {
      const campo = inp.id === 'palletLargo' ? 'largo' : inp.id === 'palletAncho' ? 'ancho' : 'alto';
      inp.addEventListener('input', e => { state.pallet[campo] = +e.target.value || 0; saveState(); actualizarPalletDerivado(); recalc(); });
      inp.dataset.bound = '1';
    }
  });
}
function actualizarPalletDerivado() {
  const elM3 = document.getElementById('palletM3');
  const elKg = document.getElementById('palletKgAforado');
  if (elM3) elM3.textContent = palletM3().toLocaleString('es-AR', {maximumFractionDigits: 2}) + ' m³';
  if (elKg) elKg.textContent = palletKgAforado().toLocaleString('es-AR', {maximumFractionDigits: 0}) + ' KG aforados';
}

function renderVehiculos() {
  const tbl = document.getElementById('tablaVehiculos');
  if (!tbl) return;
  let html = `<thead><tr><th>Vehículo</th><th style="width:120px;">Capacidad m³</th><th style="text-align:right; width:150px;">KG aforados</th><th style="width:90px;">Acción</th></tr></thead><tbody>`;
  state.vehiculos.forEach((veh, i) => {
    const kgAf = (veh.m3 || 0) * FACTOR_AFORO;
    html += `<tr>
      <td><input type="text" data-veh-i="${i}" data-veh-campo="nombre" value="${escaparHTML(veh.nombre)}"></td>
      <td><input type="number" data-veh-i="${i}" data-veh-campo="m3" value="${veh.m3}" min="0.01" step="0.1"></td>
      <td class="derived" id="vehKgAf-${i}">${kgAf.toLocaleString('es-AR')} KG</td>
      <td><button class="del-btn" onclick="eliminarVehiculo(${i})">Eliminar</button></td>
    </tr>`;
  });
  html += `</tbody>`;
  tbl.innerHTML = html;
  tbl.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = +e.target.dataset.vehI, campo = e.target.dataset.vehCampo;
      if (campo === 'm3') {
        state.vehiculos[i][campo] = +e.target.value || 0;
        const elKg = document.getElementById('vehKgAf-' + i);
        if (elKg) elKg.textContent = ((state.vehiculos[i].m3 || 0) * FACTOR_AFORO).toLocaleString('es-AR') + ' KG';
        actualizarDropdownsVehiculosSucursales();
      } else {
        state.vehiculos[i][campo] = e.target.value;
        actualizarDropdownsVehiculosSucursales();
      }
      saveState();
      recalc();
    });
  });
}
function agregarVehiculo() {
  state.vehiculos.push({ id: 'v_' + Date.now(), nombre: 'Nuevo vehículo', m3: 1.0 });
  saveState(); renderVehiculos(); renderSucursales(); recalc();
}
function eliminarVehiculo(i) {
  if (state.vehiculos.length <= 1) { toast('Debe quedar al menos un vehículo', true); return; }
  if (!confirm('¿Eliminar este vehículo? Las rutas que lo usaban quedarán sin vehículo asignado.')) return;
  state.vehiculos.splice(i, 1);
  saveState(); renderVehiculos(); renderSucursales(); recalc();
}

function renderMixRutas() {
  const grid = document.getElementById('mixRutasGrid');
  if (!grid) return;
  let html = '';
  RUTAS.forEach(r => {
    html += `<div class="mix-ruta-item">
      <label>${r.label}</label><span class="km">${r.km}</span>
      <div class="input-wrap"><input type="number" data-mix="${r.id}" value="${state.mixRutas[r.id]||0}" min="0" max="100" step="1"><span class="pct-symbol">%</span></div>
    </div>`;
  });
  grid.innerHTML = html;
  actualizarMixTotal();
  grid.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
      state.mixRutas[e.target.dataset.mix] = +e.target.value || 0;
      saveState(); actualizarMixTotal(); recalc();
    });
  });
}
function actualizarMixTotal() {
  const el = document.getElementById('mixRutasTotal');
  if (!el) return;
  const tot = totalMixRutas();
  el.textContent = tot === 100 ? `Total: ${tot}%  ✓` : `Total: ${tot}%  ⚠️ debería ser 100%`;
  el.classList.toggle('error', tot !== 100);
}

/* ============= RENDER: SUCURSALES ============= */
function renderSucursales() {
  const cont = document.getElementById('sucursalesCont');
  if (!cont) return;
  const cnt = document.getElementById('contadorSuc');
  if (cnt) cnt.textContent = state.sucursales.length;

  if (state.sucursales.length === 0) {
    cont.innerHTML = `<div class="suc-empty"><div class="suc-empty-icon">🏪</div><div>No hay sucursales todavía. Tocá "+ Agregar sucursal" para empezar.</div></div>`;
    return;
  }

  let html = '';
  state.sucursales.forEach((suc, idx) => {
    const totalFijo = totalFijosSucursal(suc);
    html += `<div class="suc-card">
      <div class="suc-header">
        <input type="text" class="suc-nombre" data-suc="${suc.id}" data-campo="nombre" value="${escaparHTML(suc.nombre)}">
        <button class="suc-del" onclick="eliminarSucursal('${suc.id}')">Eliminar</button>
      </div>`;

    // Fijos
    html += `<div class="suc-section-label">Costos fijos mensuales</div><div class="suc-fijos-grid">`;
    CONCEPTOS_FIJOS.forEach(c => {
      html += `<div class="suc-fijo-item"><div class="suc-fijo-lbl">${c.label}</div>
        <input type="number" data-suc="${suc.id}" data-fijo="${c.key}" value="${suc.fijos[c.key]||0}" min="0" step="1000"></div>`;
    });
    html += `</div><div class="suc-fijo-total">Total fijo: <strong id="sucFijoTotal-${suc.id}">${fmt(totalFijo)}</strong></div>`;

    // Mix de zonas (% de entregas por zona) — debe sumar 100
    const mz = mixZonasSuc(suc);
    const totZ = totalMixZonas(suc);
    html += `<div class="suc-section-label">Mix de zonas — % de entregas por zona</div><div class="suc-zonas-mix">`;
    ZONAS_KEY.forEach((z, zi) => {
      html += `<div class="suc-zona-mix-item">
        <label>${ZONAS[zi]}</label>
        <div class="zmix-wrap"><input type="number" data-suc="${suc.id}" data-zonamix="${z}" value="${+mz[z]||0}" min="0" max="100" step="1"><span class="pct">%</span></div>
      </div>`;
    });
    html += `</div><div class="suc-zonas-total ${totZ===100?'':'error'}" id="sucZonasTotal-${suc.id}">${totZ===100?`Total: ${totZ}% ✓`:`Total: ${totZ}% ⚠️ debería ser 100%`}</div>`;

    // Troncal (un solo costo)
    html += `<div class="suc-section-label">Troncal — costo de pallet a esta sucursal</div>
      <div class="suc-troncal">
        <input type="number" data-suc="${suc.id}" data-campo="troncal" value="${suc.troncal||0}" min="0" step="1000" placeholder="0">
        <span class="suc-troncal-derived" id="sucTroncalKg-${suc.id}"></span>
      </div>`;

    // Última milla
    html += `<div class="suc-section-label">Última milla por ruta</div>
      <div class="suc-rutas-wrap"><table class="suc-rutas-table">
      <thead><tr><th>Ruta</th><th>Vehículo</th><th style="text-align:right;">Costo viaje</th><th style="text-align:right;">Paradas/día</th><th style="text-align:right;">$/KG af.</th></tr></thead><tbody>`;
    RUTAS.forEach(r => {
      const rd = suc.rutas[r.id];
      html += `<tr>
        <td><strong>${r.label.replace('Ruta ','')}</strong> <span class="suc-ruta-km">${r.km}</span></td>
        <td><select data-suc="${suc.id}" data-ruta="${r.id}" data-campo="vehiculoId">
          <option value="">— elegir —</option>
          ${state.vehiculos.map(v => `<option value="${v.id}" ${v.id===rd.vehiculoId?'selected':''}>${escaparHTML(v.nombre)} (${v.m3}m³)</option>`).join('')}
        </select></td>
        <td><input type="number" data-suc="${suc.id}" data-ruta="${r.id}" data-campo="costoViaje" value="${rd.costoViaje||0}" min="0" step="1000"></td>
        <td><input type="number" data-suc="${suc.id}" data-ruta="${r.id}" data-campo="paradas" value="${rd.paradas||0}" min="0" step="1"></td>
        <td class="derived" id="sucRutaKg-${suc.id}-${r.id}"></td>
      </tr>`;
    });
    html += `</tbody></table></div></div>`;
  });
  cont.innerHTML = html;
  bindSucursales();
  actualizarDerivadasSucursales();
}

function bindSucursales() {
  const cont = document.getElementById('sucursalesCont');
  if (!cont) return;
  // Nombre, troncal
  cont.querySelectorAll('input[data-campo], select[data-campo]').forEach(el => {
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, e => {
      const id = e.target.dataset.suc, campo = e.target.dataset.campo, ruta = e.target.dataset.ruta;
      const suc = state.sucursales.find(s => s.id === id);
      if (!suc) return;
      if (ruta) {
        if (campo === 'vehiculoId') suc.rutas[ruta][campo] = e.target.value || null;
        else suc.rutas[ruta][campo] = +e.target.value || 0;
        actualizarDerivadaRutaSuc(suc, ruta);
      } else if (campo === 'nombre') {
        suc[campo] = e.target.value;
      } else if (campo === 'troncal') {
        suc.troncal = +e.target.value || 0;
        actualizarTroncalDerivadoSuc(suc);
        ['A','B','C','D','E'].forEach(rid => actualizarDerivadaRutaSuc(suc, rid));
      }
      saveState();
      recalc();
    });
  });
  // Fijos
  cont.querySelectorAll('input[data-fijo]').forEach(el => {
    el.addEventListener('input', e => {
      const id = e.target.dataset.suc, key = e.target.dataset.fijo;
      const suc = state.sucursales.find(s => s.id === id);
      if (!suc) return;
      suc.fijos[key] = +e.target.value || 0;
      const elTot = document.getElementById('sucFijoTotal-' + id);
      if (elTot) elTot.textContent = fmt(totalFijosSucursal(suc));
      saveState();
      recalc();
    });
  });
  // Mix de zonas (inputs %) — actualiza total y recalcula
  cont.querySelectorAll('input[data-zonamix]').forEach(el => {
    el.addEventListener('input', e => {
      const id = e.target.dataset.suc, z = e.target.dataset.zonamix;
      const suc = state.sucursales.find(s => s.id === id);
      if (!suc) return;
      if (!suc.mixZonas) suc.mixZonas = { Z1:0, Z2:0, Z3:0, Z4:0 };
      suc.mixZonas[z] = +e.target.value || 0;
      const totZ = totalMixZonas(suc);
      const elTot = document.getElementById('sucZonasTotal-' + id);
      if (elTot) {
        elTot.textContent = totZ === 100 ? `Total: ${totZ}% ✓` : `Total: ${totZ}% ⚠️ debería ser 100%`;
        elTot.classList.toggle('error', totZ !== 100);
      }
      saveState();
      recalc();
    });
  });
}

function actualizarDerivadaRutaSuc(suc, rutaId) {
  const rd = suc.rutas[rutaId];
  const veh = vehiculoPorId(rd.vehiculoId);
  const m3 = veh ? veh.m3 : 0;
  const kgAf = m3 * FACTOR_AFORO;
  const umKg = kgAf > 0 ? rd.costoViaje / kgAf : 0;
  const troncalKg = palletKgAforado() > 0 ? suc.troncal / palletKgAforado() : 0;
  const el = document.getElementById(`sucRutaKg-${suc.id}-${rutaId}`);
  if (el) el.innerHTML = `${fmt(umKg + troncalKg)}<div class="sub">UM+troncal</div>`;
}
function actualizarTroncalDerivadoSuc(suc) {
  const troncalKg = palletKgAforado() > 0 ? suc.troncal / palletKgAforado() : 0;
  const el = document.getElementById('sucTroncalKg-' + suc.id);
  if (el) el.textContent = `= ${fmt(troncalKg)} / KG aforado`;
}
function actualizarDerivadasSucursales() {
  state.sucursales.forEach(suc => {
    actualizarTroncalDerivadoSuc(suc);
    RUTAS.forEach(r => actualizarDerivadaRutaSuc(suc, r.id));
  });
}
function actualizarDropdownsVehiculosSucursales() {
  state.sucursales.forEach(suc => {
    RUTAS.forEach(r => {
      const sel = document.querySelector(`select[data-suc="${suc.id}"][data-ruta="${r.id}"]`);
      if (!sel) return;
      const selId = suc.rutas[r.id].vehiculoId;
      sel.innerHTML = `<option value="">— elegir —</option>` +
        state.vehiculos.map(v => `<option value="${v.id}" ${v.id===selId?'selected':''}>${escaparHTML(v.nombre)} (${v.m3}m³)</option>`).join('');
    });
  });
}

function agregarSucursal() {
  state.sucursales.push(sucursalNueva('Sucursal ' + (state.sucursales.length + 1)));
  saveState(); renderSucursales(); recalc();
}
function eliminarSucursal(id) {
  if (!confirm('¿Eliminar esta sucursal?')) return;
  state.sucursales = state.sucursales.filter(s => s.id !== id);
  saveState(); renderSucursales(); recalc();
}

/* ============= RENDER: TARIFARIO (editable) ============= */
function renderTarifario() {
  const tbl = document.getElementById('tablaTarifario');
  if (!tbl) return;
  let html = `<thead><tr><th style="text-align:left;">Peso aforado</th>`;
  ZONAS.forEach((z, zi) => {
    const sucsZona = state.sucursales.filter(s => (+mixZonasSuc(s)[ZONAS_KEY[zi]] || 0) > 0);
    html += `<th class="ruta-header">${z}<br><span style="font-size:9px; opacity:0.7; font-weight:400;">${sucsZona.length} suc.</span></th>`;
  });
  html += `</tr></thead><tbody>`;

  PESOS_TARIFA.forEach(peso => {
    html += `<tr><td class="range-label">${peso} KG</td>`;
    ZONAS_KEY.forEach((zk, zi) => {
      const sugerido = precioSugeridoZona(zk, peso);
      const manual = esManual(zk, peso);
      const valor = precioFinalZona(zk, peso);
      if (sugerido === null && !manual) {
        html += `<td class="price sin-cobertura">—</td>`;
      } else {
        const cls = manual ? 'price celda-manual' : 'price';
        const valNum = valor !== null ? Math.round(valor) : 0;
        html += `<td class="${cls}">
          <input type="number" class="tarifa-input" data-zk="${zk}" data-peso="${peso}" value="${valNum}" min="0" step="100">
          ${manual ? `<span class="manual-dot" title="Editado manualmente" onclick="restaurarCelda('${zk}',${peso})">●</span>` : ''}
        </td>`;
      }
    });
    html += `</tr>`;
  });
  html += `</tbody>`;
  tbl.innerHTML = html;

  tbl.querySelectorAll('input.tarifa-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const zk = e.target.dataset.zk, peso = +e.target.dataset.peso;
      state.tarifarioManual[zk + '_' + peso] = +e.target.value || 0;
      saveState();
      // No re-render completo (mantener foco) — solo actualizar equilibrio y badge
      marcarCeldaManual(e.target);
      renderEquilibrio();
    });
  });
}
function marcarCeldaManual(input) {
  const td = input.closest('td');
  if (td && !td.classList.contains('celda-manual')) {
    td.classList.add('celda-manual');
    const dot = document.createElement('span');
    dot.className = 'manual-dot';
    dot.title = 'Editado manualmente';
    dot.textContent = '●';
    dot.onclick = () => restaurarCelda(input.dataset.zk, +input.dataset.peso);
    td.appendChild(dot);
  }
}
function restaurarCelda(zk, peso) {
  delete state.tarifarioManual[zk + '_' + peso];
  saveState();
  renderTarifario();
  renderEquilibrio();
  toast('Celda restaurada al valor sugerido');
}
function restaurarTodoTarifario() {
  if (Object.keys(state.tarifarioManual).length === 0) { toast('No hay celdas editadas', true); return; }
  if (!confirm('¿Restaurar TODAS las celdas al valor sugerido? Se perderán las ediciones manuales.')) return;
  state.tarifarioManual = {};
  saveState();
  renderTarifario();
  renderEquilibrio();
  toast('Tarifario restaurado a valores sugeridos');
}

/* ============= RENDER: EQUILIBRIO ============= */
function renderEquilibrio() {
  const tbl = document.getElementById('tablaEquilibrio');
  if (!tbl) return;
  if (state.sucursales.length === 0) { tbl.innerHTML = '<tbody><tr><td style="padding:20px; text-align:center; color:#888;">No hay sucursales cargadas.</td></tr></tbody>'; return; }

  let html = `<thead><tr>
    <th style="text-align:left;">Sucursal</th>
    <th style="text-align:left;">Mix de zonas</th>
    <th style="text-align:right;">Fijo mensual</th>
    <th style="text-align:right;">Cobra/guía<br><span style="font-size:9px;opacity:.6;">ref. 5 KG</span></th>
    <th style="text-align:right;">Costo var/guía<br><span style="font-size:9px;opacity:.6;">ref. 5 KG</span></th>
    <th style="text-align:right;">Contribución</th>
    <th style="text-align:right;">Equilibrio</th>
  </tr></thead><tbody>`;

  state.sucursales.forEach(suc => {
    const eq = equilibrioSucursal(suc);
    const mz = mixZonasSuc(suc);
    const zonasTxt = eq.zonasAt.length > 0 ? eq.zonasAt.map(z => `${z} ${+mz[z]||0}%`).join(', ') : '—';
    let equilibrioCell;
    if (eq.guias === null) {
      equilibrioCell = `<span class="eq-neg">no rentable</span>`;
    } else {
      equilibrioCell = `<strong>${eq.guias.toLocaleString('es-AR')}</strong> guías/mes`;
    }
    html += `<tr>
      <td class="range-label">${escaparHTML(suc.nombre)}</td>
      <td style="font-size:11px; color:#666;">${zonasTxt}</td>
      <td class="price">${fmt(eq.fijo || totalFijosSucursal(suc))}</td>
      <td class="price">${fmt(eq.precioCobra)}</td>
      <td class="price">${fmt(eq.cv)}</td>
      <td class="price ${eq.contrib > 0 ? 'eq-pos' : 'eq-neg'}">${fmt(eq.contrib)}</td>
      <td class="price">${equilibrioCell}</td>
    </tr>`;
  });
  html += `</tbody>`;
  tbl.innerHTML = html;
}

/* ============= RECALC ============= */
function recalc() {
  renderTarifario();
  renderEquilibrio();
}

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
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ============= MODALES PDF/GUARDAR ============= */
function iniciarExportPDF() {
  document.getElementById('modalClientName').value = 'Tarifario ' + fechaCortaArgentina();
  document.getElementById('modalPDF').classList.add('active');
  setTimeout(() => { const i = document.getElementById('modalClientName'); if (i) { i.focus(); i.select(); } }, 100);
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
  setTimeout(() => { const i = document.getElementById('modalGuardarClientName'); if (i) { i.focus(); i.select(); } }, 100);
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
  const mPDF = document.getElementById('modalPDF'), mG = document.getElementById('modalGuardar'), mD = document.getElementById('modalDetalle');
  if (mPDF && mPDF.classList.contains('active')) { if (e.key === 'Escape') cerrarModal(); if (e.key === 'Enter') confirmarExportPDF(); }
  else if (mG && mG.classList.contains('active')) { if (e.key === 'Escape') cerrarModalGuardar(); if (e.key === 'Enter') confirmarGuardarHistorial(); }
  else if (mD && mD.classList.contains('active')) { if (e.key === 'Escape') cerrarModalDetalle(); }
});

/* ============= SNAPSHOT / HISTORIAL ============= */
function snapshotDatos() {
  // Tarifario final por zona y peso + equilibrios
  const tarifa = {};
  ZONAS_KEY.forEach(zk => {
    tarifa[zk] = {};
    PESOS_TARIFA.forEach(p => { tarifa[zk][p] = precioFinalZona(zk, p); });
  });
  const equilibrios = state.sucursales.map(s => {
    const eq = equilibrioSucursal(s);
    return { nombre: s.nombre, fijo: totalFijosSucursal(s), zonas: eq.zonasAt, precioCobra: eq.precioCobra, cv: eq.cv, contrib: eq.contrib, guias: eq.guias };
  });
  return { tarifa, equilibrios };
}
function leerHistorial() {
  try { const s = localStorage.getItem(HIST_KEY); if (s) return JSON.parse(s); } catch(e) {}
  return [];
}
function guardarHistorialEnDisco(hist) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(hist)); } catch(e) { toast('No se pudo guardar al historial', true); }
}
function crearSnapshot(titulo) {
  return {
    id: 'tar_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    titulo, fecha: new Date().toISOString(),
    estado: JSON.parse(JSON.stringify(state)),
    datos: snapshotDatos(),
    totalFijo: totalFijosGlobal(),
  };
}
function archivarTarifario(titulo) {
  let hist = leerHistorial();
  hist.unshift(crearSnapshot(titulo));
  if (hist.length > HIST_MAX) hist = hist.slice(0, HIST_MAX);
  guardarHistorialEnDisco(hist);
}
function eliminarTarifario(id) {
  if (!confirm('¿Eliminar este tarifario del historial?')) return;
  guardarHistorialEnDisco(leerHistorial().filter(c => c.id !== id));
  renderHistorial();
  toast('Tarifario eliminado');
}
function recargarTarifario(id) {
  if (!confirm('¿Reemplazar la configuración actual con este tarifario archivado?')) return;
  const cot = leerHistorial().find(c => c.id === id);
  if (!cot) return;
  state = JSON.parse(JSON.stringify(cot.estado));
  saveState();
  renderGlobales(); renderVehiculos(); renderMixRutas(); renderSucursales(); recalc();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Tarifario re-cargado');
}
function descargarExcelDe(id) {
  const cot = leerHistorial().find(c => c.id === id);
  if (cot) exportarExcelDesdeSnapshot(cot);
}
function inicialesTitulo(t) {
  const tk = (t||'').trim().split(/\s+/).filter(Boolean);
  if (tk.length === 0) return '?';
  if (tk.length === 1) return tk[0].slice(0,2).toUpperCase();
  return (tk[0][0] + tk[1][0]).toUpperCase();
}
function renderHistorial() {
  const hist = leerHistorial();
  const empty = document.getElementById('emptyHistorial'), list = document.getElementById('historialList');
  if (!list || !empty) return;
  if (hist.length === 0) { empty.style.display = 'block'; list.innerHTML = ''; return; }
  empty.style.display = 'none';
  let html = '';
  hist.forEach(cot => {
    html += `<div class="hist-item">
      <div class="hist-icon">${inicialesTitulo(cot.titulo)}</div>
      <div class="hist-info">
        <div class="hist-cliente">${escaparHTML(cot.titulo)}</div>
        <div class="hist-meta">
          <span>${fmtFechaHumana(cot.fecha)}</span>
          <span>fijo total <strong>${fmt(cot.totalFijo||0)}</strong></span>
          <span><strong>${(cot.estado.sucursales||[]).length}</strong> sucursales</span>
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
function verDetalleTarifario(id) {
  const cot = leerHistorial().find(c => c.id === id);
  if (!cot) return;
  document.getElementById('detalleTitulo').textContent = cot.titulo;
  document.getElementById('detalleFecha').textContent = 'Archivado el ' + fmtFechaHumana(cot.fecha);
  const e = cot.estado, d = cot.datos;
  let html = '';
  html += `<div class="detalle-block"><h4>Parámetros</h4><table class="detalle-table"><tbody>
    <tr><td>% de ganancia</td><td>${e.margen||0}%</td></tr>
    <tr><td>Fijo total (sucursales)</td><td>${fmt(cot.totalFijo||0)}</td></tr>
    <tr><td>Sucursales</td><td>${(e.sucursales||[]).length}</td></tr>
  </tbody></table></div>`;
  // Tarifario
  html += `<div class="detalle-block"><h4>Tarifario sugerido</h4><table class="detalle-table"><thead><tr><th>Peso</th><th>Z.I</th><th>Z.II</th><th>Z.III</th><th>Z.IV</th></tr></thead><tbody>`;
  PESOS_TARIFA.forEach(p => {
    html += `<tr><td>${p} KG</td>`;
    ZONAS_KEY.forEach(zk => { const v = d.tarifa[zk] ? d.tarifa[zk][p] : null; html += `<td>${v !== null && v !== undefined ? fmt(v) : '—'}</td>`; });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  // Equilibrios
  html += `<div class="detalle-block"><h4>Punto de equilibrio por sucursal</h4><table class="detalle-table"><thead><tr><th>Sucursal</th><th>Fijo</th><th>Cobra</th><th>Cv</th><th>Equilibrio</th></tr></thead><tbody>`;
  (d.equilibrios||[]).forEach(eq => {
    html += `<tr><td>${escaparHTML(eq.nombre)}</td><td>${fmt(eq.fijo)}</td><td>${fmt(eq.precioCobra)}</td><td>${fmt(eq.cv)}</td><td>${eq.guias !== null ? eq.guias.toLocaleString('es-AR')+' g/mes' : 'no rentable'}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  document.getElementById('detalleContent').innerHTML = html;
  document.getElementById('modalDetalle').classList.add('active');
}
function cerrarModalDetalle() { document.getElementById('modalDetalle').classList.remove('active'); }

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
  if (!confirm('¿Borrar todos los datos y volver a los valores por defecto? (El historial NO se borra)')) return;
  state = JSON.parse(JSON.stringify(DEFAULTS));
  state.sucursales = [sucursalEjemplo()];
  state.tarifarioManual = {};
  saveState();
  renderGlobales(); renderVehiculos(); renderMixRutas(); renderSucursales(); recalc();
  toast('Datos reseteados');
}

/* ============= PDF ============= */
function generarPDF(titulo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297, margin = 15;

  const logoX = margin + 4, logoY = margin + 6;
  doc.setFillColor(43, 128, 200); doc.circle(logoX, logoY, 2.5, 'F');
  doc.setFillColor(43, 212, 217); doc.circle(logoX + 0.6, logoY + 0.6, 1.4, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(13, 44, 102);
  doc.text('SOUTHPOST', logoX + 5, logoY + 1.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text('FECHA DE EMISIÓN', pageW - margin, margin + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(13, 44, 102);
  doc.text(fechaArgentina(), pageW - margin, margin + 9, { align: 'right' });
  doc.setDrawColor(10, 22, 40); doc.setLineWidth(0.6); doc.line(margin, margin + 14, pageW - margin, margin + 14);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 75, 168);
  doc.text('TARIFARIO VIGENTE', pageW / 2, margin + 22, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(13, 44, 102);
  doc.text(titulo, pageW / 2, margin + 31, { align: 'center' });

  const headers = [['Peso aforado', 'ZONA I', 'ZONA II', 'ZONA III', 'ZONA IV']];
  const body = [];
  PESOS_TARIFA.forEach(peso => {
    const row = [`${peso} KG`];
    ZONAS_KEY.forEach(zk => { const v = precioFinalZona(zk, peso); row.push(v !== null ? fmt(v) : '—'); });
    body.push(row);
  });

  doc.autoTable({
    head: headers, body, startY: margin + 38, theme: 'grid', margin: { left: margin, right: margin },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, lineColor: [197, 210, 227], lineWidth: 0.1, textColor: [13, 44, 102] },
    headStyles: { fillColor: [10, 22, 40], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'right', cellPadding: 2.5 },
    columnStyles: { 0: { halign: 'left', cellWidth: 38, fillColor: [244, 247, 251], fontStyle: 'italic', textColor: [10, 22, 40], fontSize: 10 }, 1:{halign:'right',fontStyle:'bold'}, 2:{halign:'right',fontStyle:'bold'}, 3:{halign:'right',fontStyle:'bold'}, 4:{halign:'right',fontStyle:'bold'} },
    alternateRowStyles: { fillColor: [246, 249, 253] },
    didParseCell: function (data) { if (data.section === 'head' && data.column.index >= 1) data.cell.styles.fillColor = [13, 44, 102]; },
  });

  let finalY = doc.lastAutoTable.finalY;
  const warnY = finalY + 8;
  doc.setFillColor(244, 247, 251); doc.rect(margin, warnY, pageW - 2 * margin, 11, 'F');
  doc.setFillColor(43, 212, 217); doc.rect(margin, warnY, 1.2, 11, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(10, 165, 170);
  doc.text('AVISO', margin + 4, warnY + 4);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(13, 44, 102);
  doc.text('Tarifario de uso interno · KG aforado: max(peso real, m³ × 250) · No para envío comercial', margin + 4, warnY + 8.5);

  const footerY = pageH - margin + 2;
  doc.setDrawColor(197, 210, 227); doc.setLineWidth(0.2); doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
  doc.text('SOUTHPOST · Calculadora de tarifario v11', margin, footerY);
  doc.text('Página 1 de 1', pageW - margin, footerY, { align: 'right' });

  const fa = new Date().toISOString().slice(0, 10);
  const safe = titulo.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
  doc.save(`Tarifario_${safe || 'general'}_${fa}.pdf`);
}

/* ============= EXCEL ============= */
function exportarExcel(titulo) { exportarExcelDesdeSnapshot(crearSnapshot(titulo)); }
function exportarExcelDesdeSnapshot(cot) {
  if (typeof XLSX === 'undefined') { toast('Librería Excel no cargada', true); return; }
  const wb = XLSX.utils.book_new();
  const e = cot.estado, d = cot.datos;

  // Resumen
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['SOUTHPOST · Tarifario archivado (modelo sucursales v11)'], [],
    ['Título', cot.titulo], ['Fecha', new Date(cot.fecha).toLocaleString('es-AR')], [],
    ['Factor aforo', `1 m³ = ${FACTOR_AFORO} KG`],
    ['% de ganancia', (e.margen||0)+'%'],
    ['Fijo total (sucursales)', cot.totalFijo||0], ['Cantidad sucursales', (e.sucursales||[]).length],
  ]);
  ws1['!cols'] = [{wch:30},{wch:24}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // Tarifario
  const tHead = ['Peso','ZONA I','ZONA II','ZONA III','ZONA IV'];
  const tData = [tHead];
  PESOS_TARIFA.forEach(p => {
    const row = [`${p} KG`];
    ZONAS_KEY.forEach(zk => { const v = d.tarifa[zk] ? d.tarifa[zk][p] : null; row.push(v !== null && v !== undefined ? Math.round(v) : ''); });
    tData.push(row);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(tData);
  ws2['!cols'] = [{wch:12},{wch:14},{wch:14},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Tarifario');

  // Equilibrio
  const eqData = [['Sucursal','Zonas','Fijo mensual','Cobra/guía','Costo var/guía','Contribución','Equilibrio (guías/mes)']];
  (d.equilibrios||[]).forEach(eq => {
    eqData.push([eq.nombre, (eq.zonas||[]).join(' '), Math.round(eq.fijo), Math.round(eq.precioCobra), Math.round(eq.cv), Math.round(eq.contrib), eq.guias !== null ? eq.guias : 'no rentable']);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(eqData);
  ws3['!cols'] = [{wch:18},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Equilibrio sucursales');

  // Sucursales detalle
  const sData = [['Sucursal','Concepto','Valor']];
  (e.sucursales||[]).forEach(s => {
    CONCEPTOS_FIJOS.forEach(c => sData.push([s.nombre, c.label, s.fijos[c.key]||0]));
    sData.push([s.nombre, 'Troncal', s.troncal||0]);
    sData.push([s.nombre, 'Mix de zonas', ZONAS_KEY.map(z=>`${z} ${(mixZonasSuc(s)[z]||0)}%`).join('  ')]);
    RUTAS.forEach(r => {
      const rd = s.rutas[r.id];
      const veh = (e.vehiculos||[]).find(v=>v.id===rd.vehiculoId);
      sData.push([s.nombre, `Ruta ${r.id}`, `${veh?veh.nombre:'—'} · viaje ${rd.costoViaje} · ${rd.paradas} paradas`]);
    });
    sData.push([]);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(sData);
  ws4['!cols'] = [{wch:18},{wch:20},{wch:40}];
  XLSX.utils.book_append_sheet(wb, ws4, 'Sucursales');

  const fa = new Date(cot.fecha).toISOString().slice(0, 10);
  const safe = String(cot.titulo).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
  XLSX.writeFile(wb, `Tarifario_${safe || 'general'}_${fa}.xlsx`);
}

/* ============= INIT ============= */
renderGlobales();
renderVehiculos();
renderMixRutas();
renderSucursales();
renderHistorial();
recalc();
const lu = document.getElementById('lastUpdate');
if (lu) lu.textContent = 'Cargado: ' + new Date().toLocaleTimeString('es-AR');
