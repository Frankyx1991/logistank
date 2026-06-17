// =========================================
// MOTOR PRINCIPAL LOGISTANK WEB
// =========================================

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIZAUVYjHnZS_BEmcsnHO-qf538S9mKul9np0cTCkm3ssw9cv-dJOfC3olhvV8Jj4d/exec';

let currentUser = null;
let gasStations = [];
let routeClients = [];
let productsList = [];
let currentTab = 'GAS'; 

// Variables para el Visor de Gasolinera
let currentStationView = null;
let currentZoneView = 1;
let currentSideView = 'RIGHT';

const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const listContainer = document.getElementById('list-container');
const detailsContainer = document.getElementById('details-container');
const userInfoDisplay = document.getElementById('user-info-display');
const btnAddFloating = document.getElementById('btn-add-floating'); // 👈 Referencia al botón +

// =========================================
// INICIALIZACIÓN Y EVENTOS
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('logistank_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainScreen();
    }

    document.getElementById('btn-login').addEventListener('click', () => {
        const user = document.getElementById('login-user').value.trim();
        const pass = document.getElementById('login-pass').value.trim();
        if(user && pass) login(user, pass);
        else alert("Por favor, introduce usuario y contraseña.");
    });

    document.getElementById('btn-guest').addEventListener('click', () => {
        currentUser = { id: 'INVITADO', nombre: 'Invitado', role: 'INVITADO' };
        localStorage.setItem('logistank_user', JSON.stringify(currentUser));
        showMainScreen();
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('logistank_user');
        currentUser = null;
        mainScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    });

    // Control de las pestañas
    document.getElementById('tab-routes').addEventListener('click', (e) => { e.preventDefault(); switchTab('tab-routes', 'ROUTES'); });
    document.getElementById('tab-codes').addEventListener('click', (e) => { e.preventDefault(); switchTab('tab-codes', 'CODES'); });

    // El logo sirve como botón para volver a Gasolineras (Inicio)
    document.getElementById('logo-home').addEventListener('click', (e) => { e.preventDefault(); switchTab(null, 'GAS'); });
});

function switchTab(tabId, tabName) {
    currentTab = tabName;
    
    // Reseteamos botones
    document.querySelectorAll('#main-tabs .nav-link').forEach(el => {
        el.classList.remove('active');
        el.classList.add('text-purple');
        el.style.backgroundColor = 'transparent';
        el.style.color = '#673AB7';
    });
    
    // Pintamos el botón activo si existe (Rutas o Códigos)
    if (tabId) {
        const activeEl = document.getElementById(tabId);
        if (activeEl) {
            activeEl.classList.add('active');
            activeEl.classList.remove('text-purple');
            activeEl.style.backgroundColor = '#673AB7';
            activeEl.style.color = 'white';
        }
    }
    
    // Escondemos detalles y mostramos lista
    detailsContainer.classList.add('hidden');
    listContainer.classList.remove('hidden');

    // 🌟 LÓGICA INTELIGENTE DEL BOTÓN FLOTANTE (+) 🌟
    if (tabName === 'GAS' || tabName === 'ROUTES') {
        btnAddFloating.classList.remove('hidden');
    } else {
        btnAddFloating.classList.add('hidden'); // Lo oculta en Códigos
    }

    if(tabName === 'GAS') renderGasStations();
    if(tabName === 'ROUTES') renderRoutes();
    if(tabName === 'CODES') renderCodes();
}

// =========================================
// FUNCIONES DE RED (API)
// =========================================
async function login(username, password) {
    const btn = document.getElementById('btn-login');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';
    btn.disabled = true;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', username: username, password: password })
        });
        const result = await response.json();
        if (result.success) {
            currentUser = { id: result.id || username, nombre: result.nombre, role: result.role };
            localStorage.setItem('logistank_user', JSON.stringify(currentUser));
            showMainScreen();
        } else alert('Acceso denegado: ' + (result.message || 'Credenciales incorrectas'));
    } catch (error) { alert('Error de conexión: ' + error.message); } 
    finally { btn.innerHTML = originalText; btn.disabled = false; }
}

