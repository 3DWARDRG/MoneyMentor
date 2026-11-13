import path from "path";
import { extractPdfText } from "../services/ai/pdf";
import { parseStatement } from "../services/ai/statementParser";

// ------------------------------------------------------------------
// MOCK: Reemplazamos las librerías nativas del celular por las de la PC
//
// 1. expo-file-system/next -> fs de Node (lectura y escritura de archivos)
// 2. OCR (ML Kit) -> texto OCR REAL de los PDFs escaneados, aportado por el
//    usuario. ML Kit no corre en Jest, así que el reconocimiento final se
//    simula con el texto real que produce en el dispositivo.
// ------------------------------------------------------------------

// Texto OCR real de los PDFs escaneados (aportado por el usuario).
// Se devuelve en la primera llamada de cada extracción para no duplicarlo.
const OCR_FIXTURES: Record<string, string> = {
  "extractoTarjetaNu.pdf": `Hola, Edward Andrés
Llegó tu extracto de Julio

Edward Andrés Rodríguez

Tus tarjetas

CC 1000349412
Tarjeta física
Tarjeta virtual
Transversal 22 #8-58 torre 9
• • • • 9122
• • • • 7496

Fecha límite de pago
18 AGO 2026

Fecha de corte
29 JUL 2026

Periodo facturado
28 JUN 2026 - 28 JUL

Resumen de tu extracto
Tu cupo definido $12.000.000,00
Usado $1.449.800,26
Disponible $10.550.199,74

Deuda a pagar este mes
Intereses
Comisiones de avances
Comisiones por servicio
Cargos por conversión
Abonos
Devoluciones y ajustes a favor
PAGO MÍNIMO
Deuda restante
DEUDA TOTAL HASTA EL 28 JULIO 2026

$42.595,59

$10.567,86

$0,00

$20.000,00

$0,00

$0,00

$0,00
$73.163,45

$1.171.636,81
$1.244.800,26

Fecha	Descripción	Valor	Cuotas	Valor del mes	Interés del mes	Porcentaje y valor	Total a pagar este mes	Restante por pagar
27 JUL 2026	Cuota por avance a cuenta	$150.000,00	1 de 36	$4.166,67	2.07% ($206,78)	$9.373,45	$5.000,00	$145.833,33
Comisión por servicio							
27 JUL 2026	Cuota por avance a cuenta	$50.000,00	1 de 36	$1.388,89	2.07% ($68,93)	$6.457,82	$5.000,00	$48.611,11
Comisión por servicio							
27 JUL 2026	Cun	$236.225,00	1 de 36	$6.561,81	2.10% ($0,00)	$6.561,81		$229.663,19
24 JUL 2026	Tienda D1 Zipaquira la	$55.720,00	1 de 24	$2.321,67	2.10% ($0,00)	$2.321,67		$53.398,33
24 JUL 2026	Expotenis	$40.000,00	1 de 24	$1.666,67	2.10% ($0,00)	$1.666,67		$38.333,33
23 JUL 2026	Cuota por avance a cuenta	$50.000,00	1 de 36	$1.388,89	2.07% ($206,78)	$6.595,67	$5.000,00	$48.611,11
Comisión por servicio							
18 JUL 2026	Metro Zipaquira	$76.306,00	1 de 24	$3.179,42	2.10% ($0,00)	$3.179,42		$73.126,58
18 JUL 2026	Cuota por avance a cuenta	$242.000,00	1 de 36	$6.722,22	2.07% ($2.001,66)	$13.723,88	$5.000,00	$235.277,78
Comisión por servicio							
10 JUL 2026	Metro Zipaquira	$120.930,00	1 de 24	$5.038,75	2.10% ($0,00)	$5.038,75		$115.891,25
05 JUL 2026	Pago	$10.160,60		A capital $10,160,60	A intereses $0,00	A cargas y comisiones $0,00	$0,00	$0,00
01 JUN 2026	Amazon.Com	$203.212,00	2 de 20	$10.160,60	2.10% ($8.083,71)	$18.244,31		$182.890,80`,
  "extractoNequi2026.pdf": `Página 1
Nequi
(+57) 300 600 0100
Carrera 48 # 26 - 85
Medellín Colombia
www.nequi.com.co
Extracto de depósito de bajo monto de:
EDWARD ANDRES RODRIGUEZ GONZALEZ
edwardr185@gmail.com
Número de depósito de bajo monto: 3046234044
Estado de depósito de bajo monto para el período de: 2026/01/01 a 2026/01/31
Resumen
Concepto
Valor
Concepto
Valor
Saldo anterior
$2,991.97
Saldo promedio
$36,407.18
Total abonos
$812,000.90
Cuentas por cobrar
$0.00
Total cargos
$812,050.00
Valor de intereses pagados
$0.90
Saldo actual
$2,942.87
Retefuente
$0.00
Movimientos
Fecha del movimiento
Descripción
Valor
Saldo
29/01/2026
RETIRO EN CAJERO
$-10,000.00
$2,942.87
29/01/2026
RECIBI POR BRE-B DE: EDWARD
$5,000.00
$12,942.87
29/01/2026
Para GERMAN AUGUSTO
$-30,000.00
$7,942.87
29/01/2026
RECIBI POR BRE-B DE: EDWARD
$5,000.00
$37,942.87
29/01/2026
RECIBI POR BRE-B DE: EDWARD
$30,000.00
$32,942.87
28/01/2026
RETIRO EN CAJERO
$-20,000.00
$2,942.87
28/01/2026
RECIBI POR BRE-B DE: EDWARD
$7,000.00
$22,942.87
25/01/2026
COMPRA EN SPOTIFY
$-10,100.00
$15,942.87
20/01/2026
COMPRA PSE EN
$-34,500.00
$26,042.87
15/01/2026
RETIRO EN CAJERO
$-20,000.00
$60,542.87
15/01/2026
RECIBI POR BRE-B DE: Edward
$60,000.00
$80,542.87
11/01/2026
WOMPI_RAPPI
$-60,950.00
$20,542.87
08/01/2026
Pago de Intereses
$0.90
$81,492.87
07/01/2026
Para HERNAN DAVID PERALTA D
$-26,500.00
$81,491.97
05/01/2026
Para FLOR ALBA CANON
$-550,000.00
$107,991.97
Defensor Consumidor Financiero: Maria Adelayda Calle - defensor@bancolombia.com.co - Cr 48A #18A 14, Piso 9 - Medellín - Tel: +57 (604) 3561225
BANCOLOMBIA S.A. Establecimiento Bancario
SUPERINTENDENCIA FINANCIERA DE COLOMBIA — VIGILADO
Fogafín
Producto protegido por el Seguro de Depósitos
www.fogafin.gov.co
Página 2
Nequi
(+57) 300 600 0100
Carrera 48 # 26 - 85
Medellín Colombia
www.nequi.com.co
Movimientos
Fecha del movimiento
Descripción
Valor
Saldo
05/01/2026
RECIBI POR BRE-B DE: EDWARD
$655,000.00
$657,991.97
02/01/2026
RETIRO EN CAJERO
$-20,000.00
$2,991.97
02/01/2026
RETIRO EN CAJERO
$-30,000.00
$22,991.97
02/01/2026
RECIBI POR BRE-B DE: EDWARD
$50,000.00
$52,991.97
Los depósitos de bajo monto Nequi generan rendimientos, los cuales se liquidan diariamente sobre el saldo diario y se abonan de acuerdo con lo estipulado en el reglamento de depósitos de bajo monto. Puedes consultar la tasa en
https://www.nequi.com.co/tarifas-nequi
Defensor Consumidor Financiero: Maria Adelayda Calle - defensor@bancolombia.com.co - Cr 48A #18A 14, Piso 9 - Medellín - Tel: +57 (604) 3561225
BANCOLOMBIA S.A. Establecimiento Bancario
SUPERINTENDENCIA FINANCIERA DE COLOMBIA — VIGILADO
Fogafín
Producto protegido por el Seguro de Depósitos
www.fogafin.gov.co`,
};

