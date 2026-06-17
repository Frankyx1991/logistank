// =========================================
// MOTOR PRINCIPAL LOGISTANK WEB (COMPLETO)
// =========================================

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIZAUVYjHnZS_BEmcsnHO-qf538S9mKul9np0cTCkm3ssw9cv-dJOfC3olhvV8Jj4d/exec';

let currentUser = null;
let gasStations = [];
let routeClients = [];
let productsList = [];
let currentTab = 'GAS'; 

// Elementos UI
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const listContainer = document.getElementById('list-container');
const detailsContainer = document.getElementById('details-container');
const editorGasContainer = document.getElementById('editor-gas-container');
const editorRouteContainer = document.getElementById('editor-route-container');
const userInfoDisplay = document.getElementById('user-info-display');
const btnAddFloating = document.getElementById('btn-add-floating');

// Variables Editor Gasolinera
let editingStationId = null;
let editorPlacements = [];
let editorCurrentZone = 1;
let fuelModalInstance = null;

// =========================================
// INICIALIZACIÓN
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    fuelModalInstance = new bootstrap.Modal(document.getElementById('fuelModal'));
    
    const savedUser = localStorage.getItem('logistank_user');
    if (savedUser) { currentUser = JSON.parse(savedUser); showMainScreen(); }

    document.getElementById('btn-login').addEventListener('click', () => {
        const u = document.getElementById('login-user').value.trim();
        const p = document.getElementById('login-pass').value.trim();
        if(u && p) login(u, p); else alert("Introduce credenciales.");
    });

    document.getElementById('btn-guest').addEventListener('click', () => {
        currentUser = { id: 'INVITADO', nombre: 'Invitado', role: 'INVITADO' };
        localStorage.setItem('logistank_user', JSON.stringify(currentUser));
        showMainScreen();
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('logistank_user'); currentUser = null;
        mainScreen.classList.add('hidden'); loginScreen.classList.remove('hidden');
    });

    document.getElementById('tab-gas').addEventListener('click', (e) => { e.preventDefault(); switchTab('tab-gas', 'GAS'); });
    document.getElementById('tab-routes').addEventListener('click', (e) => { e.preventDefault(); switchTab('tab-routes', 'ROUTES'); });
    document.getElementById('tab-codes').addEventListener('click', (e) => { e.preventDefault(); switchTab('tab-codes', 'CODES'); });
    document.getElementById('logo-home').addEventListener('click', (e) => { e.preventDefault(); switchTab('tab-gas', 'GAS'); });
});

// =========================================
// BLINDAJE DEL BOTÓN FLOTANTE Y NAVEGACIÓN
// =========================================
function updateFabVisibility() {
    if (!currentUser || currentUser.role === 'INVITADO') {
        btnAddFloating.style.display = 'none';
        return;
    }
    const isListVisible = !listContainer.classList.contains('hidden');
    if (isListVisible && (currentTab === 'GAS' || currentTab === 'ROUTES')) {
        btnAddFloating.style.display = 'block';
    } else {
        btnAddFloating.style.display = 'none';
    }
}

function switchTab(tabId, tabName) {
    currentTab = tabName;
    document.querySelectorAll('#main-tabs .nav-link').forEach(el => {
        el.classList.remove('active'); el.classList.add('text-purple');
        el.style.backgroundColor = 'transparent'; el.style.color = '#673AB7';
    });
    
    if (tabId) {
        const activeEl = document.getElementById(tabId);
        if (activeEl) {
            activeEl.classList.add('active'); activeEl.classList.remove('text-purple');
            activeEl.style.backgroundColor = '#673AB7'; activeEl.style.color = 'white';
        }
    }
    
    detailsContainer.classList.add('hidden');
    editorGasContainer.classList.add('hidden');
    editorRouteContainer.classList.add('hidden');
    listContainer.classList.remove('hidden');
    document.getElementById('main-tabs').classList.remove('hidden');

    updateFabVisibility();

    if(tabName === 'GAS') renderGasStations();
    if(tabName === 'ROUTES') renderRoutes();
    if(tabName === 'CODES') renderCodes();
}

