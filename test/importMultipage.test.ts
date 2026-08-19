// test/importMultipage.test.ts
//
// Verifica el flujo de importación por PÁGINA: cada página del PDF se redacta
// y se parsea con estado limpio, y cada movimiento queda etiquetado con su
// `page`. Antes el texto completo (todas las páginas pegadas) se parseaba de
// una sola vez y se perdían movimientos de páginas 2 y 3.

import { processStatementPdf } from "../services/ai/import";

// `import.ts` importa la base de datos nativa de WatermelonDB, que no corre en
// Jest. Para este flujo (solo parseo en memoria) no se usa, así que se mockea.
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
FECHA | DESCRIPCIÓN | VALOR | SALDO
1/04 | COMPRA EN TIENDA D1 | -17, 760.00 | 429,904.7
2/04 | ABONO INTERESES AHORROS | 1.74 | 429,906.52
Página 1 de 3`,
  },
  {
    page: 2,
    text: `Bancolombia
FECHA | DESCRIPCIÓN | VALOR | SALDO
3/04 | COMPRA EN AMAZON.COM | -163,618.00 | 256,288.5
4/04 | TRANSFERENCIA A NEQUI | -10, 000.00 | 419,906.5
Página 2 de 3`,
  },
  {
    page: 3,
    text: `Bancolombia
FECHA | DESCRIPCIÓN | VALOR | SALDO
5/04 | Transferencia | 1,143,385.00 | 1,314, 268.9
6/04 | COMPRA EN TIENDA D1 | -35, 150.00 | 221, 139.5e
Página 3 de 3`,
  },
];

jest.mock("../services/ai/pdf", () => ({
  ...jest.requireActual("../services/ai/pdf"),
  extractPdfPages: jest.fn().mockResolvedValue(PAGES),
}));

describe("Importación multipágina", () => {
  it("mantiene los movimientos de las 3 páginas y los etiqueta con su página", async () => {
    const result = await processStatementPdf("file:///fake.pdf", "user-1");

    expect(result.candidates.length).toBe(6);

    const byPage = new Map<number, number>();
    for (const c of result.candidates) {
      byPage.set(c.page, (byPage.get(c.page) ?? 0) + 1);
    }
    expect(byPage.get(1)).toBe(2);
    expect(byPage.get(2)).toBe(2);
    expect(byPage.get(3)).toBe(2);

    // El movimiento de la página 2 queda etiquetado correctamente.
    const amazon = result.candidates.find((c) =>
      /AMAZON/.test(c.description),
    );
    expect(amazon).toMatchObject({ page: 2, amount: -163618 });

    // El abono de la página 1 (ingreso) y la transferencia de la 3.
    expect(
      result.candidates.some(
        (c) => c.page === 1 && c.amount === 1.74 && c.type === "income",
      ),
    ).toBe(true);
    expect(
      result.candidates.some(
        (c) => c.page === 3 && c.amount === 1143385 && c.type === "income",
      ),
    ).toBe(true);

    // El texto redactado se entrega agrupado por página para el modo manual.
    expect(result.pages.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(
      result.pages.every((p) => p.lines.length > 0),
    ).toBe(true);
  });
});