async function fetchData() {
    listContainer.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-purple"></div><p>Descargando base de datos...</p></div>';
    try {
        const [resGas, resRoutes, resProducts] = await Promise.all([
            fetch(`${SCRIPT_URL}?action=getGasStations`),
            fetch(`${SCRIPT_URL}?action=getRoutes`),
            fetch(`${SCRIPT_URL}?action=getProducts`)
        ]);

        gasStations = await resGas.json();
        routeClients = await resRoutes.json();
        productsList = await resProducts.json();

        switchTab(null, 'GAS'); // Carga gasolineras por defecto
    } catch (error) {
        listContainer.innerHTML = `<div class="alert alert-danger m-3"><b>Error de conexión:</b> ${error.message}</div>`;
    }
}

// =========================================
// RENDERIZADO DE LISTAS (GASOLINERAS, RUTAS Y CÓDIGOS)
// =========================================
function showMainScreen() {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    userInfoDisplay.textContent = `${currentUser.nombre} (${currentUser.role})`;
    fetchData();
}

function renderGasStations() {
    if (gasStations.length === 0) { listContainer.innerHTML = '<p class="text-center text-muted mt-5">No hay gasolineras.</p>'; return; }
    const sorted = [...gasStations].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    let html = '<div class="d-flex flex-column gap-3">';
    sorted.forEach(station => {
        const brandClass = getBrandColorClass(station.marca);
        html += `
            <div class="card shadow-sm card-station p-3" onclick="viewStationDetails('${station.id}')">
                <div class="brand-indicator ${brandClass}"></div>
                <h5 class="fw-bold mb-1 text-dark">${station.nombre || 'Sin Nombre'}</h5>
                <p class="mb-0 text-muted small">${station.marca || ''} • ${station.direccion || ''}</p>
            </div>`;
    });
    html += '</div>';
    listContainer.innerHTML = html;
}

function renderRoutes() {
    if (routeClients.length === 0) { listContainer.innerHTML = '<p class="text-center text-muted mt-5">No hay rutas.</p>'; return; }
    const sorted = [...routeClients].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    let html = '<div class="d-flex flex-column gap-3">';
    sorted.forEach(client => {
        html += `
            <div class="card shadow-sm card-station p-3">
                <div class="brand-indicator brand-DEFAULT"></div>
                <h5 class="fw-bold mb-1 text-dark">${client.nombre || 'Sin nombre'}</h5>
                <p class="mb-0 text-muted small">${client.direccion || 'Sin dirección'}</p>
            </div>`;
    });
    html += '</div>';
    listContainer.innerHTML = html;
}

function renderCodes() {
    if (productsList.length === 0) { listContainer.innerHTML = '<p class="text-center text-muted mt-5">No hay códigos.</p>'; return; }
    
    let html = '<div class="row g-3">';
    productsList.forEach(p => {
        let bg = p.colorFondo || '#424242';
        let txt = p.colorTexto || '#FFFFFF';
        let realName = p.nombreApp || p.nombreOficial || p.codigo;
        html += `
            <div class="col-6">
                <div class="card shadow-sm border-0 text-center p-3" style="background-color: ${bg}; color: ${txt}; border-radius: 12px;">
                    <h4 class="fw-black m-0">${p.codigo}</h4>
                    ${realName !== p.codigo ? `<small style="opacity:0.9;">${realName}</small>` : ''}
                </div>
            </div>`;
    });
    html += '</div>';
    listContainer.innerHTML = html;
}

