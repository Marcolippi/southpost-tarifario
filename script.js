/* ====================================================
   SOUTHPOST — Calculadora de tarifario v5
   ==================================================== */

const ZONAS = ['ZONA I', 'ZONA II', 'ZONA III', 'ZONA IV'];

// 17 rangos de peso
const RANGOS = [
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

// 8 rangos de Última Milla
const RANGOS_UM = [
  { nombre: '0 - 5 KG',         min: 0,      max: 5,     key: 'um_5'   },
  { nombre: '5,01 - 10 KG',     min: 5.01,   max: 10,    key: 'um_10'  },
  { nombre: '10,01 - 20 KG',    min: 10.01,  max: 20,    key: 'um_20'  },
  { nombre: '20,01 - 50 KG',    min: 20.01,  max: 50,    key: 'um_50'  },
  { nombre: '50,01 - 100 KG',   min: 50.01,  max: 100,   key: 'um_100' },
  { nombre: '100,01 - 150 KG',  min: 100.01, max: 150,   key: 'um_150' },
  { nombre: '150,01 - 200 KG',  min: 150.01, max: 200,   key: 'um_200' },
  { nombre: '200,01 - 500 KG',  min: 200.01, max: 500,   key: 'um_500' },
];

// Devuelve qué rango UM aplica para un rango de peso (por su max)
function umKeyForRango(rangoIdx) {
  const max = RANGOS[rangoIdx].max;
  if (max <= 5)   return 'um_5';
  if (max <= 10)  return 'um_10';
  if (max <= 20)  return 'um_20';
  if (max <= 50)  return 'um_50';
  if (max <= 100) return 'um_100';
  if (max <= 150) return 'um_150';
  if (max <= 200) return 'um_200';
  return 'um_500';
}

const CAMPOS_ZONA_FIJOS_HUB = [
  { key: 'alquiler',    label: 'Alquiler / depósito' },
  { key: 'personal',    label: 'Personal' },
  { key: 'servicios',   label: 'Servicios (luz, agua, internet)' },
  { key: 'combustible', label: 'Combustible / vehículos' },
  { key: 'seguros',     label: 'Seguros e impuestos' },
  { key: 'insumos',     label: 'Insumos (cajas, etiquetas)' },
  { key: 'otros',       label: 'Otros gastos' },
];
const CAMPOS_ZONA_FIJOS_DEST = [
  { key: 'alquiler', label: 'Alquiler local' },
  { key: 'personal', label: 'Personal local' },
  { key: 'otros1',   label: 'Otros gastos 1' },
  { key: 'otros2',   label: 'Otros gastos 2' },
  { key: 'otros3',   label: 'Otros gastos 3' },
];

const DEFAULTS = {
  volTotal: 1000,
  margen: 30,
  absorCot: 100,
  costos: [
    {
      alquiler: 800000, personal: 1500000, servicios: 200000, combustible: 300000,
      seguros: 150000, insumos: 100000, otros: 0,
      um_5: 4000, um_10: 5500, um_20: 7000, um_50: 9500,
      um_100: 12000, um_150: 14500, um_200: 17000, um_500: 25000,
    },
    {
      alquiler: 400000, personal: 600000, otros1: 0, otros2: 0, otros3: 0,
      troncal: 80000,
      um_5: 6000, um_10: 8500, um_20: 11000, um_50: 14000,
      um_100: 17000, um_150: 20000, um_200: 23000, um_500: 33000,
    },
    {
      alquiler: 350000, personal: 500000, otros1: 0, otros2: 0, otros3: 0,
      troncal: 120000,
      um_5: 8000, um_10: 11000, um_20: 14000, um_50: 18000,
      um_100: 22000, um_150: 26000, um_200: 30000, um_500: 42000,
    },
    {
      alquiler: 300000, personal: 400000, otros1: 0, otros2: 0, otros3: 0,
      troncal: 200000,
      um_5: 12000, um_10: 16000, um_20: 21000, um_50: 27000,
      um_100: 33000, um_150: 39000, um_200: 45000, um_500: 60000,
    },
  ],
  // Capacidades por pallet (17 rangos × 3 zonas destino)
  capacidades: [
    [120, 60, 40, 30, 22, 16, 12, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5, 1],
    [120, 60, 40, 30, 22, 16, 12, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5, 1],
    [120, 60, 40, 30, 22, 16, 12, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5, 1],
  ],
  // Matriz de guías del cliente (17 rangos × 4 zonas)
  cotizador: Array(17).fill(null).map(() => [0, 0, 0, 0]),
};

const STORE_KEY = 'tarifario_southpost_v5';

let state = loadState();

function loadState() {
  try {
    const s = localStorage.getItem(STORE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      const base = JSON.parse(JSON.stringify(DEFAULTS));
      for (const k in parsed) {
        if (k === 'costos' && Array.isArray(parsed.costos)) {
          for (let i = 0; i < base.costos.length; i++) {
            base.costos[i] = { ...base.costos[i], ...(parsed.costos[i] || {}) };
          }
        } else if (k === 'capacidades' && Array.isArray(parsed.capacidades)) {
          // Si las capacidades guardadas tienen distinta cantidad de rangos, fusiono
          for (let z = 0; z < base.capacidades.length; z++) {
            const guardadas = parsed.capacidades[z] || [];
            for (let r = 0; r < base.capacidades[z].length; r++) {
              if (guardadas[r] !== undefined) base.capacidades[z][r] = guardadas[r];
            }
          }
        } else if (k === 'cotizador' && Array.isArray(parsed.cotizador)) {
          for (let r = 0; r < base.cotizador.length; r++) {
            const guardada = parsed.cotizador[r];
            if (Array.isArray(guardada)) {
              for (let z = 0; z < 4; z++) {
                if (guardada[z] !== undefined) base.cotizador[r][z] = guardada[z];
              }
            }
          }
        } else {
          base[k] = parsed[k];
        }
      }
      return base;
    }
  } catch (e) {}
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
function renderZonas() {
  const grid = document.getElementById('zonasGrid');
  grid.innerHTML = '';
  for (let z = 0; z < 4; z++) {
    const card = document.createElement('div');
    card.className = 'zona-card' + (z === 0 ? ' hub' : '');
    let html = `<h3>${ZONAS[z]}</h3><div class="subtitle">${z === 0 ? 'Origen / Hub central' : 'Destino · Spoke'}</div>`;

    html += `<div class="group-label">Costos fijos mensuales</div>`;
    const camposFijos = z === 0 ? CAMPOS_ZONA_FIJOS_HUB : CAMPOS_ZONA_FIJOS_DEST;
    camposFijos.forEach(f => {
      html += `<div class="input-row">
        <label>${f.label}</label>
        <input type="number" data-zona="${z}" data-campo="${f.key}" value="${state.costos[z][f.key] || 0}" min="0" step="1000">
      </div>`;
    });

    if (z > 0) {
      html += `<div class="group-label">Troncal</div>`;
      html += `<div class="input-row">
        <label>Costo por pallet (desde Z.I)</label>
        <input type="number" data-zona="${z}" data-campo="troncal" value="${state.costos[z].troncal || 0}" min="0" step="1000">
      </div>`;
    }

    html += `<div class="group-label">Última milla por rango</div>`;
    RANGOS_UM.forEach(r => {
      html += `<div class="um-grid">
        <label>${r.nombre} · $/guía</label>
        <input type="number" data-zona="${z}" data-campo="${r.key}" value="${state.costos[z][r.key] || 0}" min="0" step="100">
      </div>`;
    });

    html += `<div class="input-row subtotal">
      <span>Total fijo</span>
      <span class="val" id="totalZ${z}">$ 0</span>
    </div>`;
    card.innerHTML = html;
    grid.appendChild(card);
  }

  grid.querySelectorAll('input[type=number]').forEach(inp => {
    inp.addEventListener('input', e => {
      const z = +e.target.dataset.zona;
      const campo = e.target.dataset.campo;
      state.costos[z][campo] = +e.target.value || 0;
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
  RANGOS.forEach((r, ri) => {
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

function renderCotizador() {
  const tbl = document.getElementById('tablaCotizador');
  let html = `<thead><tr><th>Rango</th>`;
  for (let z = 0; z < 4; z++) html += `<th>${ZONAS[z]}</th>`;
  html += `<th>Total</th></tr></thead><tbody>`;
  RANGOS.forEach((r, ri) => {
    html += `<tr><td>${r.nombre}</td>`;
    for (let z = 0; z < 4; z++) {
      const v = state.cotizador[ri][z] || 0;
      const cls = v > 0 ? 'guias-pos' : '';
      html += `<td class="${cls}"><input type="number" data-cotrango="${ri}" data-cotzona="${z}" value="${v}" min="0" step="1"></td>`;
    }
    html += `<td id="cotRow${ri}" style="font-family:'JetBrains Mono',monospace; color:var(--primary-deep); font-weight:700;">0</td></tr>`;
  });
  html += `<tr><td class="total-row">TOTAL</td>`;
  for (let z = 0; z < 4; z++) html += `<td class="total-row num" id="cotCol${z}">0</td>`;
  html += `<td class="total-row num" id="cotGrandTotal">0</td></tr>`;
  html += `</tbody>`;
  tbl.innerHTML = html;

  tbl.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
      const ri = +e.target.dataset.cotrango;
      const z = +e.target.dataset.cotzona;
      state.cotizador[ri][z] = +e.target.value || 0;
      e.target.parentElement.classList.toggle('guias-pos', state.cotizador[ri][z] > 0);
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
   FORMATEO Y CÁLCULOS
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

function totalFijoZona(z) {
  const camposFijos = z === 0 ? CAMPOS_ZONA_FIJOS_HUB : CAMPOS_ZONA_FIJOS_DEST;
  let total = 0;
  camposFijos.forEach(f => total += +state.costos[z][f.key] || 0);
  return total;
}

function totalFijoEmpresa() {
  let t = 0;
  for (let z = 0; z < 4; z++) t += totalFijoZona(z);
  return t;
}

/**
 * Costo por guía en (rango, zona).
 *
 *  PARA Z.I:
 *    (fijos Z.I × absor%) / volumen_total + UM Z.I[rango]
 *
 *  PARA Z.II/III/IV:
 *    (fijos Z.I × absor%) / volumen_total
 *  + (fijos Z.dest × absor%) / volumen_total
 *  + (troncal Z.dest / capacidad_pallet[rango])
 *  + UM Z.dest[rango]
 */
function costoPorGuia(rangoIdx, zonaIdx, absorPct) {
  const f = absorPct / 100;
  const volTotal = state.volTotal || 1;

  const fijoZ0 = totalFijoZona(0);
  const fijoZ0PorGuia = (fijoZ0 * f) / volTotal;

  const umKey = umKeyForRango(rangoIdx);
  const umZ0 = +state.costos[0][umKey] || 0;

  if (zonaIdx === 0) {
    return fijoZ0PorGuia + umZ0;
  }

  const fijoZ = totalFijoZona(zonaIdx);
  const fijoZPorGuia = (fijoZ * f) / volTotal;
  const cap = state.capacidades[zonaIdx - 1][rangoIdx] || 0;
  const troncal = +state.costos[zonaIdx].troncal || 0;
  const troncalPorGuia = cap > 0 ? troncal / cap : 0;
  const umDest = +state.costos[zonaIdx][umKey] || 0;

  return fijoZ0PorGuia + fijoZPorGuia + troncalPorGuia + umDest;
}

/* ====================================================
   RECALCULAR
   ==================================================== */
function recalc() {
  // Subtotales fijos por zona
  for (let z = 0; z < 4; z++) {
    const t = totalFijoZona(z);
    const el = document.getElementById('totalZ' + z);
    if (el) el.textContent = fmt(t);
  }

  const margenDecimal = state.margen / 100;
  const factorPrecio = (1 - margenDecimal) > 0 ? 1 / (1 - margenDecimal) : null;

  const matCostos = [];
  const matPrecios = [];
  const matGanancias = [];
  RANGOS.forEach((rango, ri) => {
    const filaC = [], filaP = [], filaG = [];
    for (let z = 0; z < 4; z++) {
      const c = costoPorGuia(ri, z, state.absorCot);
      const p = factorPrecio !== null ? c * factorPrecio : null;
      const g = p !== null ? p - c : null;
      filaC.push(c); filaP.push(p); filaG.push(g);
    }
    matCostos.push(filaC); matPrecios.push(filaP); matGanancias.push(filaG);
  });

  // Guardo en variables globales para acceso del PDF
  window._matPrecios = matPrecios;
  window._matCostos = matCostos;

  renderTabla('tablaPrecios', matPrecios, 'precio');
  renderTabla('tablaCostos', matCostos, 'costo');
  renderTabla('tablaGanancia', matGanancias, 'precio');

  // Resumen del cliente
  let totalGuias = 0;
  let costoTotalCliente = 0;
  let precioTotalCliente = 0;
  const colTotals = [0, 0, 0, 0];

  for (let ri = 0; ri < RANGOS.length; ri++) {
    let rowTotal = 0;
    for (let z = 0; z < 4; z++) {
      const guias = state.cotizador[ri][z] || 0;
      if (guias > 0) {
        const cUnit = matCostos[ri][z];
        const pUnit = matPrecios[ri][z];
        costoTotalCliente += cUnit * guias;
        precioTotalCliente += pUnit * guias;
        totalGuias += guias;
        rowTotal += guias;
        colTotals[z] += guias;
      }
    }
    const rowEl = document.getElementById('cotRow' + ri);
    if (rowEl) rowEl.textContent = rowTotal;
  }
  for (let z = 0; z < 4; z++) {
    const el = document.getElementById('cotCol' + z);
    if (el) el.textContent = colTotals[z];
  }
  document.getElementById('cotGrandTotal').textContent = totalGuias;

  // Costos variables del cliente (sin fijos)
  let costoVariableCliente = 0;
  for (let ri = 0; ri < RANGOS.length; ri++) {
    const umKey = umKeyForRango(ri);
    for (let z = 0; z < 4; z++) {
      const guias = state.cotizador[ri][z] || 0;
      if (guias > 0) {
        if (z === 0) {
          const umZ0 = +state.costos[0][umKey] || 0;
          costoVariableCliente += umZ0 * guias;
        } else {
          const cap = state.capacidades[z - 1][ri] || 0;
          const troncalPorGuia = cap > 0 ? (+state.costos[z].troncal || 0) / cap : 0;
          const umDest = +state.costos[z][umKey] || 0;
          costoVariableCliente += (troncalPorGuia + umDest) * guias;
        }
      }
    }
  }

  const gananciaCliente = precioTotalCliente - costoTotalCliente;
  const margenComercial = precioTotalCliente > 0 ? (gananciaCliente / precioTotalCliente * 100) : 0;
  const precioPromCliente = totalGuias > 0 ? precioTotalCliente / totalGuias : 0;
  const fijosTot = totalFijoEmpresa();
  const fijosImputados = fijosTot * (state.absorCot / 100);
  const fijosNoImputados = fijosTot - fijosImputados;
  const resultadoSiUnico = precioTotalCliente - fijosTot - costoVariableCliente;

  document.getElementById('resGuias').textContent = totalGuias.toLocaleString('es-AR');
  document.getElementById('resCosto').textContent = fmt(costoTotalCliente);
  document.getElementById('resPrecio').textContent = fmt(precioTotalCliente);
  document.getElementById('resGanancia').textContent = fmt(gananciaCliente);

  document.getElementById('plIng').textContent = fmt(precioTotalCliente);
  document.getElementById('plCostoTotal').textContent = fmt(fijosTot + costoVariableCliente);
  document.getElementById('plFijos').textContent = fmt(fijosTot);
  document.getElementById('plVar').textContent = fmt(costoVariableCliente);
  const pr = document.getElementById('plResultado');
  pr.textContent = fmt(resultadoSiUnico);
  pr.style.color = resultadoSiUnico < 0 ? 'var(--danger)' : 'var(--primary-deep)';

  document.getElementById('kpiMargen').textContent = fmtPct(margenComercial);
  document.getElementById('kpiMargenObj').textContent = state.margen + '%';
  document.getElementById('kpiPrecioProm').textContent = fmt(precioPromCliente);
  document.getElementById('kpiNoCubierto').textContent = fmt(fijosNoImputados);

  // Warning box
  const warnContainer = document.getElementById('warnContainer');
  let warnHtml = '';
  if (totalGuias === 0) {
    warnHtml = `<div class="warn-box"><strong>Sin datos:</strong> cargá las cantidades de guías que despacha el cliente en la matriz del paso 04 para ver el tarifario y resumen.</div>`;
  } else if (state.absorCot < 100 && fijosNoImputados > 0) {
    warnHtml = `<div class="warn-box">
      <strong>Margen comercial sobre el cliente: ${fmtPct(margenComercial)}.</strong>
      Como solo le imputaste el ${state.absorCot}% de los fijos, te quedan <strong>${fmt(fijosNoImputados)}</strong> de costos fijos por cubrir con OTROS clientes o absorberlos vos. Asegurate de tener volumen suficiente en otros clientes.
    </div>`;
  } else if (state.absorCot >= 100) {
    if (resultadoSiUnico >= 0) {
      warnHtml = `<div class="warn-box success"><strong>Tarifa con 100% absorción.</strong> Este cliente solo cubre TODOS tus costos fijos y deja un resultado positivo de ${fmt(resultadoSiUnico)}. Posiblemente tu tarifa esté alta vs. competencia.</div>`;
    } else {
      warnHtml = `<div class="warn-box danger"><strong>¡Atención!</strong> Aun con 100% de absorción y solo este cliente, tu resultado mensual sería negativo (${fmt(resultadoSiUnico)}). El volumen del cliente NO alcanza para cubrir tus costos fijos. Necesitás más volumen total o reducir costos fijos.</div>`;
    }
  }
  warnContainer.innerHTML = warnHtml;
}

function renderTabla(id, matriz, tipo) {
  const tbl = document.getElementById(id);
  let html = `<thead><tr><th style="text-align:left;">Rango de peso</th>`;
  for (let z = 0; z < 4; z++) {
    html += `<th class="zone-header${z === 0 ? ' hub' : ''}">${ZONAS[z]}</th>`;
  }
  html += `</tr></thead><tbody>`;
  RANGOS.forEach((r, ri) => {
    html += `<tr><td class="range-label">${r.nombre}</td>`;
    for (let z = 0; z < 4; z++) {
      const v = matriz[ri][z];
      const guias = state.cotizador[ri][z] || 0;
      let cls = tipo === 'costo' ? 'cost-cell' : 'price';
      if (guias > 0 && tipo !== 'costo') cls += ' has-guias';
      else if (guias === 0 && tipo === 'precio') cls += ' empty';
      const badge = guias > 0 && tipo !== 'costo' ? `<span class="badge-g">${guias}</span>` : '';
      html += `<td class="${cls}">${fmt(v)}${badge}</td>`;
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
  document.getElementById('modalClientName').value = '';
  document.getElementById('modalPDF').classList.add('active');
  setTimeout(() => document.getElementById('modalClientName').focus(), 100);
}
function cerrarModal() {
  document.getElementById('modalPDF').classList.remove('active');
}
function confirmarExportPDF() {
  const nombre = document.getElementById('modalClientName').value.trim();
  cerrarModal();
  generarPDF(nombre || 'Sin especificar');
}

// Cerrar modal con click fuera o Escape
document.addEventListener('click', e => {
  if (e.target.id === 'modalPDF') cerrarModal();
});
document.addEventListener('keydown', e => {
  const modal = document.getElementById('modalPDF');
  if (!modal || !modal.classList.contains('active')) return;
  if (e.key === 'Escape') cerrarModal();
  if (e.key === 'Enter') confirmarExportPDF();
});

/* ====================================================
   GENERAR PDF
   ==================================================== */
function fechaArgentina() {
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date();
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}, ${d.getFullYear()}`;
}

function generarPDF(nombreCliente) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;
  const margin = 15;

  // ======== ENCABEZADO ========
  // Logo (circulito azul-cyan + texto "SOUTHPOST")
  // Usamos un círculo simple. Para emular el degradado, dibujamos varios círculos de tamaño decreciente.
  const logoX = margin + 4;
  const logoY = margin + 6;
  // Círculo principal con un color del medio del degradado
  doc.setFillColor(43, 128, 200);
  doc.circle(logoX, logoY, 2.5, 'F');
  doc.setFillColor(43, 212, 217);
  doc.circle(logoX + 0.6, logoY + 0.6, 1.4, 'F');

  // Texto SOUTHPOST
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(13, 44, 102); // primary-deep
  doc.text('SOUTHPOST', logoX + 5, logoY + 1.5);

  // Fecha arriba a la derecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('FECHA DE EMISIÓN', pageW - margin, margin + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(13, 44, 102);
  doc.text(fechaArgentina(), pageW - margin, margin + 9, { align: 'right' });

  // Línea separadora
  doc.setDrawColor(10, 22, 40);
  doc.setLineWidth(0.6);
  doc.line(margin, margin + 14, pageW - margin, margin + 14);

  // ======== TÍTULO + CLIENTE ========
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 75, 168);
  doc.text('TARIFARIO SUGERIDO', pageW / 2, margin + 22, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(13, 44, 102);
  doc.text(`Cliente: ${nombreCliente}`, pageW / 2, margin + 31, { align: 'center' });

  // ======== TARIFARIO ========
  const matPrecios = window._matPrecios || [];
  const headers = [['Rango de peso', 'Z. I', 'Z. II', 'Z. III', 'Z. IV']];
  const body = RANGOS.map((r, ri) => {
    const fila = [r.nombre];
    for (let z = 0; z < 4; z++) {
      fila.push(fmt(matPrecios[ri] ? matPrecios[ri][z] : 0));
    }
    return fila;
  });

  doc.autoTable({
    head: headers,
    body: body,
    startY: margin + 38,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.6,
      lineColor: [197, 210, 227],
      lineWidth: 0.1,
      textColor: [13, 44, 102],
    },
    headStyles: {
      fillColor: [10, 22, 40],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'right',
      cellPadding: 2,
    },
    columnStyles: {
      0: {
        halign: 'left',
        cellWidth: 42,
        fillColor: [244, 247, 251],
        fontStyle: 'italic',
        textColor: [10, 22, 40],
        fontSize: 8.5,
      },
      1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      3: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
      4: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [246, 249, 253],
    },
    didParseCell: function (data) {
      // Color de header diferenciado para Zona I (HUB)
      if (data.section === 'head') {
        if (data.column.index === 1) data.cell.styles.fillColor = [10, 165, 170]; // cyan-deep para Z.I
        else if (data.column.index >= 2) data.cell.styles.fillColor = [13, 44, 102]; // primary-deep
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY;

  // ======== AVISO ========
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

  // ======== PIE DE PÁGINA ========
  const footerY = pageH - margin + 2;
  doc.setDrawColor(197, 210, 227);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text('SOUTHPOST · Calculadora de tarifario v5', margin, footerY);
  doc.text('Página 1 de 1', pageW - margin, footerY, { align: 'right' });

  // ======== GUARDAR ========
  const fechaArchivo = new Date().toISOString().slice(0, 10);
  const safeName = nombreCliente.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
  doc.save(`Tarifario_${safeName || 'cliente'}_${fechaArchivo}.pdf`);
}

/* ====================================================
   RESET
   ==================================================== */
function resetAll() {
  if (!confirm('¿Estás seguro? Se van a borrar todos los datos cargados y volver a los valores por defecto.')) return;
  state = JSON.parse(JSON.stringify(DEFAULTS));
  saveState();
  renderGlobales();
  renderZonas();
  renderCapacidades();
  renderCotizador();
  recalc();
}

/* ====================================================
   INIT
   ==================================================== */
renderGlobales();
renderZonas();
renderCapacidades();
renderCotizador();
recalc();
document.getElementById('lastUpdate').textContent = 'Cargado: ' + new Date().toLocaleTimeString('es-AR');
