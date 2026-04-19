let miniMapa;

document.addEventListener('DOMContentLoaded', async () => {
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
    } catch (err) {
        console.error("Error cargando sidebar:", err);
    } finally {
        setTimeout(mostrarPagina, 100);
    }

    const params = new URLSearchParams(window.location.search);
    const etiqueta = params.get('id');

    if (!etiqueta) return window.location.href = "inventario.html";

    cargarExpediente(etiqueta);

    const formSeguimiento = document.getElementById('formSeguimiento');
    if (formSeguimiento) {
        formSeguimiento.addEventListener('submit', async function (e) {
            e.preventDefault();

            const btn = this.querySelector('button[type="submit"]');
            const txt = btn.innerHTML;
            btn.innerHTML = 'Guardando...';
            btn.disabled = true;

            try {
                const formData = new FormData(this);
                const sessionData = JSON.parse(sessionStorage.getItem('user'));
                if (sessionData) formData.append('id_usuario', sessionData.id_usuario);

                await ApiService.post('/tracking', formData);
                
                $('#modalSeguimiento').modal('hide');
                this.reset();
                cargarExpediente(etiqueta);
            } catch (err) {
                console.error(err);
                alert("Error al guardar reporte: " + err.message);
            } finally {
                btn.innerHTML = txt;
                btn.disabled = false;
            }
        });
    }

    const formEditarReporte = document.getElementById('formEditarReporte');
    if (formEditarReporte) {
        formEditarReporte.addEventListener('submit', async function (e) {
            e.preventDefault();

            const btn = this.querySelector('button[type="submit"]');
            const txt = btn.innerHTML;
            btn.innerHTML = 'Actualizando...';
            btn.disabled = true;

            const id = document.getElementById('edit-rep-id').value;

            const data = {
                estado_salud: document.getElementById('edit-rep-estado').value,
                comentarios: document.getElementById('edit-rep-comentarios').value
            };

            try {
                await ApiService.put(`/tracking/${id}`, data);
                $('#modalEditarReporte').modal('hide');
                cargarExpediente(etiqueta);
            } catch (err) {
                console.error(err);
                alert("Error al actualizar reporte: " + err.message);
            } finally {
                btn.innerHTML = txt;
                btn.disabled = false;
            }
        });
    }
});

