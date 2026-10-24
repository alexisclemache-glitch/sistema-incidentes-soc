const API_URL = '/api/incidentes';
const tablaBody = document.getElementById('tabla-body');
const formIncidente = document.getElementById('form-incidente');
const formMessage = document.getElementById('form-message');
const submitButton = formIncidente.querySelector('button[type="submit"]');

function mostrarMensaje(mensaje, esError = false) {
  formMessage.textContent = mensaje;
  formMessage.classList.toggle('error', esError);
}

function establecerFechaYHoraActual() {
  const ahora = new Date();
  const fecha = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  document.getElementById('fecha').value = fecha;
  document.getElementById('hora').value = ahora.toTimeString().slice(0, 5);
}

function crearCelda(texto) {
  const celda = document.createElement('td');
  celda.textContent = texto;
  return celda;
}

function renderizarIncidentes(incidentes) {
  tablaBody.replaceChildren();

  incidentes.forEach((incidente) => {
    const fila = document.createElement('tr');
    const tituloCelda = document.createElement('td');
    const titulo = document.createElement('strong');
    const detalle = document.createElement('small');
    const severidadCelda = document.createElement('td');
    const severidad = document.createElement('span');
    const accionCelda = document.createElement('td');
    const botonEliminar = document.createElement('button');

    titulo.textContent = incidente.titulo;
    detalle.textContent = incidente.descripcion || 'Sin descripción';
    tituloCelda.append(titulo, detalle);

    severidad.className = 'severity';
    severidad.textContent = incidente.severidad;
    severidadCelda.appendChild(severidad);

    botonEliminar.type = 'button';
    botonEliminar.className = 'btn btn-danger';
    botonEliminar.textContent = 'Eliminar';
    botonEliminar.addEventListener('click', () => eliminarIncidente(incidente.id));
    accionCelda.appendChild(botonEliminar);

    fila.append(
      crearCelda(String(incidente.id)),
      tituloCelda,
      severidadCelda,
      crearCelda(incidente.estado || 'Abierto'),
      accionCelda
    );
    tablaBody.appendChild(fila);
  });
}

async function cargarIncidentes() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error('No se pudieron cargar los incidentes.');

    const incidentes = await respuesta.json();
    renderizarIncidentes(incidentes);
  } catch (error) {
    console.error('Error al cargar incidentes:', error);
    mostrarMensaje('No fue posible cargar los incidentes. Intenta actualizar la página.', true);
  }
}

function crearDescripcion(formData) {
  const secciones = [
    ['Fecha', formData.get('fecha')],
    ['Hora', formData.get('hora')],
    ['Ubicación', formData.get('ubicacion')],
    ['Detalles', formData.get('descripcion')],
    ['Daños o impacto', formData.get('danos')],
    ['Acciones realizadas', formData.get('acciones')],
    ['Testigos', formData.get('testigos')],
    ['Datos de testigos', formData.get('datos-testigos')],
    ['Reportado por', formData.get('reportero')],
    ['Contacto', formData.get('contacto')],
    ['Firma', formData.get('firma')]
  ];

  return secciones
    .filter(([, valor]) => valor)
    .map(([etiqueta, valor]) => `${etiqueta}: ${valor}`)
    .join('\n\n');
}

formIncidente.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mostrarMensaje('');
  submitButton.disabled = true;

  const datos = new FormData(formIncidente);
  const titulo = document.getElementById('titulo').value.trim();
  const severidad = document.getElementById('severidad').value;

  try {
    const respuesta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo,
        descripcion: crearDescripcion(datos),
        severidad
      })
    });

    if (!respuesta.ok) {
      const errorData = await respuesta.json();
      throw new Error(errorData.error || 'No se pudo registrar el incidente.');
    }

    formIncidente.reset();
    establecerFechaYHoraActual();
    mostrarMensaje('Incidente registrado correctamente.');
    await cargarIncidentes();
  } catch (error) {
    console.error('Error al crear el incidente:', error);
    mostrarMensaje(error.message || 'No se pudo registrar el incidente.', true);
  } finally {
    submitButton.disabled = false;
  }
});

async function eliminarIncidente(id) {
  if (!confirm('¿Está seguro de eliminar este registro?')) return;

  try {
    const respuesta = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!respuesta.ok) throw new Error('No se pudo eliminar el incidente.');

    await cargarIncidentes();
    mostrarMensaje('Incidente eliminado correctamente.');
  } catch (error) {
    console.error('Error al eliminar el incidente:', error);
    mostrarMensaje(error.message, true);
  }
}

establecerFechaYHoraActual();
cargarIncidentes();
