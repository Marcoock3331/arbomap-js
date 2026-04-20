let miniMapa;

document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');

    try {
        const res = await fetch('components/sidebar.html?v=' + new Date().getTime());
        if (res.ok) {
            const html = await res.text();
            sidebarContainer.innerHTML = html;
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

    // Lógica para guardar nuevo reporte
    const formSeguimiento = document.getElementById('formSeguimiento');
    if (formSeguimiento) {
        formSeguimiento.addEventListener('submit', async function (e) {
            e.preventDefault();
            try {
                const formData = new FormData(this);
                const sessionData = JSON.parse(sessionStorage.getItem('user'));
                if (sessionData) formData.append('id_usuario', sessionData.id_usuario);

                await ApiService.post('/tracking', formData);
                
                $('#modalSeguimiento').modal('hide');
                this.reset();
                ApiService.toast('success', '¡Reporte clínico guardado!');
                cargarExpediente(etiqueta);
            } catch (err) {
                // El error lo maneja automáticamente ApiService.toast
            }
        });
    }

    // Lógica para editar reporte existente
    const formEditarReporte = document.getElementById('formEditarReporte');
    if (formEditarReporte) {
        formEditarReporte.addEventListener('submit', async function (e) {
            e.preventDefault();
            const id = document.getElementById('edit-rep-id').value;
            const data = {
                estado_salud: document.getElementById('edit-rep-estado').value,
                comentarios: document.getElementById('edit-rep-comentarios').value
            };

            try {
                await ApiService.put(`/tracking/${id}`, data);
                $('#modalEditarReporte').modal('hide');
                ApiService.toast('success', 'Reporte actualizado correctamente.');
                cargarExpediente(etiqueta);
            } catch (err) {
                // Error manejado por ApiService
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
        document.getElementById('det-nombre-cientifico').innerText = a.nombre_cientifico ?? 'Sin registro';
        document.getElementById('det-descripcion').innerText = a.descripcion ?? 'Sin descripción';
        document.getElementById('det-codigo').innerText = a.codigo_etiqueta;
        document.getElementById('det-zona').innerHTML = `<strong>${a.nombre_zona ?? 'Sin zona'}</strong>`;

        if(a.fecha_plantado) {
            let fPlantado = new Date(a.fecha_plantado);
            fPlantado.setMinutes(fPlantado.getMinutes() + fPlantado.getTimezoneOffset());
            document.getElementById('det-fecha').innerText = fPlantado.toLocaleDateString();
        }

        document.getElementById('det-coords').innerText = `Lat: ${a.latitud} | Lng: ${a.longitud}`;
        
        // --- GESTIÓN VISUAL DEL PADRINO ---
        const areaAdopcion = document.getElementById('area-adopcion');
        if (a.nombre_cuidador) {
            document.getElementById('det-cuidador').innerText = a.nombre_cuidador;
            let fAdopcion = new Date(a.fecha_asignacion);
            fAdopcion.setMinutes(fAdopcion.getMinutes() + fAdopcion.getTimezoneOffset());
            document.getElementById('det-fecha-adopcion').innerText = "Desde: " + fAdopcion.toLocaleDateString();
            areaAdopcion.innerHTML = ''; 
        } else {
            document.getElementById('det-cuidador').innerText = 'Sin asignar';
            document.getElementById('det-fecha-adopcion').innerText = '---';
            areaAdopcion.innerHTML = `
                <button onclick="window.adoptarArbol(${a.id_arbol})" class="btn btn-success btn-block rounded-pill font-weight-bold shadow-sm p-3 mt-3">
                    <i class="fas fa-hand-holding-heart mr-2 fa-lg"></i> ¡Apadrinar este Árbol!
                </button>
            `;
        }

        // --- MAPA ---
        if (typeof L !== 'undefined') {
            if (!miniMapa) {
                miniMapa = L.map('mini-mapa', { zoomControl: false }).setView([a.latitud, a.longitud], 18);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMapa);
            } else {
                miniMapa.setView([a.latitud, a.longitud], 18);
            }
            miniMapa.eachLayer(layer => { if (layer instanceof L.Marker) miniMapa.removeLayer(layer); });
            L.marker([a.latitud, a.longitud]).addTo(miniMapa);
        }

        // --- HISTORIAL ---
        const contenedor = document.getElementById('contenedor-historial');
        if (contenedor) {
            contenedor.innerHTML = '';
            if (!reportes || reportes.length === 0) {
                contenedor.innerHTML = '<p class="text-center text-muted py-5">Sin registros médicos aún.</p>';
                return;
            }

            reportes.forEach((r) => {
                const badge = r.estado_salud === 'Bueno' ? 'success' : (r.estado_salud === 'Regular' ? 'warning' : 'danger');
                const foto = r.foto_url ? `/uploads/${r.foto_url}` : '';
                let fRevision = new Date(r.fecha_revision);
                fRevision.setMinutes(fRevision.getMinutes() + fRevision.getTimezoneOffset());

                const safeComentarios = (r.comentarios ?? '').replace(/'/g, "\\'");
                let acciones = `<button class="btn btn-sm btn-outline-warning shadow-sm mx-1" onclick="abrirModalEditarReporte(${r.id_seguimiento}, '${r.estado_salud}', '${safeComentarios}')"><i class="fas fa-edit"></i></button>`;
                
                if (r.comentarios !== 'Registro inicial') {
                    acciones += `<button class="btn btn-sm btn-outline-danger shadow-sm" onclick="eliminarReporte(${r.id_seguimiento})"><i class="fas fa-trash"></i></button>`;
                }

                contenedor.innerHTML += `
                    <div class="mb-3 p-3 border rounded bg-white shadow-sm">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <strong class="mr-2">${fRevision.toLocaleDateString()}</strong>
                                <span class="badge badge-${badge}">${r.estado_salud}</span>
                            </div>
                            <div>${acciones}</div>
                        </div>
                        <p class="mb-2 text-gray-800">${r.comentarios ?? ''}</p>
                        ${foto ? `<img src="${foto}" class="img-thumbnail" style="height: 100px; width: 100px; object-fit: cover; cursor: pointer;" onclick="abrirLightbox('${foto}')">` : ''}
                    </div>`;
            });
        }
    } catch (e) {
        console.error("Error al cargar expediente:", e);
    }
}

// ==========================================
// ACCIONES CON SWEETALERT2 (UX MEJORADA)
// ==========================================

window.adoptarArbol = async function(idArbol) {
    const result = await Swal.fire({
        title: '¿Quieres ser su padrino?',
        text: "Te comprometes a cuidar este árbol y registrar su salud periódicamente en la UTM.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#009688',
        cancelButtonColor: '#858796',
        confirmButtonText: '¡Sí, acepto!',
        cancelButtonText: 'Ahora no',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('user'));
        await ApiService.post(`/trees/${idArbol}/adopt`, { id_usuario: sessionData.id_usuario });
        
        Swal.fire('¡Felicidades!', 'Ahora eres oficialmente el padrino de este árbol.', 'success');
        const etiqueta = new URLSearchParams(window.location.search).get('id');
        cargarExpediente(etiqueta);
    } catch (err) { /* Manejado por ApiService */ }
};

window.eliminarReporte = async function(id) {
    const result = await Swal.fire({
        title: '¿Eliminar reporte?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        await ApiService.delete(`/tracking/${id}`);
        ApiService.toast('success', 'Reporte eliminado.');
        const etiqueta = new URLSearchParams(window.location.search).get('id');
        cargarExpediente(etiqueta);
    } catch (e) { /* Manejado por ApiService */ }
};

window.abrirModalEditarReporte = function(id, estado, comentarios) {
    document.getElementById('edit-rep-id').value = id;
    document.getElementById('edit-rep-estado').value = estado;
    document.getElementById('edit-rep-comentarios').value = comentarios;
    $('#modalEditarReporte').modal('show');
};

window.abrirLightbox = function(src) {
    let modal = document.getElementById('lightboxModal');
    if (!modal) {
        const modalHtml = `
        <div class="modal fade" id="lightboxModal" tabindex="-1" role="dialog" aria-hidden="true" style="background: rgba(0,0,0,0.85);">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content bg-transparent border-0 shadow-none">
                    <div class="modal-body text-center p-0 position-relative">
                        <button type="button" class="close position-absolute" data-dismiss="modal" style="right: -20px; top: -20px; color: white; font-size: 3rem; opacity: 1;">&times;</button>
                        <img src="" id="lightboxImg" class="img-fluid rounded shadow-lg" style="max-height: 85vh; border: 4px solid white;">
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    document.getElementById('lightboxImg').src = src;
    $('#lightboxModal').modal('show');
};