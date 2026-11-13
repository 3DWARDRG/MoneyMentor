// __tests__/services/ai/parser.test.ts
import { parseStatement } from "../services/ai/statementParser";

describe("Money Mentor - Parser Local Offline (RegEx)", () => {
  describe("Formato: BBVA Colombia (Extracto Tabular)", () => {
    it("debe extraer correctamente una fila de gasto (Cargo)", () => {
      // MOCK: Texto con la palabra clave BBVA para activar el formato genérico/BBVA
      const text = `
        BBVA
        FECHA | CONCEPTO | CARGOS | ABONOS | SALDO
        02-06-2026 | COMPRA EN TOTTO ZIPAQUIRA L | 319,900.00 | | 606,764.50
      `;

      const result = parseStatement(text);

      // Verificamos que encontró al menos un candidato
      expect(result.candidates.length).toBeGreaterThan(0);

      // Verificamos la estructura de tu ParsedTransaction
      expect(result.candidates[0]).toMatchObject({
        type: "expense",
        amount: -319900,
        description: "COMPRA EN TOTTO ZIPAQUIRA L",
        date: expect.any(Number), // Tu código devuelve timestamp
      });
    });
  });

  describe("Formato: Nu Colombia (Tarjeta de Crédito)", () => {
    it("debe extraer un cargo e ignorar el bloque de resumen", () => {
      const text = `
        nu
        fecha | descripción | valor | cuotas
        10 Ago 2026 | Uber *Trip | $ 18.500,00 | 1 de 1
        Total a pagar
        $ 18.500,00
      `;

      const result = parseStatement(text);

      expect(result.candidates.length).toBe(1); // No debe leer "Total a pagar" como gasto
      expect(result.candidates[0]).toMatchObject({
        type: "expense",
        amount: -18500,
        description: "Uber *Trip",
      });
    });
  });

  describe("Formato: Nequi (App Pantallazo)", () => {
    it("debe parsear un bloque de Nequi ignorando el ruido de UI", () => {
      const text = `
        Inicio | Movimientos | Servicios
        Hoy
        -$ 50.000,00
        Pedro Perez Almuerzo
      `;

      const result = parseStatement(text);

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0]).toMatchObject({
        type: "expense",
        amount: -50000,
        description: "Pedro Perez Almuerzo",
      });
    });
  });

  describe("Formato: Nequi (PDF oficial)", () => {
    it("debe parsear filas con separador | (OCR con coordenadas)", () => {
      const text = `
        Nequi
        Movimientos
        Fecha del movimiento | Descripción | Valor | Saldo
        29/01/2026 | RETIRO EN CAJERO | $-10,000.00 | $2,942.87
        29/01/2026 | RECIBI POR BRE-B DE: EDWARD | $5,000.00 | $12,942.87
        29/01/2026 | Para GERMAN AUGUSTO | $-30,000.00 | $7,942.87
      `;

      const result = parseStatement(text);

      expect(result.candidates.length).toBe(3);
      expect(result.candidates[0]).toMatchObject({
        type: "expense",
        amount: -10000,
        description: "RETIRO EN CAJERO",
        date: expect.any(Number),
      });
      expect(result.candidates[1]).toMatchObject({
        type: "income",
        amount: 5000,
        description: "RECIBI POR BRE-B DE: EDWARD",
      });
      expect(result.candidates[2]).toMatchObject({
        type: "expense",
        amount: -30000,
        description: "Para GERMAN AUGUSTO",
      });
    });

    it("debe parsear bloques de 4 líneas (OCR sin coordenadas)", () => {
      const text = `
        Nequi
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
      `;

      const result = parseStatement(text);

      expect(result.candidates.length).toBe(2);
      expect(result.candidates[0]).toMatchObject({
        type: "expense",
        amount: -10000,
        description: "RETIRO EN CAJERO",
      });
      expect(result.candidates[1]).toMatchObject({
        type: "income",
        amount: 5000,
        description: "RECIBI POR BRE-B DE: EDWARD",
      });
    });
  });

  describe("Formato: Bancolombia (cuenta de ahorros)", () => {
    it("debe parsear movimientos con fecha dd/mm y montos con espacios del OCR", () => {
      const text = `
        Bancolombia
        ESTADO DE CUENTA
        DESDE: 2024/03/31 | HASTA: 2024/06/30
        CUENTA DE AHORROS
        RESUMEN
        SALDO ANTERIOR | $ | 1,219,524.76 | SALDO PROMEDIO | 1, 025, 124
        TOTAL ABONOs | $ | 4,074, 096.25 | CUENTAs X COBRAR | 00
        TOTAL CARGOS | 4,612,349.00 | VALOR INTERESES PAGADOs | 127.33
        SALDO ACTUAL | $ | 681,272.01 | RETEFUENTE | .00
        FECHA | DESCRIPCIÓN | SUCURSAL | DCTO. | VALOR | SALDO
        1/04 | ABONO INTERESES AHORROS | 77 | 1,219, 525.52
        1/04 | TRANSF A 0TROs BANCOs | -400,000.00 | 819,525.52
        1/04 | TRANSF A OTROS BANCOS | -250, 000.00 | 569, 525.53
        1/04 | VALOR IVA | -376.00 | 569, 149.52
        1/04 | COMISION TRANSF OTROs BANCOs | -1,980.00 | 567,169.55
        2/04 | COMPRA EN TIENDAS AR | -105,306.00 | 461, 864.1
        3/04 | COMPRA EN BOLD *el ra | -14, 200. 00 | 447,664.7
        4/04 | COMPRA EN TIENDA D1 | -17, 760.00 | 429,904.7
        6/04 | ABONO INTERESES AHORROS | 1.74 | 429,906.52
        7/04 | TRANSFERENCIA A NEQUI | -10, 000.00 | 419,906.5
        7/04 | COMPRA EN AMAZON.COM | -163,618.00 | 256,288.5
        10/04 | COMPRA EN TIENDA D1 | -35, 150.00 | 221, 139.5e
        15/04 | Transferencia | 1,143,385.00 | 1,314, 268.9
      `;

      const result = parseStatement(text);

      // Los resúmenes no deben generar candidatos.
      expect(result.candidates.filter((c) => c.description.includes("SALDO"))).toHaveLength(0);

      // El ABONO INTERESES sin valor legible (solo saldo 1,219,525.52) NO debe
      // crear un movimiento gigante falso.
      expect(result.candidates.some((c) => c.amount === 1219525.52)).toBe(false);

      // El ABONO INTERESES con valor legible (1.74) sí es un ingreso.
      const abono = result.candidates.find(
        (c) => /ABONO INTERESES/.test(c.description) && c.amount === 1.74,
      );
      expect(abono).toMatchObject({ type: "income", amount: 1.74 });

      const expenses = result.candidates.filter((c) => c.type === "expense");
      expect(expenses.length).toBeGreaterThan(5);

      // La primera fila de movimientos es un cargo de 400.000 del 1/04/2024.
      expect(expenses[0]).toMatchObject({
        type: "expense",
        amount: -400000,
        description: expect.stringMatching(/TRANSF A 0TROs BANCOs/),
      });
      expect(expenses[0].date).toBe(new Date(2024, 3, 1).getTime());

      // Un abono (transferencia recibida) es ingreso.
      const income = result.candidates.find((c) => c.amount === 1143385);
      expect(income).toMatchObject({ type: "income", amount: 1143385 });

      // Las fechas usan el año del extracto (2024), no el año actual.
      for (const c of result.candidates) {
        if (c.date === null) continue;
        expect(new Date(c.date).getFullYear()).toBe(2024);
      }
    });

    it("debe recuperar valores que el OCR deja con artefactos o partidos", () => {
      const text = `
        Bancolombia
        ESTADO DE CUENTA
        DESDE: 2024/03/31 | HASTA: 2024/06/30
        CUENTA DE AHORROS
        FECHA | DESCRIPCION | SUCURSAL | DCTO. | VALOR | SALDO
        1/04 | ABONO INTERESES AHORROS | .77 | 1,219,525.5:
        1/04 | TRANSF A OTROs BANCOs | -400,000.00 | 819,525.5.
        1/04 | VALOR IVA | -376.00 | 569, 149.5:
        2/04 | ABONO INTERESES AHORROS | .63 | 567, 170.1
        7/04 | COMPRA EN AMAZON.COM | -l63, 618.00 | 256,288.51
        -26,000. 00
        VGILADO | 14/04 | TRANSEFERENCIA A NEQUI | 170, 883.94
        30/04 | Transferencia | 690,398.00 | 1,396, 336.6
        2/05 | ABONO INTERESES | .88
      `;

      const result = parseStatement(text);

      const find = (amount: number) =>
        result.candidates.find((c) => c.amount === amount);

      // El -400,000 con saldo "819,525.5." (punto sobrante) NO se pierde.
      expect(find(-400000)).toMatchObject({
        type: "expense",
        description: expect.stringMatching(/TRANSF A OTROs BANCOs/),
        date: new Date(2024, 3, 1).getTime(),
      });

      // El interés ".77" (sin cero inicial) es un ingreso de 0.77.
      expect(find(0.77)).toMatchObject({
        type: "income",
        description: "ABONO INTERESES AHORROS",
      });

      // VALOR IVA con saldo "569, 149.5:" (dos puntos) se recupera.
      expect(find(-376)).toMatchObject({ description: "VALOR IVA" });

      // El valor partido en línea suelta ("-26,000. 00") se asigna a su fila.
      expect(find(-26000)).toMatchObject({
        type: "expense",
        description: expect.stringMatching(/TRANSEFERENCIA A NEQUI/),
      });

      // La transferencia recibida es ingreso.
      expect(find(690398)).toMatchObject({ type: "income" });

      // El valor "-l63, 618.00" (el OCR lee "1" como "l") se recupera como
      // monto y NO debe quedar pegado en la descripción.
      expect(find(-163618)).toMatchObject({
        type: "expense",
        description: "COMPRA EN AMAZON.COM",
      });

      // Fila truncada (sin saldo): el único monto es el valor.
      expect(find(0.88)).toMatchObject({ type: "income" });

      // Ningún monto debe quedar con artefactos de punto flotante.
      for (const c of result.candidates) {
        const s = String(c.amount);
        expect(s.includes("1.3999999") || s.includes("0000000000")).toBe(false);
      }
    });

    it("debe parsear filas sin separador | (columnas fusionadas por el OCR)", () => {
      const text = `
        Bancolombia
        ESTADO DE CUENTA
        DESDE: 2024/03/31 | HASTA: 2024/06/30
        CUENTA DE AHORROS
        FECHA | DESCRIPCION | SUCURSAL | DCTO. | VALOR | SALDO
        22/04 | ABONO INTERESES AHORROS | 6.65 | 976,919.4:
        23/04 COMPRA EN TIENDA D1 -49,220.00 927,700.70
        24/04 TRANSF A OTROS BANCOS -135,000.00 792,700.7
        1/05 TRANSF A QTROS BANCOS -400,000.00 996,339.95
      `;

      const result = parseStatement(text);

      expect(result.candidates.some((c) => c.amount === -49220)).toBe(true);
      expect(result.candidates.some((c) => c.amount === -135000)).toBe(true);
      expect(result.candidates.some((c) => c.amount === -400000)).toBe(true);
      expect(result.candidates.some((c) => c.amount === 6.65)).toBe(true);
    });
  });
});
