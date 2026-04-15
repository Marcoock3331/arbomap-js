// UBICACION: public/js/detalles_arbol-logic.js
let miniMapa;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Carga de Sidebar
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');
    
    try {
        const cachedSidebar = sessionStorage.getItem('sidebarHTML');
        if (cachedSidebar) {
            sidebarContainer.innerHTML = cachedSidebar;
        } else {
            const res = await fetch('components/sidebar.html');
            if (res.ok) {
                const html = await res.text();
                sessionStorage.setItem('sidebarHTML', html); 
                sidebarContainer.innerHTML = html;
            }
        }
    } catch (err) { console.error("Error cargando sidebar:", err); }
    finally { setTimeout(mostrarPagina, 100); }

    // 2. Etiqueta y Carga
    const etiqueta = new URLSearchParams(window.location.search).get('id');
    if (!etiqueta) return window.location.href = "inventario.html";
    
    const inputIDArbolModal = document.getElementById('inputIDArbolModal');
    if (inputIDArbolModal) inputIDArbolModal.value = etiqueta;
    
    cargarExpediente(etiqueta);

    // 3. Formulario: Nuevo Reporte (Seguimiento)
    const formSeguimiento = document.getElementById('formSeguimiento');
    if(formSeguimiento) {
        formSeguimiento.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const txt = btn.innerHTML;
            btn.innerHTML = 'Guardando...'; btn.disabled = true;
            
            try {
                const formData = new FormData(this);
                // Agregar el ID del usuario logueado
                const sessionData = JSON.parse(sessionStorage.getItem('user'));
                if(sessionData) formData.append('id_usuario', sessionData.id_usuario);

                const res = await fetch('/api/seguimiento', { method: 'POST', body: formData });
                if((await res.json()).success) { 
                    $('#modalSeguimiento').modal('hide'); 
                    this.reset(); 
                    cargarExpediente(etiqueta); 
                }
            } catch (err) { console.error(err); } 
            finally { btn.innerHTML = txt; btn.disabled = false; }
        });
    }

    // 4. Formulario: Editar Reporte Existente
    const formEditarReporte = document.getElementById('formEditarReporte');
    if(formEditarReporte) {
        formEditarReporte.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const txt = btn.innerHTML;
            btn.innerHTML = 'Actualizando...'; btn.disabled = true;
            
            const id = document.getElementById('edit-rep-id').value;
            const data = {
                estado_salud: document.getElementById('edit-rep-estado').value,
                comentarios: document.getElementById('edit-rep-comentarios').value
            };

            try {
                const res = await fetch(`/api/seguimiento/${id}`, { 
                    method: 'PUT', 
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                if((await res.json()).success) { 
                    $('#modalEditarReporte').modal('hide'); 
                    cargarExpediente(etiqueta); 
                }
            } catch (err) { console.error(err); } 
            finally { btn.innerHTML = txt; btn.disabled = false; }
        });
    }
});