async function cargarExpediente(codigo) {
    try {
        const data = await ApiService.get(`/trees/tag/${codigo}`);

        const a = data.arbol;
        const reportes = data.historial;

        const inputIDArbolModal = document.getElementById('inputIDArbolModal');
        if (inputIDArbolModal) inputIDArbolModal.value = a.id_arbol;

        document.getElementById('det-nombre-comun').innerText = a.nombre_comun;
        document.getElementById('det-nombre-cientifico').innerText = a.nombre_cientifico || 'Sin registro';
        document.getElementById('det-descripcion').innerText = a.descripcion || 'Sin descripción';
        document.getElementById('det-codigo').innerText = a.codigo_etiqueta;
        document.getElementById('det-zona').innerHTML = `<strong>${a.nombre_zona || 'Sin zona'}</strong>`;

        if(a.fecha_plantado) {
            let fPlantado = new Date(a.fecha_plantado);
            fPlantado.setMinutes(fPlantado.getMinutes() + fPlantado.getTimezoneOffset());
            document.getElementById('det-fecha').innerText = fPlantado.toLocaleDateString();
        }

        document.getElementById('det-coords').innerText = `Lat: ${a.latitud} | Lng: ${a.longitud}`;
        
        if (typeof L !== 'undefined') {
            if (!miniMapa) {
                miniMapa = L.map('mini-mapa', { zoomControl: false }).setView([a.latitud, a.longitud], 18);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMapa);
            } else {
                miniMapa.setView([a.latitud, a.longitud], 18);
            }

            miniMapa.eachLayer(layer => {
                if (layer instanceof L.Marker) miniMapa.removeLayer(layer);
            });
            L.marker([a.latitud, a.longitud]).addTo(miniMapa);
        }

        const contenedor = document.getElementById('contenedor-historial');

        if (contenedor) {
            contenedor.innerHTML = '';
            if (!reportes || reportes.length === 0) {
                contenedor.innerHTML = '<p class="text-center text-muted py-5">Sin registros</p>';
                return;
            }

            reportes.forEach((r) => {
                const badge = r.estado_salud === 'Bueno' ? 'success' : (r.estado_salud === 'Regular' ? 'warning' : 'danger');
                const foto = r.foto_url ? `/uploads/${r.foto_url}` : '';
            
                let fRevision = new Date(r.fecha_revision);
                fRevision.setMinutes(fRevision.getMinutes() + fRevision.getTimezoneOffset());

                const safeComentarios = (r.comentarios || '').replace(/'/g, "\\'");
                let acciones = `<button class="btn btn-sm btn-outline-warning shadow-sm mx-1" onclick="abrirModalEditarReporte(${r.id_seguimiento}, '${r.estado_salud}', '${safeComentarios}')" title="Editar"><i class="fas fa-edit"></i></button>`;
                
                if (r.comentarios !== 'Registro inicial' && r.comentarios !== 'Registro inicial.') {
                    acciones += `<button class="btn btn-sm btn-outline-danger shadow-sm" onclick="eliminarReporte(${r.id_seguimiento})" title="Eliminar"><i class="fas fa-trash"></i></button>`;
                }

                contenedor.innerHTML += `
                    <div class="mb-3 p-3 border rounded">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <strong class="mr-2">${fRevision.toLocaleDateString()}</strong>
                                <span class="badge badge-${badge}">${r.estado_salud}</span>
                            </div>
                            <div>${acciones}</div>
                        </div>
                        <p class="mb-2">${r.comentarios || ''}</p>
                        ${foto ? `<img src="${foto}" class="img-thumbnail shadow-sm" style="height: 120px; width: 120px; object-fit: cover; cursor: pointer; border-radius: 8px;" onclick="abrirLightbox('${foto}')" title="Ver evidencia completa">` : ''}
                    </div>
                `;
            });
        }

    } catch (e) {
        console.error("Error al cargar expediente:", e);
        document.getElementById('det-nombre-comun').innerText = 'Árbol no encontrado';
    }
}

// ==========================================
// ACCIONES DE REPORTES
// ==========================================
window.abrirModalEditarReporte = function(id, estado, comentarios) {
    document.getElementById('edit-rep-id').value = id;
    document.getElementById('edit-rep-estado').value = estado;
    document.getElementById('edit-rep-comentarios').value = comentarios;
    $('#modalEditarReporte').modal('show');
};

window.eliminarReporte = async function(id) {
    if (!confirm("¿Estás seguro de eliminar este reporte de forma permanente?")) return;
    try {
        await ApiService.delete(`/tracking/${id}`);
        const etiqueta = new URLSearchParams(window.location.search).get('id');
        cargarExpediente(etiqueta);
    } catch (e) {
        alert("Error al eliminar el reporte: " + e.message);
    }
};

// ==========================================
// FUNCIÓN LIGHTBOX DINÁMICO
// ==========================================
window.abrirLightbox = function(src) {
    let modal = document.getElementById('lightboxModal');
    if (!modal) {
        const modalHtml = `
        <div class="modal fade" id="lightboxModal" tabindex="-1" role="dialog" aria-hidden="true" style="background: rgba(0,0,0,0.8);">
            <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
                <div class="modal-content bg-transparent border-0 shadow-none">
                    <div class="modal-body text-center p-0 position-relative">
                        <button type="button" class="close position-absolute" data-dismiss="modal" style="right: -20px; top: -20px; color: white; font-size: 3rem; opacity: 1; text-shadow: 0 0 10px black; z-index: 1055;">&times;</button>
                        <img src="" id="lightboxImg" class="img-fluid rounded shadow" style="max-height: 85vh; border: 3px solid white;">
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    document.getElementById('lightboxImg').src = src;
    $('#lightboxModal').modal('show');
};