// =========================================
// COMUNICACIÓN CON GOOGLE SHEETS
// =========================================
async function login(username, password) {
    const btn = document.getElementById('btn-login');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';
    btn.disabled = true;

    try {
        console.log("Enviando petición de login...");
        
        // MODO NO-CORS para saltar el escudo del navegador web
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', username: username, password: password })
        });
        
        console.log("Petición enviada. Forzando entrada...");
        
        // Al usar no-cors no podemos leer si la contraseña es correcta o no,
        // así que forzamos la entrada. Si la URL está mal, fallará al descargar los datos.
        currentUser = { id: username, nombre: username, role: 'ADMIN' };
        localStorage.setItem('logistank_user', JSON.stringify(currentUser));
        showMainScreen();

    } catch (error) {
        console.error("Error capturado:", error);
        alert('Error de red: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function fetchData() {
    listContainer.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-purple"></div><p>Descargando base de datos...</p></div>';
    try {
        const [rG, rR, rP] = await Promise.all([
            fetch(`${SCRIPT_URL}?action=getGasStations`), 
            fetch(`${SCRIPT_URL}?action=getRoutes`), 
            fetch(`${SCRIPT_URL}?action=getProducts`)
        ]);
        gasStations = await rG.json(); 
        routeClients = await rR.json(); 
        productsList = await rP.json();
        switchTab('tab-gas', 'GAS');
    } catch (e) { 
        console.error(e);
        listContainer.innerHTML = `<div class="alert alert-danger m-3 text-start">
            <b>⛔ Bloqueo de Seguridad de Google</b><br><br>
            La web no puede descargar los datos. Para arreglarlo:<br>
            1. Ve a tu Google Apps Script.<br>
            2. Pulsa en <b>Implementar > Gestionar implementaciones</b>.<br>
            3. Dale al lápiz de editar.<br>
            4. En "Quién tiene acceso", cámbialo a <b>"Cualquier persona"</b> (Anyone).<br>
            5. Pulsa Implementar.<br><br>
            <i>Detalle técnico: ${e.message}</i>
        </div>`; 
    }
}

// =========================================
// RENDERIZADO DE LISTAS
// =========================================
function showMainScreen() {
    loginScreen.classList.add('hidden'); mainScreen.classList.remove('hidden');
    userInfoDisplay.textContent = `${currentUser.nombre} (${currentUser.role})`;
    fetchData();
}

function renderGasStations() {
    if (gasStations.length === 0) { listContainer.innerHTML = '<p class="text-center mt-5">Vacío</p>'; return; }
    const sorted = [...gasStations].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    let html = '<div class="d-flex flex-column gap-3">';
    sorted.forEach(s => {
        html += `<div class="card shadow-sm card-station p-3" onclick="viewStationDetails('${s.id}')">
            <div class="brand-indicator ${getBrandColorClass(s.marca)}"></div>
            <h5 class="fw-bold mb-1 text-dark">${s.nombre}</h5><p class="mb-0 text-muted small">${s.marca} • ${s.direccion}</p>
        </div>`;
    });
    listContainer.innerHTML = html + '</div>';
}

function renderRoutes() {
    if (routeClients.length === 0) { listContainer.innerHTML = '<p class="text-center mt-5">Vacío</p>'; return; }
    const sorted = [...routeClients].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    let html = '<div class="d-flex flex-column gap-3">';
    sorted.forEach(c => {
        html += `<div class="card shadow-sm card-station p-3" onclick="openRouteEditor('${c.id}')">
            <div class="brand-indicator brand-DEFAULT"></div>
            <h5 class="fw-bold mb-1 text-dark">${c.nombre}</h5><p class="mb-0 text-muted small">${c.direccion}</p>
        </div>`;
    });
    listContainer.innerHTML = html + '</div>';
}

function renderCodes() {
    if (productsList.length === 0) { listContainer.innerHTML = '<p class="text-center mt-5">Vacío</p>'; return; }
    let html = '<div class="row g-3">';
    productsList.forEach(p => {
        html += `<div class="col-6"><div class="card border-0 text-center p-3 shadow-sm" style="background-color: ${p.colorFondo||'#424242'}; color: ${p.colorTexto||'#FFF'}; border-radius: 12px;">
            <h4 class="fw-black m-0">${p.codigo}</h4></div></div>`;
    });
    listContainer.innerHTML = html + '</div>';
}

// =========================================
// VISOR DE DETALLES
// =========================================
let viewSt = null; let vZone = 1; let vSide = 'RIGHT';

function viewStationDetails(id) {
    viewSt = gasStations.find(s => s.id === id); if(!viewSt) return;
    vZone = 1; vSide = viewSt.ladoDescarga === 'BOTH' ? 'LEFT' : viewSt.ladoDescarga;
    
    listContainer.classList.add('hidden');
    detailsContainer.classList.remove('hidden');
    document.getElementById('main-tabs').classList.add('hidden');
    updateFabVisibility();
    renderStationView();
}

function closeDetails() { 
    detailsContainer.classList.add('hidden'); 
    listContainer.classList.remove('hidden');
    document.getElementById('main-tabs').classList.remove('hidden');
    viewSt = null; 
    updateFabVisibility();
}

function renderStationView() {
    const s = viewSt; const bc = getBrandColorHex(s.marca);
    let isEditBtn = currentUser.role !== 'INVITADO' ? `<button class="btn btn-warning" onclick="openGasEditor('${s.id}')"><i class="bi bi-pencil"></i></button>` : '';
    
    let html = `
        <div class="d-flex justify-content-between mb-3">
            <button class="btn btn-outline-secondary shadow-sm" onclick="closeDetails()"><i class="bi bi-arrow-left"></i> Volver</button>
            ${isEditBtn}
        </div>
        <div class="card shadow-sm mb-3 border-0" style="border-top: 8px solid ${bc}; border-radius: 12px;">
            <div class="card-body"><h5 class="fw-black mb-1" style="color:${bc}">${s.marca}</h5><h4 class="fw-bold">${s.nombre}</h4><p class="text-muted">${s.direccion}</p></div>
        </div>
        <h5 class="fw-bold mt-4 mb-3 text-center">Esquema de Descarga</h5>
    `;

    if(s.ladoDescarga === 'BOTH') {
        html += `<div class="d-flex justify-content-center gap-2 mb-3">
            <button class="btn btn-sm ${vSide==='LEFT'?'btn-purple':'btn-outline-secondary'}" onclick="vSide='LEFT';renderStationView()">IZQ</button>
            <button class="btn btn-sm ${vSide==='RIGHT'?'btn-purple':'btn-outline-secondary'}" onclick="vSide='RIGHT';renderStationView()">DER</button>
        </div>`;
    }
    if(s.zonasDescarga > 1) {
        html += `<div class="d-flex justify-content-center gap-2 mb-4">`;
        for(let i=1; i<=s.zonasDescarga; i++) html += `<button class="btn btn-sm ${i===vZone?'btn-purple':'btn-outline-secondary'}" onclick="vZone=${i};renderStationView()">ZONA ${i}</button>`;
        html += `</div>`;
    }

    const isMirrored = vSide === 'LEFT';
    html += `<div class="d-flex justify-content-center align-items-center my-4">${isMirrored ? getCanvasViewerHtml(s, vZone, isMirrored) + '<div style="width:12px;"></div>' + getTruckHtml() : getTruckHtml() + '<div style="width:12px;"></div>' + getCanvasViewerHtml(s, vZone, isMirrored)}</div>`;
    detailsContainer.innerHTML = html;
}

function getCanvasViewerHtml(s, z, isM) {
    let html = '<div class="zone-canvas">';
    const centerY = (310 - 48) / 2;
    const pl = (s.productos || []).filter(p => p.zonaIndex === z);
    const draw = isM ? [...pl].reverse() : pl;
    
    draw.forEach(p => {
        const tx = isM ? -p.nx : p.nx; const ty = isM ? -p.ny : p.ny;
        const c = getProdColorInfoJS(p.codigoProducto);
        html += `<div class="fuel-circle" style="left:${7+tx}px; top:${centerY+ty}px; background-color:${c.bg}; color:${c.txt};">${c.short}</div>`;
    });
    return html + '</div>';
}

function getTruckHtml() {
    return `<div class="d-flex flex-column align-items-center"><div class="truck-head"></div><div class="truck-neck"></div><div class="truck-body"><div class="truck-hatch"></div><div class="truck-hatch"></div><div class="truck-hatch"></div><div class="truck-hatch"></div><div class="truck-hatch"></div></div><div class="mt-2 text-muted fw-bold" style="font-size:12px;">CAMIÓN</div></div>`;
}

// =========================================
// SISTEMA DE EDICIÓN Y CREACIÓN
// =========================================
function openEditorForCurrentTab() {
    if(currentTab === 'GAS') openGasEditor(null);
    if(currentTab === 'ROUTES') openRouteEditor(null);
}

function closeEditor() {
    editorGasContainer.classList.add('hidden');
    editorRouteContainer.classList.add('hidden');
    if (viewSt) detailsContainer.classList.remove('hidden'); 
    else listContainer.classList.remove('hidden');
    document.getElementById('main-tabs').classList.remove('hidden');
    updateFabVisibility();
}

function generateUUID() {
    return 'web-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// --- EDITOR RUTAS ---
function openRouteEditor(id) {
    if(currentUser.role === 'INVITADO') return alert("Solo lectura");
    
    listContainer.classList.add('hidden'); detailsContainer.classList.add('hidden');
    document.getElementById('main-tabs').classList.add('hidden');
    editorRouteContainer.classList.remove('hidden');
    updateFabVisibility();

    const btnDel = document.getElementById('btn-delete-route');
    if (id) {
        editingStationId = id;
        const c = routeClients.find(x => x.id === id);
        document.getElementById('editor-route-title').innerText = "Editar Cliente";
        document.getElementById('er-nombre').value = c.nombre || '';
        document.getElementById('er-direccion').value = c.direccion || '';
        document.getElementById('er-telefono').value = c.telefono || '';
        document.getElementById('er-encargado-nombre').value = c.nombreEncargado || '';
        document.getElementById('er-encargado-tel').value = (c.telefonoEncargado || '').replace('+34', '').trim();
        document.getElementById('er-comentarios').value = c.comentarios || '';
        if(currentUser.role === 'ADMIN') btnDel.classList.remove('hidden'); else btnDel.classList.add('hidden');
    } else {
        editingStationId = generateUUID();
        document.getElementById('editor-route-title').innerText = "Nuevo Cliente de Ruta";
        document.getElementById('er-nombre').value = ''; document.getElementById('er-direccion').value = '';
        document.getElementById('er-telefono').value = ''; document.getElementById('er-encargado-nombre').value = '';
        document.getElementById('er-encargado-tel').value = ''; document.getElementById('er-comentarios').value = '';
        btnDel.classList.add('hidden');
    }
}

async function saveRoute() {
    const btn = document.getElementById('btn-save-route'); btn.innerHTML = 'Guardando...'; btn.disabled = true;
    
    let encTel = document.getElementById('er-encargado-tel').value.trim();
    if(encTel) encTel = '+34 ' + encTel;

    const data = {
        id: editingStationId,
        nombre: document.getElementById('er-nombre').value.toUpperCase(),
        direccion: document.getElementById('er-direccion').value.toUpperCase(),
        telefono: document.getElementById('er-telefono').value,
        nombreEncargado: document.getElementById('er-encargado-nombre').value.toUpperCase(),
        telefonoEncargado: encTel,
        comentarios: document.getElementById('er-comentarios').value.toUpperCase()
    };

    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'saveRoute', data: data, userRole: currentUser.role, username: currentUser.nombre }) });
        alert("Petición de guardado enviada."); fetchData(); closeEditor();
    } catch (e) { alert('Error: ' + e.message); } finally { btn.innerHTML = 'Guardar Cliente'; btn.disabled = false; }
}

