import { processStatementPdf } from "../services/ai/import";

jest.mock("@/database", () => ({
  database: { get: jest.fn() },
}));
jest.mock("@/services/transactionBalanceHelpers", () => ({
  createTransactionRecord: jest.fn(),
}));

const PAGES = [
  {
    page: 1,
    text: `Bancolombia
Periodo: 31/12/2023 a 13/03/2024
FECHA | DESCRIPCION | VALOR | SALDO
1/12 | COMPRA EN TIENDA D1 | -17,760.00 | 429,904.70
Página 1 de 3`,
  },
  {
    page: 2,
    text: `Página 2 de 3
10/01/2024 14:30 | COMPRA EN AMAZON.COM | -163,618.00 | 256,288.50
11/01/2024 09:15 | TRANSFERENCIA A NEQUI | -50,000.00 | 206,288.50`,
  },
  {
    page: 3,
    text: `Página 3 de 3
15-FEB-24 | CONSIGNACION | 200,000.00 | 406,288.50
1/03 | TRANSFERENCIA | 100,000.00 | 506,288.50`,
  },
];

jest.mock("../services/ai/pdf", () => ({
  ...jest.requireActual("../services/ai/pdf"),
  extractPdfPages: jest.fn().mockResolvedValue(PAGES),
}));

it("fechas en todas las páginas con el flujo completo", async () => {
  const result = await processStatementPdf("file:///fake.pdf", "user-1");

  const byPage = new Map<number, number>();
  const withoutDate = new Set<number>();
  for (const c of result.candidates) {
    byPage.set(c.page, (byPage.get(c.page) ?? 0) + 1);
    if (c.date === null) withoutDate.add(c.page);
  }

  // eslint-disable-next-line no-console
  console.log(
    "por página:",
    JSON.stringify(Object.fromEntries(byPage)),
    "sin fecha:",
    JSON.stringify([...withoutDate]),
  );

  // Las 3 páginas deben tener movimientos CON fecha.
  expect(byPage.get(1)).toBeGreaterThan(0);
  expect(byPage.get(2)).toBeGreaterThan(0);
  expect(byPage.get(3)).toBeGreaterThan(0);
  expect(withoutDate.size).toBe(0);

  // El periodo se detectó sobre todo el documento (cruce de año).
  expect(result.period).not.toBeNull();
});
