
/* ==========================================
   PAOLAAI
   SISTEMA PREDICTIVO DE TENDENCIAS DE RIESGO SST

   VERSION: ALERTAS MULTIPLES POR SECTOR

   - Mapa de calor interactivo
   - Indicadores SST
   - Ranking de sectores
   - Alertas para todos los sectores Alto
   - Actualizacion desde n8n
   ========================================== */

const API_URL =
  "https://romerolagoserikapaola.app.n8n.cloud/webhook/mapa-calor-sst";

let sectores = [];


/* ==========================================
   FUNCIONES GENERALES
   ========================================== */

function numeroSector(nombre) {

  const resultado =
    String(nombre || "").match(/Sector\s*(\d+)/i);

  return resultado
    ? Number(resultado[1])
    : null;
}


function claseNivel(nivel) {

  if (!nivel) return "sin-datos";

  const texto =
    String(nivel)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  if (texto === "bajo") return "bajo";
  if (texto === "medio") return "medio";
  if (texto === "alto") return "alto";
  if (texto === "critico") return "critico";

  return "sin-datos";
}


function prioridadNivel(nivel) {

  const clase = claseNivel(nivel);

  return {
    "sin-datos": 0,
    "bajo": 1,
    "medio": 2,
    "alto": 3,
    "critico": 4
  }[clase] ?? 0;
}