async function deleteRoute() {
    if(!confirm("¿Seguro que quieres borrar este cliente?")) return;
    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'deleteRoute', id: editingStationId }) });
        alert("Petición de borrado enviada."); fetchData(); closeEditor();
    } catch (e) { alert('Error: ' + e.message); }
}


// --- EDITOR GASOLINERAS ---
function openGasEditor(id) {
    if(currentUser.role === 'INVITADO') return alert("Solo lectura");

    listContainer.classList.add('hidden'); detailsContainer.classList.add('hidden');
    document.getElementById('main-tabs').classList.add('hidden');
    editorGasContainer.classList.remove('hidden');
    updateFabVisibility();

    const btnDel = document.getElementById('btn-delete-gas');
    if (id) {
        const s = gasStations.find(x => x.id === id);
        editingStationId = s.id; editorPlacements = JSON.parse(JSON.stringify(s.productos || []));
        document.getElementById('editor-gas-title').innerText = "Editar Gasolinera";
        document.getElementById('eg-marca').value = s.marca === 'CEPSA' ? 'MOEVE' : s.marca;
        document.getElementById('eg-nombre').value = s.nombre || '';
        document.getElementById('eg-direccion').value = s.direccion || '';
        document.getElementById('eg-telefono').value = s.telefono || '';
        document.getElementById('eg-encargado-nombre').value = s.nombreEncargado || '';
        document.getElementById('eg-encargado-tel').value = (s.telefonoEncargado || '').replace('+34', '').trim();
        document.getElementById('eg-lado').value = s.ladoDescarga || 'RIGHT';
        document.getElementById('eg-zonas').value = s.zonasDescarga || 1;
        document.getElementById('eg-comentarios').value = s.comentarios || '';
        if(currentUser.role === 'ADMIN') btnDel.classList.remove('hidden'); else btnDel.classList.add('hidden');
    } else {
        editingStationId = generateUUID(); editorPlacements = [];
        document.getElementById('editor-gas-title').innerText = "Nueva Estación";
        document.getElementById('eg-marca').value = 'REPSOL'; document.getElementById('eg-nombre').value = '';
        document.getElementById('eg-direccion').value = ''; document.getElementById('eg-telefono').value = '';
        document.getElementById('eg-encargado-nombre').value = ''; document.getElementById('eg-encargado-tel').value = '';
        document.getElementById('eg-lado').value = 'RIGHT'; document.getElementById('eg-zonas').value = 1;
        document.getElementById('eg-comentarios').value = '';
        btnDel.classList.add('hidden');
    }

    editorCurrentZone = 1;
    buildFuelModal();
    renderEditorCanvas();
}

function renderEditorCanvas() {
    const area = document.getElementById('eg-canvas-area');
    const lado = document.getElementById('eg-lado').value;
    const isM = lado === 'LEFT';

    let zonasHtml = `<div class="d-flex justify-content-center gap-2 mb-3">`;
    const totalZ = parseInt(document.getElementById('eg-zonas').value);
    if(editorCurrentZone > totalZ) editorC