
const API_URL =
  "https://romerolagoserikapaola.app.n8n.cloud/webhook/mapa-calor-sst";

let sectores = [];

/* NOMBRE VISIBLE DEL SECTOR */

function nombreVisibleSector(nombre) {
  return String(nombre || "Sin datos")
    .replace(/Quitaracsa/gi, "Quebrada");
}

/* IDENTIFICAR NUMERO DE SECTOR */

function numeroSector(nombre) {
  const resultado =
    String(nombre || "").match(/Sector\s*(\d+)/i);

  return resultado ? Number(resultado[1]) : null;
}

/* CLASIFICACION DEL NIVEL */

function claseNivel(nivel) {
  if (!nivel) return "sin-datos";

  const texto = String(nivel)
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

/* CONSULTAR DATOS DESDE N8N */

async function cargarDatos() {
  try {
    document.getElementById("textoConexion").textContent =
      "Actualizando datos...";

    const response = await fetch(
      API_URL,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("No se pudo consultar la API");
    }

    const datos = await response.json();

    if (!Array.isArray(datos)) {
      throw new Error("La API no devolvió una lista de sectores");
    }

    sectores = datos;

    const estado =
      document.getElementById("estadoConexion");

    estado.classList.remove("error");
    estado.classList.add("online");

    document.getElementById("textoConexion").textContent =
      "Datos actualizados";

    actualizarKPIs();
    actualizarMapa();
    actualizarTabla();
    actualizarAlertaPredictiva();

  } catch (error) {
    console.error(error);

    const estado =
      document.getElementById("estadoConexion");

    estado.classList.remove("online");
    estado.classList.add("error");

    document.getElementById("textoConexion").textContent =
      "Error de conexión";
  }
}

/* ACTUALIZAR MAPA */

function actualizarMapa() {
  sectores.forEach(item => {

    const numero = numeroSector(item.Sector);

    if (!numero) return;

    const clase = claseNivel(item.Nivel_Sectorial);

    const boton = document.querySelector(
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
      boton.onclick = () => mostrarDetalle(item);
    }

    const zona = document.querySelector(
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
      zona.onclick = () => mostrarDetalle(item);
    }
  });
}

/* MOSTRAR DETALLE DEL SECTOR */

function mostrarDetalle(item) {

  document.getElementById("detalleSector").textContent =
    nombreVisibleSector(item.Sector);

  document.getElementById("detalleIndice").textContent =
    item.Indice_Sectorial !== "" &&
    item.Indice_Sectorial != null
      ? item.Indice_Sectorial
      : "—";

  document.getElementById("detalleRegistros").textContent =
    item.Total_Registros ?? 0;

  document.getElementById("detalleTendencia").textContent =
    item.Tendencia || "Sin datos";

  document.getElementById("detalleVariacion").textContent =
    item.Variacion_Porcentual !== "" &&
    item.Variacion_Porcentual != null
      ? `${item.Variacion_Porcentual}%`
      : "—";

  document.getElementById("detalleBajo").textContent =
    item.Bajo ?? 0;

  document.getElementById("detalleMedio").textContent =
    item.Medio ?? 0;

  document.getElementById("detalleAlto").textContent =
    item.Alto ?? 0;

  document.getElementById("detalleCritico").textContent =
    item.Critico ?? 0;

  document.getElementById("detalleFactor").textContent =
    item.Factor_Principal || "Sin datos";

  const badge =
    document.getElementById("badgeNivel");

  badge.className =
    `badge ${claseNivel(item.Nivel_Sectorial)}`;

  badge.textContent =
    item.Nivel_Sectorial || "Sin datos";

  /* LIMPIAR SELECCION */

  document
    .querySelectorAll(".mapa-overlay polygon")
    .forEach(zona =>
      zona.classList.remove("seleccionado")
    );

  const numero = numeroSector(item.Sector);

  const zona = document.querySelector(
    `[data-zona="${numero}"]`
  );

  if (zona) {
    zona.classList.add("seleccionado");
  }

  actualizarBarra(item);
}

/* BARRA DE DISTRIBUCION */

function actualizarBarra(item) {

  const bajo = Number(item.Bajo || 0);
  const medio = Number(item.Medio || 0);
  const alto = Number(item.Alto || 0);
  const critico = Number(item.Critico || 0);

  const total = bajo + medio + alto + critico;

  const porcentaje = valor =>
    total > 0 ? (valor / total) * 100 : 0;

  document.getElementById("barraBajo").style.width =
    `${porcentaje(bajo)}%`;

  document.getElementById("barraMedio").style.width =
    `${porcentaje(medio)}%`;

  document.getElementById("barraAlto").style.width =
    `${porcentaje(alto)}%`;

  document.getElementById("barraCritico").style.width =
    `${porcentaje(critico)}%`;
}

/* ORDENAR POR PRIORIDAD */

function ordenarPorPrioridad(a, b) {
  const diferencia =
    prioridadNivel(b.Nivel_Sectorial) -
    prioridadNivel(a.Nivel_Sectorial);

  if (diferencia !== 0) return diferencia;

  return Number(b.Indice_Sectorial || 0) -
    Number(a.Indice_Sectorial || 0);
}

/* SECTOR DE MAYOR PRIORIDAD */

function obtenerPrioritario() {

  const conDatos = sectores.filter(item =>
    item.Indice_Sectorial !== "" &&
    item.Indice_Sectorial != null &&
    Number.isFinite(Number(item.Indice_Sectorial))
  );

  if (!conDatos.length) return null;

  return [...conDatos]
    .sort(ordenarPorPrioridad)[0];
}

/* INDICADORES PRINCIPALES */

function actualizarKPIs() {

  document.getElementById("kpiSectores").textContent =
    sectores.length;

  const totalRegistros = sectores.reduce(
    (suma, item) =>
      suma + Number(item.Total_Registros || 0),
    0
  );

  document.getElementById("kpiRegistros").textContent =
    totalRegistros;

  const prioritario = obtenerPrioritario();

  const kpiPrioritario =
    document.getElementById("kpiPrioritario");

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

/* TODAS LAS ALERTAS DE NIVEL ALTO */

function actualizarAlertaPredictiva() {

  const alerta =
    document.getElementById("alertaPredictiva");

  const titulo =
    document.getElementById("alertaTitulo");

  const contenido =
    document.getElementById("alertaTexto");

  if (!alerta || !titulo || !contenido) return;

  const alertas = sectores
    .filter(item =>
      ["alto", "critico"].includes(
        claseNivel(item.Nivel_Sectorial)
      )
    )
    .sort(ordenarPorPrioridad);

  contenido.replaceChildren();

  if (!alertas.length) {
    alerta.classList.add("oculto");
    return;
  }

  alerta.classList.remove("oculto");
  alerta.style.alignItems = "flex-start";

  titulo.textContent =
    `${alertas.length} ${
      alertas.length === 1
        ? "SECTOR REQUIERE"
        : "SECTORES REQUIEREN"
    } ATENCIÓN PREVENTIVA`;

  contenido.style.cssText =
    "display:block;width:100%;margin:0;";

  const lista = document.createElement("div");

  lista.style.cssText = `
    display:grid;
    grid-template-columns:repeat(
      auto-fit,
      minmax(min(100%,280px),1fr)
    );
    gap:12px;
    width:100%;
    margin-top:10px;
  `;

  alertas.forEach(item => {

    const tarjeta = document.createElement("div");

    const esCritico =
      claseNivel(item.Nivel_Sectorial) === "critico";

    const color = esCritico
      ? "#991B1B"
      : "#DC2626";

    tarjeta.style.cssText = `
      background:#FFFFFF;
      border:1px solid #E2E8F0;
      border-left:5px solid ${color};
      border-radius:10px;
      padding:14px;
      box-shadow:0 3px 10px rgba(16,45,79,.06);
    `;

    const encabezado =
      document.createElement("div");

    encabezado.style.cssText = `
      display:flex;
      align-items:center;
      justify-content:space-between;
      flex-wrap:wrap;
      gap:8px;
    `;

    const nombre = document.createElement("strong");

    nombre.textContent =
      nombreVisibleSector(item.Sector);

    nombre.style.cssText = `
      font-size:14px;
      color:#102D4F;
    `;

    const nivel = document.createElement("span");

    nivel.textContent =
      String(item.Nivel_Sectorial || "Alto")
        .toUpperCase();

    nivel.style.cssText = `
      background:${color};
      color:#FFFFFF;
      border-radius:15px;
      padding:5px 10px;
      font-size:11px;
      font-weight:bold;
    `;

    encabezado.append(nombre, nivel);
    tarjeta.append(encabezado);

    const datos = [
      `Índice sectorial: ${item.Indice_Sectorial ?? "—"}`,
      `Tendencia: ${item.Tendencia || "Sin datos"}${
        item.Variacion_Porcentual !== "" &&
        item.Variacion_Porcentual != null
          ? " (" + item.Variacion_Porcentual + "%)"
          : ""
      }`,
      `Factor principal: ${item.Factor_Principal || "Sin datos"}`
    ];

    datos.forEach(valor => {
      const parrafo = document.createElement("p");

      parrafo.textContent = valor;

      parrafo.style.cssText = `
        font-size:12px;
        margin:7px 0;
        color:#334155;
      `;

      tarjeta.append(parrafo);
    });

    const boton = document.createElement("button");

    boton.type = "button";

    boton.textContent =
      "Ver detalle del sector";

    boton.style.cssText = `
      margin-top:8px;
      border:0;
      border-radius:6px;
      padding:8px 12px;
      background:#102D4F;
      color:#FFFFFF;
      font-weight:bold;
      cursor:pointer;
    `;

    boton.onclick = () => {
      mostrarDetalle(item);

      const panel = document.querySelector(".detalle");

      if (panel) {
        panel.scrollIntoView({
          behavior:"smooth",
          block:"center"
        });
      }
    };

    tarjeta.append(boton);
    lista.append(tarjeta);
  });

  contenido.append(lista);
}

/* TABLA DE MONITOREO */

function actualizarTabla() {

  const tbody =
    document.getElementById("tablaSectores");

  tbody.innerHTML = "";

  const prioritario = obtenerPrioritario();

  const numeroPrioritario = prioritario
    ? numeroSector(prioritario.Sector)
    : null;

  sectores.forEach(item => {

    const fila = document.createElement("tr");

    const numero = numeroSector(item.Sector);

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
      fila.classList.add("fila-prioritaria");
    }

    const valores = [
      nombreVisibleSector(item.Sector),
      indice,
      null,
      item.Total_Registros ?? 0,
      item.Registros_Ultimos_7d ?? 0,
      item.Tendencia || "Sin datos",
      variacion,
      item.Factor_Principal || "Sin datos"
    ];

    valores.forEach((valor, posicion) => {

      const celda = document.createElement("td");

      if (posicion === 2) {

        const etiqueta =
          document.createElement("span");

        etiqueta.className =
          `nivel-tabla ${claseNivel(item.Nivel_Sectorial)}`;

        etiqueta.textContent =
          item.Nivel_Sectorial || "Sin datos";

        celda.appendChild(etiqueta);

      } else {

        celda.textContent = String(valor);

      }

      fila.appendChild(celda);
    });

    fila.onclick = () => mostrarDetalle(item);

    tbody.appendChild(fila);
  });
}

/* BOTON ACTUALIZAR */

const botonActualizar =
  document.getElementById("btnActualizar");

if (botonActualizar) {
  botonActualizar.addEventListener(
    "click",
    cargarDatos
  );
}

/* CARGA INICIAL */

cargarDatos();
