// test/importBancolombia.test.ts
//
// Regresión con el texto REAL de un extracto de Bancolombia (aportado por el
// usuario). Verifica que las páginas 2 y 3 de un extracto de 3 páginas
// conserven la FECHA, resolviendo el año con el periodo del documento
// ("DESDE: 2024/03/31 | HASTA: | 2024/06/30").

import { processStatementPdf } from "../services/ai/import";

jest.mock("@/database", () => ({
  database: { get: jest.fn() },
}));
jest.mock("@/services/transactionService", () => ({
  createTransaction: jest.fn(),
}));

const PAGE1 = `Bancolombia
ESTADO DE CUENTA
DESDE: 2024/03/31 | HASTA: | 2024/06/30
CUENTA DE AHORROS
FECHA | DESCRIPCIÓN | SUCURSAL | DCTO. | VALOR | SALDO
22/04 | ABONO INTERESES AHORROS | 6.65 | 976,919.4:
23/04 | COMPRA EN TIENDA D1 | -49,220.00 | 927,700.70
24/04 | TRANSF A OTROS BANCOS | -135,000.00 | 792,700.7
PÁGINA: | 1`;

const PAGE2 = `FECHA | DESCRIPCIÓN | SUCURSAL | DCTO. | VALOR | SALDO
26/04 | ABONO INTERESES AHORROS | 3.06 | 749,465.7E
27/04 | COMPRA EN TIENDA D1 | -27,030.00 | 722, 436.7.
1/05 | TRANSF A QTROS BANCOS | -400,000.00 | 996,339.95
5/05 | TRANSFERENCIA A ████ | -26, 000.00 | 310, 387.08
PÁGINA: | 2`;

const PAGE3 = `FECHA | DESCRIPCIÓN | SUCURSAL | DCTO. | VALOR | SALDO
9/05 | COMPRA EN TIENDA DI | -16,990.00 | l83,518.2:
15/05 | Transferencia | 2,229, 278.00 | 2, 408,540.4:
28/05 | TRANSF A OTROS BANCOS | -135,000.00 | 2,051,582.39
PÁGINA: | 3`;

jest.mock("../services/ai/pdf", () => {
  const actual = jest.requireActual("../services/ai/pdf");
  return {
    ...actual,
    extractPdfPages: jest.fn(() =>
      Promise.resolve([
        { page: 1, text: PAGE1 },
        { page: 2, text: PAGE2 },
        { page: 3, text: PAGE3 },
      ]),
    ),
  };
});

describe("Bancolombia multipágina (texto real)", () => {
  it("asigna fecha a los movimientos de las 3 páginas usando el periodo", async () => {
    const result = await processStatementPdf("file:///fake.pdf", "user-1");

    expect(result.period).not.toBeNull();
    expect(result.period!.from).toBe(new Date(2024, 2, 31).getTime());
    expect(result.period!.to).toBe(new Date(2024, 5, 30).getTime());

    const byPage = new Map<number, { total: number; noDate: number }>();
    for (const c of result.candidates) {
      const e = byPage.get(c.page) ?? { total: 0, noDate: 0 };
      e.total += 1;
      if (c.date === null) e.noDate += 1;
      byPage.set(c.page, e);
    }

    // Las 3 páginas tienen movimientos y NINGUNO sin fecha.
    for (const page of [1, 2, 3]) {
      const e = byPage.get(page);
      expect(e?.total).toBeGreaterThan(0);
      expect(e?.noDate).toBe(0);
    }

    // La fecha del 1/05 se resuelve a 2024 (periodo 2024).
    const mayo = result.candidates.find((c) => c.amount === -400000);
    expect(mayo).toBeTruthy();
    expect(new Date(mayo!.date!).getFullYear()).toBe(2024);
  });
});