function numeroValido(valor) {

  if (
    valor === "" ||
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}


function ordenarPorPrioridad(a, b) {

  const diferenciaNivel =
    prioridadNivel(b.Nivel_Sectorial) -
    prioridadNivel(a.Nivel_Sectorial);

  if (diferenciaNivel !== 0) {
    return diferenciaNivel;
  }

  return (
    Number(b.Indice_Sectorial || 0) -
    Number(a.Indice_Sectorial || 0)
  );
}


/* ==========================================
   CONSULTAR DATOS DESDE N8N
   ========================================== */

async function cargarDatos() {

  const textoConexion =
    document.getElementById("textoConexion");

  const estado =
    document.getElementById("estadoConexion");

  try {

    textoConexion.textContent =
      "Actualizando datos...";

    const response = await fetch(
      API_URL,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(
        "No se pudo consultar la API"
      );
    }

    const datos = await response.json();

    if (!Array.isArray(datos)) {
      throw new Error(
        "La API no devolvió una lista de sectores"
      );
    }

    sectores = datos;

    estado.classList.remove("error");
    estado.classList.add("online");

    textoConexion.textContent =
      "Datos actualizados";

    actualizarKPIs();
    actualizarMapa();
    actualizarTabla();
    actualizarAlertaPredictiva();

  } catch (error) {

    console.error(
      "Error al cargar datos SST:",
      error
    );

    estado.classList.remove("online");
    estado.classList.add("error");

    textoConexion.textContent =
      "Error de conexión";
  }
}


/* ==========================================
   ACTUALIZAR MAPA DE CALOR
   ========================================== */

function actualizarMapa() {

  sectores.forEach(item => {

    const numero =
      numeroSector(item.Sector);

    if (!numero) return;

    const clase =
      claseNivel(item.Nivel_Sectorial);

    /* CIRCULO DEL SECTOR */

    const boton =
      document.querySelector(
        `[data-sector="${numero}"]`
      );

    if (boton) {

      boton.classList.remove(
        "sin-datos",
        "bajo",
        "medio",
        "alto",
        "critico"
      );

      boton.classList.add(clase);

      boton.onclick =
        () => mostrarDetalle(item);
    }

    /* POLIGONO DEL MAPA */

    const zona =
      document.querySelector(
        `[data-zona="${numero}"]`
      );

    if (zona) {

      zona.classList.remove(
        "sin-datos",
        "bajo",
        "medio",
        "alto",
        "critico"
      );

      zona.classList.add(clase);

      zona.onclick =
        () => mostrarDetalle(item);
    }

  });
}


/* ==========================================
   DETALLE DEL SECTOR
   ========================================== */

function mostrarDetalle(item) {

  document.getElementById(
    "detalleSector"
  ).textContent =
    item.Sector;

  document.getElementById(
    "detalleIndice"
  ).textContent =
    item.Indice_Sectorial !== "" &&
    item.Indice_Sectorial != null
      ? item.Indice_Sectorial
      : "—";

  document.getElementById(
    "detalleRegistros"
  ).textContent =
    item.Total_Registros ?? 0;

  document.getElementById(
    "detalleTendencia"
  ).textContent =
    item.Tendencia || "Sin datos";

  document.getElementById(
    "detalleVariacion"
  ).textContent =
    item.Variacion_Porcentual !== "" &&
    item.Variacion_Porcentual != null
      ? `${item.Variacion_Porcentual}%`
      : "—";

  document.getElementById(
    "detalleBajo"
  ).textContent =
    item.Bajo ?? 0;

  document.getElementById(
    "detalleMedio"
  ).textContent =
    item.Medio ?? 0;

  document.getElementById(
    "detalleAlto"
  ).textContent =
    item.Alto ?? 0;

  document.getElementById(
    "detalleCritico"
  ).textContent =
    item.Critico ?? 0;

  document.getElementById(
    "detalleFactor"
  ).textContent =
    item.Factor_Principal || "Sin datos";

  /* ETIQUETA DEL NIVEL */

  const badge =
    document.getElementById("badgeNivel");

  badge.className =
    `badge ${claseNivel(item.Nivel_Sectorial)}`;

  badge.textContent =
    item.Nivel_Sectorial || "Sin datos";

  /* LIMPIAR SELECCION ANTERIOR */

  document
    .querySelectorAll(
      ".mapa-overlay polygon"
    )
    .forEach(zona => {
      zona.classList.remove("seleccionado");
    });

  /* RESALTAR SECTOR SELECCIONADO */

  const numero =
    numeroSector(item.Sector);

  const zona =
    document.querySelector(
      `[data-zona="${numero}"]`
    );

  if (zona) {
    zona.classList.add("seleccionado");
  }

  actualizarBarra(item);
}


/* ==========================================
   BARRA DE DISTRIBUCION
   ========================================== */

function actualizarBarra(item) {

  const bajo =
    Number(item.Bajo || 0);

  const medio =
    Number(item.Medio || 0);

  const alto =
    Number(item.Alto || 0);

  const critico =
    Number(item.Critico || 0);

  const total =
    bajo + medio + alto + critico;

  const porcentaje = valor =>
    total > 0
      ? (valor / total) * 100
      : 0;

  document.getElementById(
    "barraBajo"
  ).style.width =
    `${porcentaje(bajo)}%`;

  document.getElementById(
    "barraMedio"
  ).style.width =
    `${porcentaje(medio)}%`;

  document.getElementById(
    "barraAlto"
  ).style.width =
    `${porcentaje(alto)}%`;

  document.getElementById(
    "barraCritico"
  ).style.width =
    `${porcentaje(critico)}%`;
}


/* ==========================================
   IDENTIFICAR SECTOR PRIORITARIO
   ========================================== */

function obtenerPrioritario() {

  const conDatos =
    sectores.filter(item =>
      numeroValido(item.Indice_Sectorial) !== null
    );

  if (!conDatos.length) {
    return null;
  }

  return [...conDatos]
    .sort(ordenarPorPrioridad)[0];
}


/* ==========================================
   ACTUALIZAR INDICADORES KPI
   ========================================== */

function actualizarKPIs() {

  document.getElementById(
    "kpiSectores"
  ).textContent =
    sectores.length || 8;

  const totalRegistros =
    sectores.reduce(
      (suma, item) =>
        suma +
        Number(item.Total_Registros || 0),
      0
    );

  document.getElementById(
    "kpiRegistros"
  ).textContent =
    totalRegistros;

  const prioritario =
    obtenerPrioritario();

  const kpiPrioritario =
    document.getElementById(
      "kpiPrioritario"
    );

  const kpiNivel =
    document.getElementById("kpiNivel");

  if (!prioritario) {

    kpiPrioritario.textContent = "--";

    kpiNivel.className = "nivel-kpi";
    kpiNivel.textContent = "--";

    return;
  }

  kpiPrioritario.textContent =
    `Sector ${numeroSector(prioritario.Sector)}`;

  kpiNivel.className =
    `nivel-kpi ${claseNivel(prioritario.Nivel_Sectorial)}`;

  kpiNivel.textContent =
    prioritario.Nivel_Sectorial;
}


/* ==========================================
   ALERTAS PREVENTIVAS MULTIPLES

   NUEVA FUNCIONALIDAD

   MUESTRA TODOS LOS SECTORES
   DE NIVEL ALTO O CRITICO

   ========================================== */

function obtenerSectoresEnAlerta() {

  return sectores
    .filter(item => {

      const nivel =
        claseNivel(item.Nivel_Sectorial);

      return (
        nivel === "alto" ||
        nivel === "critico"
      );

    })
    .sort(ordenarPorPrioridad);
}


/* CREAR TARJETA INDIVIDUAL */

function crearTarjetaAlerta(item) {

  const nivel =
    claseNivel(item.Nivel_Sectorial);

  const color =
    nivel === "critico"
      ? "#991B1B"
      : "#DC2626";

  const tarjeta =
    document.createElement("div");

  tarjeta.style.cssText = `
    background:#FFFFFF;
    border:1px solid #E2E8F0;
    border-left:5px solid ${color};
    border-radius:10px;
    padding:14px 16px;
    margin-top:10px;
    box-shadow:0 3px 10px rgba(16,45,79,.06);
  `;

  /* ENCABEZADO DE TARJETA */

  const encabezado =
    document.createElement("div");

  encabezado.style.cssText = `
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    flex-wrap:wrap;
  `;

  const titulo =
    document.createElement("strong");

  titulo.textContent =
    item.Sector || "Sector sin identificar";

  titulo.style.cssText = `
    color:#102D4F;
    font-size:14px;
  `;

  const etiqueta =
    document.createElement("span");

  etiqueta.textContent =
    String(
      item.Nivel_Sectorial || "Alto"
    ).toUpperCase();

  etiqueta.style.cssText = `
    background:${color};
    color:#FFFFFF;
    padding:5px 12px;
    border-radius:20px;
    font-size:11px;
    font-weight:800;
  `;

  encabezado.appendChild(titulo);
  encabezado.appendChild(etiqueta);

  tarjeta.appendChild(encabezado);

  /* INDICE SECTORIAL */

  const indice =
    document.createElement("p");

  const valorIndice =
    numeroValido(item.Indice_Sectorial);

  indice.textContent =
    `Índice sectorial: ${
      valorIndice !== null
        ? valorIndice.toFixed(2)
        : "Sin datos"
    }`;

  indice.style.cssText = `
    font-size:13px;
    font-weight:700;
    margin:10px 0 5px;
    color:#102D4F;
  `;

  tarjeta.appendChild(indice);

  /* EXPLICACION SENCILLA */

  const explicacion =
    document.createElement("p");

  explicacion.textContent =
    nivel === "critico"
      ? "Este sector requiere evaluación preventiva inmediata según los criterios del sistema."
      : "Este sector requiere atención preventiva prioritaria según los registros de seguridad analizados.";

  explicacion.style.cssText = `
    font-size:12px;
    color:#475569;
    margin:5px 0 8px;
    line-height:1.5;
  `;

  tarjeta.appendChild(explicacion);

  /* TENDENCIA */

  const tendencia =
    document.createElement("p");

  const variacion =
    item.Variacion_Porcentual !== "" &&
    item.Variacion_Porcentual != null
      ? ` (${item.Variacion_Porcentual}%)`
      : "";

  tendencia.textContent =
    `Tendencia: ${
      item.Tendencia || "Sin datos"
    }${variacion}`;

  tendencia.style.cssText = `
    font-size:12px;
    color:#334155;
    margin:5px 0;
  `;

  tarjeta.appendChild(tendencia);

  /* FACTOR PRINCIPAL */

  const factor =
    document.createElement("p");

  factor.textContent =
    `Factor principal: ${
      item.Factor_Principal || "Sin datos"
    }`;

  factor.style.cssText = `
    font-size:12px;
    color:#334155;
    margin:5px 0;
  `;

  tarjeta.appendChild(factor);

  /* BOTON PARA CONSULTAR SECTOR */

  const boton =
    document.createElement("button");

  boton.type = "button";

  boton.textContent =
    "Ver detalle del sector";

  boton.style.cssText = `
    background:#102D4F;
    color:#FFFFFF;
    border:0;
    border-radius:7px;
    padding:8px 12px;
    font-size:11px;
    font-weight:700;
    cursor:pointer;
    margin-top:10px;
  `;

  boton.onclick = () => {

    mostrarDetalle(item);

    const detalle =
      document.querySelector(".detalle");

    if (detalle) {

      detalle.scrollIntoView({
        behavior:"smooth",
        block:"center"
      });

    }

  };

  tarjeta.appendChild(boton);

  return tarjeta;
}


/* ACTUALIZAR PANEL DE ALERTAS */

function actualizarAlertaPredictiva() {

  const alerta =
    document.getElementById(
      "alertaPredictiva"
    );

  const titulo =
    document.getElementById(
      "alertaTitulo"
    );

  const contenido =
    document.getElementById(
      "alertaTexto"
    );

  if (!alerta || !titulo || !contenido) {
    return;
  }

  const sectoresAlto =
    obtenerSectoresEnAlerta();

  /* SIN SECTORES EN ALERTA */

  if (sectoresAlto.length === 0) {

    alerta.classList.add("oculto");

    contenido.replaceChildren();

    return;
  }

  /* MOSTRAR ALERTAS */

  alerta.classList.remove("oculto");

  alerta.style.alignItems = "flex-start";

  /* TITULO GENERAL */

  const cantidad =
    sectoresAlto.length;

  titulo.textContent =
    `${cantidad} ${
      cantidad === 1
        ? "SECTOR REQUIERE"
        : "SECTORES REQUIEREN"
    } ATENCIÓN PREVENTIVA`;

  titulo.style.cssText = `
    color:#102D4F;
    font-size:15px;
    font-weight:800;
    display:block;
    margin-bottom:8px;
  `;

  /* LIMPIAR ALERTAS ANTERIORES */

  contenido.replaceChildren();

  /* EL CONTENEDOR EXISTENTE
     SERA UTILIZADO COMO LISTA */

  contenido.style.cssText = `
    display:block;
    width:100%;
    margin:0;
  `;

  /* MENSAJE INTRODUCTORIO */

  const introduccion =
    document.createElement("div");

  introduccion.textContent =
    "Sectores identificados con nivel Alto o Crítico en el análisis SST. Se muestran de mayor a menor prioridad.";

  introduccion.style.cssText = `
    font-size:12px;
    color:#475569;
    margin-bottom:10px;
    line-height:1.5;
  `;

  contenido.appendChild(introduccion);

  /* AGREGAR TODAS LAS ALERTAS */

  const lista =
    document.createElement("div");

  lista.style.cssText = `
    display:grid;
    grid-template-columns:repeat(
      auto-fit,
      minmax(min(100%,280px),1fr)
    );
    gap:12px;
    width:100%;
  `;

  sectoresAlto.forEach(item => {

    const tarjeta =
      crearTarjetaAlerta(item);

    lista.appendChild(tarjeta);

  });

  contenido.appendChild(lista);
}


/* ==========================================
   TABLA Y RANKING DE SECTORES
   ========================================== */

function actualizarTabla() {

  const tbody =
    document.getElementById(
      "tablaSectores"
    );

  tbody.innerHTML = "";

  const prioritario =
    obtenerPrioritario();

  const numeroPrioritario =
    prioritario
      ? numeroSector(prioritario.Sector)
      : null;

  sectores.forEach(item => {

    const fila =
      document.createElement("tr");

    const numero =
      numeroSector(item.Sector);

    const variacion =
      item.Variacion_Porcentual !== "" &&
      item.Variacion_Porcentual != null
        ? `${item.Variacion_Porcentual}%`
        : "—";

    const indice =
      item.Indice_Sectorial !== "" &&
      item.Indice_Sectorial != null
        ? item.Indice_Sectorial
        : "—";

    if (numero === numeroPrioritario) {

      fila.classList.add(
        "fila-prioritaria"
      );

    }

    /* CREAR CELDAS SIN HTML DINAMICO */

    const valores = [
      item.Sector || "Sin datos",
      indice,
      null,
      item.Total_Registros ?? 0,
      item.Registros_Ultimos_7d ?? 0,
      item.Tendencia || "Sin datos",
      variacion,
      item.Factor_Principal || "Sin datos"
    ];

    valores.forEach((valor, posicion) => {

      const celda =
        document.createElement("td");

      if (posicion === 2) {

        const nivel =
          document.createElement("span");

        nivel.className =
          `nivel-tabla ${
            claseNivel(item.Nivel_Sectorial)
          }`;

        nivel.textContent =
          item.Nivel_Sectorial ||
          "Sin datos";

        celda.appendChild(nivel);

      } else {

        celda.textContent =
          String(valor);

      }

      fila.appendChild(celda);

    });

    fila.onclick =
      () => mostrarDetalle(item);

    tbody.appendChild(fila);

  });
}


/* ==========================================
   BOTON ACTUALIZAR DATOS
   ========================================== */

const btnActualizar =
  document.getElementById(
    "btnActualizar"
  );

if (btnActualizar) {

  btnActualizar.addEventListener(
    "click",
    cargarDatos
  );

}


/* ==========================================
   CARGA INICIAL
   ========================================== */

cargarDatos();
