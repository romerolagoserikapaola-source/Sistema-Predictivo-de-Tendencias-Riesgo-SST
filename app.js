const API_URL = "https://romerolagoserikapaola.app.n8n.cloud/webhook/mapa-calor-sst";

let sectores = [];

function numeroSector(nombre) {
  const resultado = String(nombre || "").match(/Sector\s*(\d+)/i);
  return resultado ? Number(resultado[1]) : null;
}

function claseNivel(nivel) {
  if (!nivel) return "sin-datos";

  const texto = String(nivel)
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

async function cargarDatos() {
  try {
    document.getElementById("textoConexion").textContent =
      "Actualizando datos...";

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("No se pudo consultar la API");
    }

    sectores = await response.json();

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

function actualizarMapa() {
  sectores.forEach(item => {

    const numero =
      numeroSector(item.Sector);

    if (!numero) return;

    const clase =
      claseNivel(item.Nivel_Sectorial);


    /* CÍRCULO DEL SECTOR */

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


    /* ZONA COLOREADA DEL MAPA */

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

function mostrarDetalle(item) {

  document.getElementById("detalleSector").textContent =
    item.Sector;


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


  /* BADGE DE NIVEL */

  const badge =
    document.getElementById("badgeNivel");

  badge.className =
    `badge ${claseNivel(item.Nivel_Sectorial)}`;

  badge.textContent =
    item.Nivel_Sectorial || "Sin datos";


  /* QUITAR SELECCIÓN ANTERIOR */

  document
    .querySelectorAll(".mapa-overlay polygon")
    .forEach(zona =>
      zona.classList.remove("seleccionado")
    );


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
    bajo +
    medio +
    alto +
    critico;


  const porcentaje = valor =>
    total > 0
      ? (valor / total) * 100
      : 0;


  document.getElementById("barraBajo").style.width =
    `${porcentaje(bajo)}%`;

  document.getElementById("barraMedio").style.width =
    `${porcentaje(medio)}%`;

  document.getElementById("barraAlto").style.width =
    `${porcentaje(alto)}%`;

  document.getElementById("barraCritico").style.width =
    `${porcentaje(critico)}%`;
}

function obtenerPrioritario() {

  const conDatos =
    sectores.filter(item =>
      item.Indice_Sectorial !== "" &&
      item.Indice_Sectorial != null
    );


  if (!conDatos.length) {
    return null;
  }


  return [...conDatos].sort(
    (a, b) => {

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
  )[0];
}

function actualizarKPIs() {

  document.getElementById("kpiSectores").textContent =
    sectores.length || 8;


  const totalRegistros =
    sectores.reduce(
      (suma, item) =>
        suma +
        Number(item.Total_Registros || 0),
      0
    );


  document.getElementById("kpiRegistros").textContent =
    totalRegistros;


  const prioritario =
    obtenerPrioritario();


  if (!prioritario) {

    document.getElementById("kpiPrioritario").textContent =
      "--";

    document.getElementById("kpiNivel").textContent =
      "--";

    return;
  }


  document.getElementById("kpiPrioritario").textContent =
    `Sector ${numeroSector(prioritario.Sector)}`;


  const kpiNivel =
    document.getElementById("kpiNivel");


  kpiNivel.className =
    `nivel-kpi ${claseNivel(prioritario.Nivel_Sectorial)}`;


  kpiNivel.textContent =
    prioritario.Nivel_Sectorial;
}

function actualizarAlertaPredictiva() {

  const prioritario =
    obtenerPrioritario();


  const alerta =
    document.getElementById("alertaPredictiva");


  if (!prioritario) {

    alerta.classList.add("oculto");

    return;
  }


  const tendencia =
    String(
      prioritario.Tendencia || ""
    ).toLowerCase();


  const esAlerta =
    prioridadNivel(
      prioritario.Nivel_Sectorial
    ) >= 3

    ||

    tendencia.includes("creciente");


  if (!esAlerta) {

    alerta.classList.add("oculto");

    return;
  }


  alerta.classList.remove("oculto");


  document.getElementById("alertaTitulo").textContent =
    `${prioritario.Sector} · Nivel ${prioritario.Nivel_Sectorial}`;


  const variacion =
    prioritario.Variacion_Porcentual !== "" &&
    prioritario.Variacion_Porcentual != null

      ? `${prioritario.Variacion_Porcentual}%`
      : "sin variación calculada";


  document.getElementById("alertaTexto").textContent =

    `Tendencia ${prioritario.Tendencia || "Sin datos"} (${variacion}). ` +

    `Factor principal: ${prioritario.Factor_Principal || "Sin datos"}.`;
}

function actualizarTabla() {

  const tbody =
    document.getElementById("tablaSectores");


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


    fila.innerHTML = `

      <td>
        ${item.Sector}
      </td>


      <td>
        ${indice}
      </td>


      <td>

        <span
          class="
            nivel-tabla
            ${claseNivel(item.Nivel_Sectorial)}
          "
        >

          ${item.Nivel_Sectorial || "Sin datos"}

        </span>

      </td>


      <td>
        ${item.Total_Registros || 0}
      </td>


      <td>
        ${item.Registros_Ultimos_7d || 0}
      </td>


      <td>
        ${item.Tendencia || "Sin datos"}
      </td>


      <td>
        ${variacion}
      </td>


      <td>
        ${item.Factor_Principal || "Sin datos"}
      </td>

    `;


    fila.onclick =
      () => mostrarDetalle(item);


    tbody.appendChild(fila);

  });
}

document
  .getElementById("btnActualizar")
  .addEventListener(
    "click",
    cargarDatos
  );


cargarDatos();