// =========================================
// EL VISOR WEB DE LA GASOLINERA (CAMIÓN)
// =========================================
function viewStationDetails(id) {
    currentStationView = gasStations.find(s => s.id === id);
    if(!currentStationView) return;
    
    currentZoneView = 1;
    currentSideView = currentStationView.ladoDescarga === 'BOTH' ? 'LEFT' : currentStationView.ladoDescarga;

    listContainer.classList.add('hidden');
    detailsContainer.classList.remove('hidden');
    
    // 🌟 Ocultamos el botón (+) al entrar al visor de detalles 🌟
    btnAddFloating.classList.add('hidden'); 
    
    renderStationDetails();
}

function changeZone(z) { currentZoneView = z; renderStationDetails(); }
function changeSide(s) { currentSideView = s; renderStationDetails(); }

function closeDetails() { 
    detailsContainer.classList.add('hidden'); 
    listContainer.classList.remove('hidden'); 
    currentStationView = null; 
    
    // 🌟 Volvemos a mostrar el botón (+) si estamos en Gasolineras o Rutas 🌟
    if (currentTab === 'GAS' || currentTab === 'ROUTES') {
        btnAddFloating.classList.remove('hidden');
    }
}

function renderStationDetails() {
    const s = currentStationView;
    const brandColor = getBrandColorHex(s.marca);

    let html = `
        <button class="btn btn-outline-secondary mb-3 shadow-sm" onclick="closeDetails()">
            <i class="bi bi-arrow-left"></i> Volver a la Lista
        </button>
        <div class="card shadow-sm mb-3 border-0" style="border-top: 8px solid ${brandColor}; border-radius: 12px;">
            <div class="card-body">
                <h5 class="fw-black mb-1" style="color:${brandColor}">${s.marca}</h5>
                <h4 class="fw-bold text-dark">${s.nombre}</h4>
                <p class="text-muted mb-2">${s.direccion}</p>
                ${s.telefono ? `<p class="mb-0 text-secondary"><i class="bi bi-telephone-fill"></i> ${s.telefono}</p>` : ''}
            </div>
        </div>`;

    if (s.nombreEncargado || s.telefonoEncargado) {
         html += `
         <div class="card shadow-sm border-0 mb-3" style="background-color: rgba(103, 58, 183, 0.05); border-radius: 12px;">
            <div class="card-body">
                <h6 class="fw-bold text-purple mb-3">Datos del Encargado</h6>
                ${s.nombreEncargado ? `<div class="mb-2">👤 ${s.nombreEncargado}</div>` : ''}
                ${s.telefonoEncargado ? `<div>📱 ${s.telefonoEncargado}</div>` : ''}
            </div>
         </div>`;
    }

    html += `<h5 class="fw-bold mt-4 mb-3 text-center">Esquema de Descarga</h5>`;

    if (s.ladoDescarga === 'BOTH') {
        html += `
        <div class="d-flex justify-content-center gap-2 mb-3">
            <button class="btn btn-sm ${currentSideView==='LEFT' ? 'btn-purple' : 'btn-outline-secondary'}" onclick="changeSide('LEFT')">IZQUIERDA</button>
            <button class="btn btn-sm ${currentSideView==='RIGHT' ? 'btn-purple' : 'btn-outline-secondary'}" onclick="changeSide('RIGHT')">DERECHA</button>
        </div>`;
    }

    if (s.zonasDescarga > 1) {
        html += `<div class="d-flex justify-content-center gap-2 mb-4">`;
        for(let i=1; i<=s.zonasDescarga; i++) {
            html += `<button class="btn btn-sm ${i === currentZoneView ? 'btn-purple' : 'btn-outline-secondary'}" onclick="changeZone(${i})">ZONA ${i}</button>`;
        }
        html += `</div>`;
    }

    const isMirrored = currentSideView === 'LEFT';
    const canvasHtml = getCanvasHtml(s, currentZoneView, isMirrored);

    html += `
        <div class="d-flex justify-content-center align-items-center my-4" id="truck-wrapper">
            ${isMirrored ? canvasHtml + '<div style="width:12px;"></div>' + getTruckStaticHtml() : getTruckStaticHtml() + '<div style="width:12px;"></div>' + canvasHtml}
        </div>
    `;

    if (s.comentarios) {
         html += `
         <div class="card shadow-sm border-0 mb-3" style="background-color: #FFF3E0; border-radius: 12px;">
            <div class="card-body">
                <h6 class="fw-bold" style="color: #E65100;">Comentarios</h6>
                <div style="color: #E65100;">${s.comentarios}</div>
            </div>
         </div>`;
    }

    detailsContainer.innerHTML = html;
}