async function cargarExpediente(codigo) {
    try {
        const res = await fetch(`/api/arbol/expediente/${codigo}`);
        if(!res.ok) throw new Error("Arbol no encontrado");
        const data = await res.json();
        const a = data.arbol, reportes = data.reportes;

        document.getElementById('det-nombre-comun').innerText = a.nombre_comun;
        document.getElementById('det-nombre-cientifico').innerText = a.nombre_cientifico || 'Sin registro cientifico';
        document.getElementById('det-descripcion').innerText = a.descripcion || 'Sin descripcion disponible.';
        document.getElementById('det-codigo').innerText = a.codigo_etiqueta;
        document.getElementById('det-zona').innerHTML = `<strong>${a.nombre_zona || 'Zona no asignada'}</strong>`;

        let fPlantado = new Date(a.fecha_plantado);
        fPlantado.setMinutes(fPlantado.getMinutes() + fPlantado.getTimezoneOffset());
        document.getElementById('det-fecha').innerText = fPlantado.toLocaleDateString();
        
        document.getElementById('det-coords').innerText = `Lat: ${a.latitud} | Lng: ${a.longitud}`; 

        const areaAdopcion = document.getElementById('area-adopcion');
        if(a.cuidador) {
            document.getElementById('det-cuidador').innerText = a.cuidador;
            let fAsignacion = new Date(a.fecha_asignacion);
            fAsignacion.setMinutes(fAsignacion.getMinutes() + fAsignacion.getTimezoneOffset());
            document.getElementById('det-fecha-adopcion').innerText = `Desde: ${fAsignacion.toLocaleDateString()}`;
            if(areaAdopcion) areaAdopcion.innerHTML = '';
        } else {
            document.getElementById('det-cuidador').innerText = 'Sin asignar';
            document.getElementById('det-fecha-adopcion').innerText = 'Huerfano';
            if(areaAdopcion) areaAdopcion.innerHTML = `<button class="btn btn-success btn-block rounded-pill font-weight-bold shadow-sm" onclick="adoptarArbol('${a.codigo_etiqueta}')"><i class="fas fa-heart mr-1"></i> ¡Adoptar Ejemplar!</button>`;
        }

        if(!miniMapa) {
            miniMapa = L.map('mini-mapa', { zoomControl: false }).setView([a.latitud, a.longitud], 18);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMapa);
        } else { 
            miniMapa.setView([a.latitud, a.longitud], 18); 
        }
        
        miniMapa.eachLayer((layer) => { if (layer instanceof L.Marker) miniMapa.removeLayer(layer); });
        L.marker([a.latitud, a.longitud]).addTo(miniMapa);

        const contenedor = document.getElementById('contenedor-historial'); 
        if(contenedor) {
            contenedor.innerHTML = '';
            if(!reportes || reportes.length === 0) {
                contenedor.innerHTML = '<p class="text-center text-muted py-5">Sin revisiones registradas.</p>';
            } else {
                reportes.forEach((r, index) => {
                    let badge = r.estado_salud === 'Bueno' ? 'success' : (r.estado_salud === 'Regular' ? 'warning' : 'danger');
                    let foto = r.foto_url ? `/uploads/${r.foto_url}` : 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png';
                    
                    let fRevision = new Date(r.fecha_revision);
                    fRevision.setMinutes(fRevision.getMinutes() + fRevision.getTimezoneOffset());
                    
                    // Proteccion contra saltos de linea y comillas en los comentarios
                    let safeComentarios = r.comentarios ? r.comentarios.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, "\\n").replace(/\r/g, "") : '';

                    contenedor.innerHTML += `
                        <div class="timeline-item mb-4">
                            <div class="d-flex justify-content-between mb-2 small font-weight-bold text-gray-700">
                                <span>${fRevision.toLocaleDateString()}</span>
                                <span class="badge badge-${badge} px-3 py-1 rounded-pill shadow-sm">${r.estado_salud}</span>
                            </div>
                            <div class="row no-gutters mb-2">
                                <div class="col-md-4 pr-md-3">
                                    <img src="${foto}" class="img-fluid rounded shadow-sm border" onclick="verImagenGrande('${foto}')" style="cursor: pointer; transition: transform 0.2s; object-fit: cover; height: 100px; width: 100%;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                </div>
                                <div class="col-md-8 mt-2 mt-md-0 position-relative">
                                    <div class="bg-white p-3 rounded border small h-100 shadow-sm pr-5">
                                        <strong class="text-info">Por: ${r.usuario_nombre || 'Admin'}</strong><br>
                                        <em class="text-muted">"${r.comentarios || 'Sin observaciones detalladas.'}"</em>
                                        
                                        <div class="position-absolute" style="top: 10px; right: 10px;">
                                            <button class="btn btn-sm btn-outline-warning rounded-circle shadow-sm mb-1 d-block" onclick="abrirModalEditarReporte(${r.id_seguimiento}, '${r.estado_salud}', '${safeComentarios}')"><i class="fas fa-edit"></i></button>
                                            ${index !== reportes.length - 1 ? `<button class="btn btn-sm btn-outline-danger rounded-circle shadow-sm d-block" onclick="eliminarReporte(${r.id_seguimiento}, '${codigo}')"><i class="fas fa-trash"></i></button>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                });
            }
        }
    } catch (e) { console.error("Error al cargar expediente:", e); }
}

// ==========================================
// FUNCIONES DE REPORTE
// ==========================================
window.abrirModalEditarReporte = function(id, estado, comentarios) {
    const modal = document.getElementById('modalEditarReporte');
    if(!modal) {
        alert("Falta agregar el codigo HTML del modalEditarReporte en tu archivo detalles_arbol.html");
        return;
    }
    document.getElementById('edit-rep-id').value = id;
    document.getElementById('edit-rep-estado').value = estado;
    document.getElementById('edit-rep-comentarios').value = comentarios;
    $('#modalEditarReporte').modal('show');
};

window.eliminarReporte = async function(id, codigoArbol) {
    if(!confirm("¿Estas seguro de eliminar esta revision medica de forma permanente?")) return;
    try {
        const res = await fetch(`/api/seguimiento/${id}`, { method: 'DELETE' });
        if((await res.json()).success) cargarExpediente(codigoArbol);
    } catch(e) { console.error("Error al eliminar:", e); }
};

// ==========================================
// FUNCIONES GLOBALES
// ==========================================
window.adoptarArbol = async function(cod) {
    if(!confirm("Deseas convertirte en el cuidador oficial de este ejemplar?")) return;
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('user'));
        const payload = {
            codigo_etiqueta: cod,
            id_usuario: sessionData ? sessionData.id_usuario : 1
        };

        const res = await fetch('/api/arbol/adoptar', { 
            method: 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify(payload) 
        });
        
        if((await res.json()).success) cargarExpediente(cod);
    } catch (err) { console.error(err); }
};

window.verImagenGrande = function(src) {
    let modalViejo = document.getElementById('modalImagen');
    if (modalViejo) modalViejo.remove();

    document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="modalImagen" tabindex="-1" aria-hidden="true" style="background-color: rgba(0,0,0,0.85);">
        <div class="modal-dialog modal-dialog-centered modal-xl" style="max-width: 95vw;">
            <div class="modal-content bg-transparent border-0">
                <div class="modal-body text-center p-0 position-relative">
                    <button type="button" class="close text-white position-absolute" data-dismiss="modal" 
                            style="right: 15px; top: 10px; opacity: 1; font-size: 3rem; text-shadow: 0px 4px 10px rgba(0,0,0,0.9); z-index: 1055;">
                        &times;
                    </button>
                    <img id="imagenGrande" src="${src}" class="rounded shadow-lg" 
                         style="max-height: 92vh; max-width: 100%; object-fit: contain; border: 3px solid rgba(255,255,255,0.2); background-color: #000;">
                </div>
            </div>
        </div>
    </div>`);

    $('#modalImagen').modal('show');
};