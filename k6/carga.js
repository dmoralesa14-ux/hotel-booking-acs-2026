import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://hotel-booking-backend-qa-acs-2026.onrender.com";
const LIMITE_P95_MS = 2000;
const LIMITE_ERRORES = 0.05;
const DURACION_CARGA_S = 540;

const ENDPOINTS = [
  { nombre: "getrooms", ruta: "/api/room/getrooms" },
  { nombre: "get_all_details", ruta: "/api/booking/get-all-details" },
  { nombre: "getroomcategories", ruta: "/api/roomcategory/getroomcategories" },
];

export const options = {
  setupTimeout: "5m",
  scenarios: {
    carga: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "6m", target: 50 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    "http_req_duration{endpoint:getrooms}": [`p(95)<${LIMITE_P95_MS}`],
    "http_req_duration{endpoint:get_all_details}": [`p(95)<${LIMITE_P95_MS}`],
    "http_req_duration{endpoint:getroomcategories}": [`p(95)<${LIMITE_P95_MS}`],
    "http_reqs{endpoint:getrooms}": ["count>=0"],
    "http_reqs{endpoint:get_all_details}": ["count>=0"],
    "http_reqs{endpoint:getroomcategories}": ["count>=0"],
    "http_req_failed{etapa:carga}": [`rate<${LIMITE_ERRORES}`],
    "http_req_duration{etapa:carga}": ["max>=0"],
    "http_reqs{etapa:carga}": ["count>=0"],
  },
};

export function setup() {
  let listo = false;
  for (let intento = 1; intento <= 10 && !listo; intento++) {
    const respuesta = http.get(`${BASE_URL}/api/roomcategory/getroomcategories`, {
      tags: { etapa: "calentamiento", endpoint: "calentamiento" },
      timeout: "120s",
    });
    listo = respuesta.status === 200;
    if (!listo) {
      sleep(10);
    }
  }
  if (!listo) {
    throw new Error("El ambiente no respondió durante el calentamiento");
  }
}

export default function () {
  for (const endpoint of ENDPOINTS) {
    const respuesta = http.get(`${BASE_URL}${endpoint.ruta}`, {
      tags: { endpoint: endpoint.nombre, etapa: "carga" },
      timeout: "30s",
    });
    check(
      respuesta,
      {
        "código 200": (r) => r.status === 200,
        "respuesta con success true": (r) => r.status === 200 && r.body.includes('"success":true'),
      },
      { endpoint: endpoint.nombre }
    );
  }
  sleep(1 + Math.random());
}

function valores(datos, clave) {
  const metrica = datos.metrics[clave];
  return metrica ? metrica.values : {};
}

function ms(valor) {
  return valor === undefined ? "n/d" : `${valor.toFixed(1)} ms`;
}

function filaEndpoint(datos, endpoint) {
  const duracion = valores(datos, `http_req_duration{endpoint:${endpoint.nombre}}`);
  const cantidad = valores(datos, `http_reqs{endpoint:${endpoint.nombre}}`).count;
  const p95 = duracion["p(95)"];
  const cumple = cantidad > 0 && p95 !== undefined && p95 < LIMITE_P95_MS ? "CUMPLE" : "NO CUMPLE";
  return {
    endpoint: endpoint.ruta,
    solicitudes: cantidad,
    promedio_ms: duracion.avg,
    p95_ms: p95,
    maximo_ms: duracion.max,
    rnf02: cumple,
  };
}

export function handleSummary(datos) {
  const filas = ENDPOINTS.map((endpoint) => filaEndpoint(datos, endpoint));
  const duracion = valores(datos, "http_req_duration{etapa:carga}");
  const solicitudes = valores(datos, "http_reqs{etapa:carga}").count || 0;
  const fallidas = valores(datos, "http_req_failed{etapa:carga}");
  const tasaError = fallidas.rate || 0;
  const reporte = {
    ambiente: BASE_URL,
    duracion_fase_carga_s: DURACION_CARGA_S,
    usuarios_virtuales_maximos: 50,
    solicitudes_totales: solicitudes,
    throughput_solicitudes_por_s: solicitudes / DURACION_CARGA_S,
    tiempo_respuesta_promedio_ms: duracion.avg,
    tiempo_respuesta_p95_ms: duracion["p(95)"],
    tasa_error: tasaError,
    por_endpoint: filas,
    rnf02: filas.every((fila) => fila.rnf02 === "CUMPLE") ? "CUMPLE" : "NO CUMPLE",
    rnf01_indicador_error: solicitudes > 0 && tasaError < LIMITE_ERRORES ? "CUMPLE" : "NO CUMPLE",
  };

  const texto = [
    "RESULTADOS DE LA PRUEBA DE CARGA",
    `Ambiente: ${BASE_URL}`,
    `Fase de carga: ${DURACION_CARGA_S} s, hasta 50 usuarios virtuales`,
    "",
    "Por endpoint:",
    ...filas.map(
      (fila) =>
        `  ${fila.endpoint}: ${fila.solicitudes} solicitudes | promedio ${ms(fila.promedio_ms)} | p95 ${ms(fila.p95_ms)} | máximo ${ms(fila.maximo_ms)} | RNF-02: ${fila.rnf02}`
    ),
    "",
    "Total:",
    `  Solicitudes: ${solicitudes}`,
    `  Throughput: ${reporte.throughput_solicitudes_por_s.toFixed(2)} solicitudes/s`,
    `  Tiempo de respuesta promedio: ${ms(reporte.tiempo_respuesta_promedio_ms)}`,
    `  Percentil 95: ${ms(reporte.tiempo_respuesta_p95_ms)}`,
    `  Tasa de error: ${(tasaError * 100).toFixed(2)} %`,
    "",
    `RNF-02 (p95 menor a ${LIMITE_P95_MS} ms en los endpoints de consulta): ${reporte.rnf02}`,
    `RNF-01 (indicador: tasa de error menor a ${LIMITE_ERRORES * 100} %): ${reporte.rnf01_indicador_error}`,
    "",
  ].join("\n");

  return {
    stdout: texto,
    "resumen_carga.json": JSON.stringify(reporte, null, 2),
    "resumen_carga_completo.json": JSON.stringify(datos, null, 2),
  };
}
