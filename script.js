// =========================================
// MOTOR PRINCIPAL LOGISTANK WEB
// =========================================

// Enlace directo a tu servidor de Google Sheets
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIZAUVYjHnZS_BEmcsnHO-qf538S9mKul9np0cTCkm3ssw9cv-dJOfC3olhvV8Jj4d/exec';

// Estado de la aplicación
let currentUser = null;
let gasStations = [];
let routeClients = [];
let currentTab = 'GAS'; 

// Referencias a elementos del DOM
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const contentArea = document.getElementById('content-area');
const userInfoDisplay = document.getElementById('user-info-display');

// =========================================
// INICIALIZACIÓN Y EVENTOS
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    // Revisar si hay una sesión guardada para no tener que loguear siempre
    const savedUser = localStorage.getItem('logistank_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainScreen();
    }

    // Botón Iniciar Sesión Normal
    document.getElementById('btn-login').addEventListener('click', () => {
        const user = document.getElementById('login-user').value.trim();
        const pass = document.getElementById('login-pass').value.trim();
        
        if(user && pass) {
            login(user, pass);
        } else {
            alert("Por favor, introduce usuario y contraseña.");
        }
    });

    // Botón Invitado
    document.getElementById('btn-guest').addEventListener('click', () => {
        currentUser = { id: 'INVITADO', nombre: 'Invitado', role: 'INVITADO' };
        localStorage.setItem('logistank_user', JSON.stringify(currentUser));
        showMainScreen();
    });

    // Botón Cerrar Sesión
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('logistank_user');
        currentUser = null;
        mainScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    });

    // Pestañas de navegación
    document.getElementById('tab-gas').addEventListener('click', (e) => {
        e.preventDefault();
        currentTab = 'GAS';
        document.getElementById('tab-gas').classList.add('active');
        document.getElementById('tab-routes').classList.remove('active');
        renderGasStations();
    });

    document.getElementById('tab-routes').addEventListener('click', (e) => {
        e.preventDefault();
        currentTab = 'ROUTES';
        document.getElementById('tab-routes').classList.add('active');
        document.getElementById('tab-gas').classList.remove('active');
        renderRoutes();
    });
});

// =========================================
// FUNCIONES DE RED (API)
// =========================================
async function login(username, password) {
    const btn = document.getElementById('btn-login');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';
    btn.disabled = true;

    try {
        // EL TRUCO: Añadimos headers 'text/plain' para saltarnos el bloqueo CORS del navegador web
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({ action: 'login', username: username, password: password })
        });
        
        const result = await response.json();

        if (result.success) {
            currentUser = { id: result.id || username, nombre: result.nombre, role: result.role };
            localStorage.setItem('logistank_user', JSON.stringify(currentUser));
            showMainScreen();
        } else {
            alert('Acceso denegado: ' + (result.message || 'Credenciales incorrectas'));
        }
    } catch (error) {
        alert('Bloqueo de seguridad del navegador o error de conexión. Detalle: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function fetchData() {
    contentArea.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-purple"></div><p>Descargando base de datos...</p></div>';
    
    try {
        const [resGas, resRoutes] = await Promise.all([
            fetch(`${SCRIPT_URL}?action=getGasStations`),
            fetch(`${SCRIPT_URL}?action=getRoutes`)
        ]);

        gasStations = await resGas.json();
        routeClients = await resRoutes.json();

        if (currentTab === 'GAS') renderGasStations();
        else renderRoutes();

    } catch (error) {
        contentArea.innerHTML = `<div class="alert alert-danger m-3"><b>Error:</b> No se pudo conectar con el servidor. Detalle: ${error.message}</div>`;
    }
}

// =========================================
// RENDERIZADO DE INTERFAZ
// =========================================
function showMainScreen() {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    userInfoDisplay.textContent = `${currentUser.nombre} (${currentUser.role})`;
    fetchData();
}

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

function renderGasStations() {
    if (gasStations.length === 0) {
        contentArea.innerHTML = '<p class="text-center text-muted mt-5">No hay gasolineras registradas.</p>';
        return;
    }

    // Orden alfabético
    const sorted = [...gasStations].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    let html = '<div class="d-flex flex-column gap-3">';
    sorted.forEach(station => {
        const brandClass = getBrandColorClass(station.marca);
        html += `
            <div class="card shadow-sm card-station p-3" onclick="viewStationDetails('${station.id}')">
                <div class="brand-indicator ${brandClass}"></div>
                <h5 class="fw-bold mb-1 text-dark">${station.nombre || 'Sin Nombre'}</h5>
                <p class="mb-0 text-muted small">${station.marca || ''} • ${station.direccion || ''}</p>
            </div>
        `;
    });
    html += '</div>';
    contentArea.innerHTML = html;
}

function renderRoutes() {
    if (routeClients.length === 0) {
        contentArea.innerHTML = '<p class="text-center text-muted mt-5">No hay clientes de ruta registrados.</p>';
        return;
    }

    const sorted = [...routeClients].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    let html = '<div class="d-flex flex-column gap-3">';
    sorted.forEach(client => {
        html += `
            <div class="card shadow-sm card-station p-3" onclick="viewRouteDetails('${client.id}')">
                <div class="brand-indicator brand-DEFAULT"></div>
                <h5 class="fw-bold mb-1 text-dark">${client.nombre || 'Sin nombre'}</h5>
                <p class="mb-0 text-muted small">${client.direccion || 'Sin dirección'}</p>
            </div>
        `;
    });
    html += '</div>';
    contentArea.innerHTML = html;
}

function viewStationDetails(id) {
    alert("Has pulsado la gasolinera ID: " + id + "\n\nEn la siguiente fase construiremos el visor de detalles y el camión web.");
}

function viewRouteDetails(id) {
    alert("Has pulsado el cliente de ruta ID: " + id);
}