function getCanvasHtml(station, zone, isMirrored) {
    let html = '<div class="zone-canvas">';
    const circleSize = 48;
    const centerY = (310 - circleSize) / 2;

    const placements = station.productos || [];
    const zonePlacements = placements.filter(p => p.zonaIndex === zone);
    const drawList = isMirrored ? [...zonePlacements].reverse() : zonePlacements;

    drawList.forEach(p => {
        const tx = isMirrored ? -p.nx : p.nx;
        const ty = isMirrored ? -p.ny : p.ny;
        const left = 7 + tx; 
        const top = centerY + ty;
        const prodColor = getProdColorInfoJS(p.codigoProducto);

        html += `
            <div class="fuel-circle" style="left: ${left}px; top: ${top}px; background-color: ${prodColor.bg}; color: ${prodColor.txt};">
                ${prodColor.short}
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function getTruckStaticHtml() {
    return `
        <div class="d-flex flex-column align-items-center">
            <div class="truck-head"></div>
            <div class="truck-neck"></div>
            <div class="truck-body">
                <div class="truck-hatch"></div>
                <div class="truck-hatch"></div>
                <div class="truck-hatch"></div>
                <div class="truck-hatch"></div>
                <div class="truck-hatch"></div>
            </div>
            <div class="mt-2 text-muted fw-bold" style="font-size:12px;">CAMIÓN</div>
        </div>
    `;
}

// Utilidades de Color
function getBrandColorClass(marca) {
    if(!marca) return 'brand-DEFAULT';
    const m = marca.toUpperCase();
    if(m.includes('REPSOL')) return 'brand-REPSOL';
    if(m.includes('BP')) return 'brand-BP';
    if(m.includes('MOEVE') || m.includes('CEPSA')) return 'brand-MOEVE';
    if(m.includes('SHELL')) return 'brand-SHELL';
    if(m.includes('GALP')) return 'brand-GALP';
    return 'brand-DEFAULT';
}

function getBrandColorHex(marca) {
    const m = (marca||'').toUpperCase();
    if(m.includes('REPSOL')) return '#FF9800';
    if(m.includes('BP')) return '#4CAF50';
    if(m.includes('MOEVE') || m.includes('CEPSA')) return '#005CE6';
    if(m.includes('SHELL')) return '#FFC107';
    if(m.includes('GALP')) return '#FF5000';
    return '#673AB7';
}

function getProdColorInfoJS(code) {
    const c = (code || '').toUpperCase().trim();
    let bg = '#424242'; let txt = '#FFFFFF'; let short = c;
    switch(c) {
        case 'A': bg = '#FFB300'; break;
        case 'A+5': bg = '#F57C00'; break;
        case 'A+': bg = '#FF8F00'; break;
        case 'NEXA': bg = '#00838F'; short = 'NEX'; break;
        case 'B': bg = '#D32F2F'; break;
        case 'B MAR PRO': bg = '#880E4F'; short = 'BPR'; break;
        case 'C': bg = '#0288D1'; break;
        case 'BIENERGI 10': bg = '#6A1B9A'; short = 'B10'; break;
        case '95': bg = '#388E3C'; break;
        case '95+': bg = '#1B5E20'; break;
        case '95 MAR SPORT': bg = '#00E676'; txt = '#000000'; short = '95S'; break;
        case '98': bg = '#1565C0'; break;
        case 'MARBIDIESEL': bg = '#5D4037'; short = 'MBD'; break;
    }
    return { bg, txt, short };
}
