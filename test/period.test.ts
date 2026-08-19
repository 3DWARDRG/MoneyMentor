// test/period.test.ts
//
// Verifica la detección del PERIODO (rango de fechas) del extracto y que las
// fechas sin año se resuelvan con el AÑO LÓGICO correcto dentro del rango,
// incluso cuando el extracto cruza de año (p.ej. "31/12/2023 a 13/03/2024").

import { detectStatementPeriod, parseStatement } from "../services/ai/statementParser";

describe("Periodo del extracto (rango de fechas)", () => {
  it("detecta el rango que cruza de año: 31/12/2023 a 13/03/2024", () => {
    const period = detectStatementPeriod("Movimientos del 31/12/2023 a 13/03/2024");
    expect(period).not.toBeNull();
    expect(period!.from).toBe(new Date(2023, 11, 31).getTime());
    expect(period!.to).toBe(new Date(2024, 2, 13).getTime());
  });

  it("detecta el rango DESDE/HASTA de Bancolombia", () => {
    const period = detectStatementPeriod("DESDE: 2024/03/31 | HASTA: 2024/06/30");
    expect(period).not.toBeNull();
    expect(period!.from).toBe(new Date(2024, 2, 31).getTime());
    expect(period!.to).toBe(new Date(2024, 5, 30).getTime());
  });

  it("detecta el rango de periodo facturado con fin sin año (Nu)", () => {
    const period = detectStatementPeriod("Periodo facturado 28 JUN 2026 - 28 JUL");
    expect(period).not.toBeNull();
    expect(period!.from).toBe(new Date(2026, 5, 28).getTime());
    expect(period!.to).toBe(new Date(2026, 6, 28).getTime());
  });

  it("detecta el rango del período de Nequi", () => {
    const period = detectStatementPeriod(
      "Estado de depósito de bajo monto para el período de: 2026/01/01 a 2026/01/31",
    );
    expect(period).not.toBeNull();
    expect(period!.from).toBe(new Date(2026, 0, 1).getTime());
    expect(period!.to).toBe(new Date(2026, 0, 31).getTime());
  });

  it("resuelve el año lógico de fechas sin año en un cruce de año", () => {
    const text = `DESDE: 2023/12/01 | HASTA: 2024/03/31
31/12 | COMPRA EN D1 | -50,000.00 | 100,000.00
13/03 | CONSIGNACION | 200,000.00 | 300,000.00`;
    const result = parseStatement(text);

    const dec = result.candidates.find((c) => c.amount === -50000);
    const mar = result.candidates.find((c) => c.amount === 200000);

    // El 31/12 pertenece al año de INICIO (2023) y el 13/03 al de FIN (2024).
    expect(dec).toBeTruthy();
    expect(mar).toBeTruthy();
    expect(new Date(dec!.date!).getFullYear()).toBe(2023);
    expect(new Date(mar!.date!).getFullYear()).toBe(2024);
  });

  it("informa movimientos fuera del periodo detectado", () => {
    const text = `DESDE: 2024/01/01 | HASTA: 2024/01/31
15/01 | COMPRA | -10,000.00
01/04 | COMPRA | -5,000.00`;
    const period = detectStatementPeriod(text);
    const result = parseStatement(text, { period });
    const outside = result.candidates.filter(
      (c) => c.date !== null && (c.date < period!.from || c.date > period!.to),
    );
    // "01/04" no cabe en enero: se resuelve al año más cercano (2024), que
    // queda FUERA del periodo, así el usuario lo ve y lo corrige.
    expect(outside.some((c) => c.amount === -5000)).toBe(true);
  });

  it("reconoce la fecha aunque la celda traiga hora (páginas de continuación)", () => {
    const text = `Periodo: 31/12/2023 a 13/03/2024
10/01/2024 14:30 | COMPRA EN AMAZON.COM | -163,618.00 | 256,288.50
11/01/2024 09:15 | TRANSFERENCIA A NEQUI | -50,000.00 | 206,288.50`;
    const result = parseStatement(text);

    const amazon = result.candidates.find((c) => c.amount === -163618);
    const nequi = result.candidates.find((c) => c.amount === -50000);

    expect(amazon).toBeTruthy();
    expect(nequi).toBeTruthy();
    // La fecha se extrae aunque la celda tenga hora, y NO se pega en la
    // descripción.
    expect(new Date(amazon!.date!).getFullYear()).toBe(2024);
    expect(amazon!.description).toBe("COMPRA EN AMAZON.COM");
    expect(new Date(nequi!.date!).getFullYear()).toBe(2024);
  });

  it("reconoce el mes abreviado con guion (10-ENE-2024)", () => {
    const text = `Periodo: 31/12/2023 a 13/03/2024
10-ENE-2024 | COMPRA EN AMAZON.COM | -163,618.00 | 256,288.50
15-FEB-24 | TRANSFERENCIA A NEQUI | -50,000.00 | 206,288.50`;
    const result = parseStatement(text);

    const amazon = result.candidates.find((c) => c.amount === -163618);
    const nequi = result.candidates.find((c) => c.amount === -50000);

    expect(amazon).toBeTruthy();
    expect(nequi).toBeTruthy();
    expect(new Date(amazon!.date!).getFullYear()).toBe(2024);
    // "15-FEB-24" usa el año de dos dígitos (2024).
    expect(new Date(nequi!.date!).getFullYear()).toBe(2024);
    expect(amazon!.description).toBe("COMPRA EN AMAZON.COM");
  });

  it("reconoce la fecha con puntos y la incrustada en la fila", () => {
    const text = `Periodo: 31/12/2023 a 13/03/2024
1.04.2024 | COMPRA EN AMAZON.COM | -163,618.00 | 256,288.50
PAGO RECIBIDO 10.02.2024 200,000.00 456,288.50`;
    const result = parseStatement(text);

    const amazon = result.candidates.find((c) => c.amount === -163618);
    const pago = result.candidates.find((c) => c.amount === 200000);

    expect(amazon).toBeTruthy();
    expect(pago).toBeTruthy();
    expect(new Date(amazon!.date!).getFullYear()).toBe(2024);
    expect(new Date(pago!.date!).getFullYear()).toBe(2024);
  });
});