let mockOcrFixture = "";
let mockOcrCalls = 0;

jest.mock("expo-file-system/next", () => {
  const fs = jest.requireActual("fs");

  return {
    Paths: { cache: "/tmp" },
    File: jest.fn().mockImplementation((dirOrUri: string, name?: string) => {
      const self = {
        uri: name ? `${dirOrUri}/${name}` : dirOrUri,
        bytes: () => {
          const cleanPath = self.uri.replace("file://", "");
          const buffer = fs.readFileSync(cleanPath);
          return new Uint8Array(buffer);
        },
        create: jest.fn(),
        write: jest.fn(),
        delete: jest.fn(),
      };
      return self;
    }),
  };
});

jest.mock("../services/ai/ocr", () => ({
  OcrUnavailableError: class extends Error {},
  recognizeImageText: jest.fn().mockImplementation(async () => {
    mockOcrCalls += 1;
    if (mockOcrCalls === 1) return { text: mockOcrFixture, lineCount: 1 };
    return { text: "", lineCount: 0 };
  }),
}));
// ------------------------------------------------------------------

const withOcrFixture = async (
  fileName: string,
  fn: () => Promise<void>,
) => {
  const base = fileName.includes("extractoTarjetaNu") ? "extractoTarjetaNu.pdf" : "extractoNequi2026.pdf";
  mockOcrFixture = OCR_FIXTURES[base] ?? "";
  mockOcrCalls = 0;
  try {
    await fn();
  } finally {
    mockOcrFixture = "";
    mockOcrCalls = 0;
  }
};

describe("Money Mentor - Pruebas de Integración con Archivos Reales", () => {
  // Construimos la ruta base hacia tu carpeta examples
  const EXAMPLES_DIR = path.join(process.cwd(), "examples");

  describe("Extracción y Parseo: BBVA", () => {
    it("debe procesar el PDF completo de BBVA y generar transacciones", async () => {
      const filePath = path.join(EXAMPLES_DIR, "Extracto_de_BBVA.pdf");
      const fileUri = `file://${filePath}`;

      const rawText = await extractPdfText(fileUri);
      const result = parseStatement(rawText);

      expect(result.candidates.length).toBeGreaterThan(0);

      // Descomenta esto para ver en consola todo lo que logró extraer del PDF real:
      // console.log("Candidatos BBVA:", result.candidates);
    });
  });

  describe("Extracción y Parseo: Nu Colombia", () => {
    it("debe procesar el PDF de Nu y detectar el formato correcto", async () => {
      const filePath = path.join(EXAMPLES_DIR, "extractoTarjetaNu.pdf");
      const fileUri = `file://${filePath}`;

      await withOcrFixture("extractoTarjetaNu.pdf", async () => {
        const rawText = await extractPdfText(fileUri);
        const result = parseStatement(rawText);

        expect(result.candidates.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Extracción y Parseo: Nequi (PDF)", () => {
    it("debe procesar el extracto generado por Nequi", async () => {
      const filePath = path.join(EXAMPLES_DIR, "extractoNequi2026.pdf");
      const fileUri = `file://${filePath}`;

      await withOcrFixture("extractoNequi2026.pdf", async () => {
        const rawText = await extractPdfText(fileUri);
        const result = parseStatement(rawText);

        expect(result.candidates.length).toBeGreaterThan(0);
      });
    });
  });
});
