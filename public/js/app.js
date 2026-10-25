const esServidorLocalEstatico = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  && window.location.port !== '3000';
const apiBaseUrl = window.SOC_API_BASE_URL
  ? window.SOC_API_BASE_URL.replace(/\/+$/, '')
  : esServidorLocalEstatico
    ? 'http://localhost:3000'
    : '';
const API_URL = `${apiBaseUrl}/api`;
const tablaBody = document.getElementById('tabla-body');
const formIncidente = document.getElementById('form-incidente');
const formMessage = document.getElementById('form-message');
const submitButton = formIncidente.querySelector('button[type="submit"]');
const authForm = document.getElementById('auth-form');
const authMessage = document.getElementById('auth-message');
const authNameGroup = document.getElementById('auth-name-group');
const authModeButton = document.getElementById('auth-mode-button');
const authSubmit = document.getElementById('auth-submit');
const authTitle = document.getElementById('auth-title');
const authPassword = document.getElementById('auth-password');
const sessionControls = document.querySelector('.session-controls');
let isRegistering = false;
let sessionToken = sessionStorage.getItem('soc-session-token');

function mostrarMensaje(elemento, mensaje, esError = false) {
  elemento.textContent = mensaje;
  elemento.classList.toggle('error', esError);
}

async function leerRespuestaJson(respuesta) {
  const contenido = await respuesta.text();
  if (!contenido.trim()) return null;

  try {
    return JSON.parse(contenido);
  } catch {
    throw new Error(
      `El servidor devolvió una respuesta no válida (HTTP ${respuesta.status}). Verifica la URL de la API.`
    );
  }
}

async function solicitar(url, opciones = {}, autenticada = true) {
  const headers = new Headers(opciones.headers || {});
  if (autenticada && sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);
  const respuesta = await fetch(url, { ...opciones, headers });
  if (respuesta.status === 401 && autenticada) {
    cerrarSesion();
    mostrarMensaje(authMessage, 'La sesión expiró. Inicia sesión de nuevo.', true);
  }
  return respuesta;
}

