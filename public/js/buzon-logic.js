document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    try {
        const res = await fetch('components/sidebar.html?v=' + new Date().getTime());
        const html = await res.text();
        sidebarContainer.innerHTML = html;
        document.body.classList.add('listo');
    } catch (err) {
        document.body.classList.add('listo');
    }

    cargarBuzon();
});

async function cargarBuzon() {
    try {
        const mensajes = await ApiService.get('/padrinos/buzon');
        renderizarTabla(mensajes);
    } catch (e) {
        document.getElementById('tbody-buzon').innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error al cargar los mensajes.</td></tr>`;
    }
}

function renderizarTabla(lista) {
    const tbody = document.getElementById('tbody-buzon');
    document.getElementById('titulo-buzon').innerText = `Mensajes Recibidos (${lista.length})`;
    tbody.innerHTML = '';
    
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-5 font-italic"><i class="fas fa-inbox fa-3x mb-3 opacity-50"></i><br>Tu bandeja está vacía.</td></tr>`;
        return;
    }

    lista.forEach(m => {
        // Acortamos el mensaje para la tabla
        const extracto = m.mensaje.length > 40 ? m.mensaje.substring(0, 40) + '...' : m.mensaje;
        
        // Formatear la fecha para que se vea legible (Ej: 20/04/2026 14:30)
        const fechaObj = new Date(m.fecha_envio);
        const fechaFormateada = fechaObj.toLocaleDateString() + ' ' + fechaObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        tbody.innerHTML += `
            <tr class="border-bottom animate__animated animate__fadeIn">
                <td class="pl-4 font-weight-bold text-gray-800 align-middle"><i class="fas fa-user-circle text-muted mr-2"></i>${m.nombre}</td>
                <td class="align-middle text-primary"><i class="fas fa-envelope mr-1"></i> ${m.email}</td>
                <td class="align-middle text-muted small"><i class="far fa-calendar-alt mr-1"></i> ${fechaFormateada}</td>
                <td class="align-middle text-gray-700 font-italic">"${extracto}"</td>
                <td class="text-center align-middle">
                    <button class="btn btn-success btn-sm rounded-pill shadow-sm px-3 mb-1" onclick="leerMensaje('${m.nombre}', '${m.email}', \`${m.mensaje.replace(/`/g, "'")}\`, '${fechaFormateada}')">
                        <i class="fas fa-book-open mr-1"></i> Leer
                    </button>
                    <button class="btn btn-danger btn-sm rounded-circle shadow-sm mb-1 ml-1" title="Eliminar Mensaje" onclick="eliminarMensaje(${m.id_buzon})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// Acción para ver el mensaje completo (Ahora incluye la fecha)
window.leerMensaje = function(nombre, email, mensaje, fecha) {
    Swal.fire({
        title: `<div class="text-left"><h5 class="font-weight-bold text-dark mb-0">Mensaje de ${nombre}</h5><small class="text-primary">${email} &bull; ${fecha}</small></div>`,
        html: `<div class="text-left mt-3 p-3 bg-light rounded border text-gray-800 mensaje-texto shadow-sm">${mensaje}</div>`,
        showCloseButton: true,
        showConfirmButton: false,
        width: '600px'
    });
};

// ==========================================
// NUEVO: Acción para eliminar un mensaje
// ==========================================
window.eliminarMensaje = async function(id_buzon) {
    const result = await Swal.fire({
        title: '¿Eliminar mensaje?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        cancelButtonColor: '#858796',
        confirmButtonText: '<i class="fas fa-trash-alt mr-1"></i> Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await ApiService.delete(`/padrinos/buzon/${id_buzon}`);
            ApiService.toast('success', 'Mensaje eliminado de la bandeja.');
            cargarBuzon(); // Recargamos la tabla para que desaparezca
        } catch (e) {
            // El error ya se maneja visualmente en ApiService
        }
    }
};