function explicarErrorRed(error) {
  if (error instanceof TypeError) {
    return 'No se pudo conectar con la API. Comprueba SOC_API_BASE_URL, que el servicio esté activo y que CORS permita el dominio de esta interfaz.';
  }
  return error.message || 'Ocurrió un error al comunicarse con la API.';
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
    const botonEditar = document.createElement('button');
    const botonEliminar = document.createElement('button');

    titulo.textContent = incidente.titulo;
    detalle.textContent = incidente.descripcion || 'Sin descripción';
    tituloCelda.append(titulo, detalle);

    severidad.className = 'severity';
    severidad.textContent = incidente.severidad;
    severidadCelda.appendChild(severidad);

    botonEditar.type = 'button';
    botonEditar.className = 'btn btn-edit';
    botonEditar.textContent = 'Editar';
    botonEditar.addEventListener('click', () => editarIncidente(incidente));
    botonEliminar.type = 'button';
    botonEliminar.className = 'btn btn-danger';
    botonEliminar.textContent = 'Eliminar';
    botonEliminar.addEventListener('click', () => eliminarIncidente(incidente.id));
    accionCelda.append(botonEditar, botonEliminar);

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
    const respuesta = await solicitar(`${API_URL}/incidentes`);
    if (!respuesta.ok) {
      const errorData = await leerRespuestaJson(respuesta);
      throw new Error(errorData?.error || `No se pudieron cargar los incidentes (HTTP ${respuesta.status}).`);
    }

    const incidentes = await leerRespuestaJson(respuesta);
    if (!Array.isArray(incidentes)) throw new Error('La API no devolvió una lista válida de incidentes.');
    renderizarIncidentes(incidentes);
  } catch (error) {
    console.error('Error al cargar incidentes:', error);
    mostrarMensaje(formMessage, explicarErrorRed(error), true);
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

async function guardarCambios(id, datos, metodo, mensajeCorrecto) {
  const respuesta = await solicitar(`${API_URL}/incidentes${id ? `/${id}` : ''}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  if (!respuesta.ok) {
    const errorData = await leerRespuestaJson(respuesta);
    throw new Error(errorData?.error || `La solicitud falló (HTTP ${respuesta.status}).`);
  }
  await cargarIncidentes();
  mostrarMensaje(formMessage, mensajeCorrecto);
}

formIncidente.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mostrarMensaje(formMessage, '');
  submitButton.disabled = true;

  const datos = new FormData(formIncidente);
  const incidente = {
    titulo: document.getElementById('titulo').value.trim(),
    descripcion: crearDescripcion(datos),
    severidad: document.getElementById('severidad').value
  };

  try {
    await guardarCambios(null, incidente, 'POST', 'Incidente registrado correctamente.');
    formIncidente.reset();
    establecerFechaYHoraActual();
  } catch (error) {
    console.error('Error al crear el incidente:', error);
    mostrarMensaje(formMessage, explicarErrorRed(error), true);
  } finally {
    submitButton.disabled = false;
  }
});

async function editarIncidente(incidente) {
  const titulo = prompt('Título del incidente:', incidente.titulo);
  if (titulo === null) return;
  const descripcion = prompt('Descripción:', incidente.descripcion || '');
  if (descripcion === null) return;
  const severidad = prompt('Severidad (Baja, Media, Alta, Crítica):', incidente.severidad);
  if (severidad === null) return;
  const estado = prompt('Estado (Abierto, En progreso, Cerrado):', incidente.estado);
  if (estado === null) return;

  try {
    await guardarCambios(
      incidente.id,
      { titulo, descripcion, severidad, estado },
      'PUT',
      'Incidente actualizado correctamente.'
    );
  } catch (error) {
    console.error('Error al actualizar el incidente:', error);
    mostrarMensaje(formMessage, explicarErrorRed(error), true);
  }
}

async function eliminarIncidente(id) {
  if (!confirm('¿Está seguro de eliminar este registro?')) return;

  try {
    const respuesta = await solicitar(`${API_URL}/incidentes/${id}`, { method: 'DELETE' });
    if (!respuesta.ok) {
      const errorData = await leerRespuestaJson(respuesta);
      throw new Error(errorData?.error || `No se pudo eliminar el incidente (HTTP ${respuesta.status}).`);
    }
    await cargarIncidentes();
    mostrarMensaje(formMessage, 'Incidente eliminado correctamente.');
  } catch (error) {
    console.error('Error al eliminar el incidente:', error);
    mostrarMensaje(formMessage, explicarErrorRed(error), true);
  }
}

function mostrarAplicacion(usuario) {
  document.getElementById('auth-panel').hidden = true;
  document.getElementById('app-panel').hidden = false;
  sessionControls.hidden = false;
  document.getElementById('session-user').textContent = `${usuario.nombre} (${usuario.rol})`;
  cargarIncidentes();
}

function cerrarSesion() {
  sessionToken = null;
  sessionStorage.removeItem('soc-session-token');
  tablaBody.replaceChildren();
  document.getElementById('auth-panel').hidden = false;
  document.getElementById('app-panel').hidden = true;
  sessionControls.hidden = true;
}

authModeButton.addEventListener('click', () => {
  isRegistering = !isRegistering;
  authNameGroup.hidden = !isRegistering;
  document.getElementById('auth-name').required = isRegistering;
  authTitle.textContent = isRegistering ? 'Crear cuenta de analista' : 'Iniciar sesión';
  authSubmit.textContent = isRegistering ? 'Crear cuenta' : 'Iniciar sesión';
  authModeButton.textContent = isRegistering ? 'Ya tengo una cuenta' : 'Crear una cuenta de analista';
  authPassword.autocomplete = isRegistering ? 'new-password' : 'current-password';
  mostrarMensaje(authMessage, '');
});

authForm.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  authSubmit.disabled = true;
  mostrarMensaje(authMessage, '');
  const datos = new FormData(authForm);
  const cuerpo = {
    email: datos.get('email'),
    password: datos.get('password')
  };
  if (isRegistering) cuerpo.nombre = datos.get('nombre');

  try {
    const respuesta = await solicitar(`${API_URL}/auth/${isRegistering ? 'registro' : 'sesion'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    }, false);
    const resultado = await leerRespuestaJson(respuesta);
    if (!respuesta.ok) throw new Error(resultado?.error || `No se pudo iniciar sesión (HTTP ${respuesta.status}).`);

    sessionToken = resultado.token;
    sessionStorage.setItem('soc-session-token', sessionToken);
    authForm.reset();
    mostrarAplicacion(resultado.usuario);
  } catch (error) {
    console.error('Error de autenticación:', error);
    mostrarMensaje(authMessage, explicarErrorRed(error), true);
  } finally {
    authSubmit.disabled = false;
  }
});

document.getElementById('logout-button').addEventListener('click', cerrarSesion);
establecerFechaYHoraActual();

if (sessionToken) {
  solicitar(`${API_URL}/auth/sesion`)
    .then(async (respuesta) => {
      const resultado = await leerRespuestaJson(respuesta);
      if (!respuesta.ok) throw new Error(resultado?.error || 'La sesión expiró.');
      mostrarAplicacion(resultado.usuario);
    })
    .catch((error) => {
      mostrarMensaje(authMessage, explicarErrorRed(error), true);
    });
}
