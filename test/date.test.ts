// test/date.test.ts
//
// startOfMonth/endOfMonth dependen de "ahora" (new Date()), así que congelamos
// el reloj con fake timers para que el test sea DETERMINISTA.

import { endOfMonth, startOfMonth } from "../utils/date";

describe("utils/date", () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  // Reloj por defecto de cada test: 15 jun 2026, 10:30 (hora local).
  beforeEach(() => jest.setSystemTime(new Date(2026, 5, 15, 10, 30, 0)));

  describe("startOfMonth", () => {
    it("devuelve el primer día del mes actual a medianoche", () => {
      // Arrange
      const esperado = new Date(2026, 5, 1, 0, 0, 0, 0).getTime();
      // Act
      const resultado = startOfMonth();
      // Assert
      expect(resultado).toBe(esperado);
    });

    it("con offset 1 devuelve el primer día del mes anterior", () => {
      expect(startOfMonth(1)).toBe(new Date(2026, 4, 1).getTime());
    });

    it("cruza el año hacia atrás (enero -> diciembre del año previo)", () => {
      jest.setSystemTime(new Date(2026, 0, 10)); // ahora: 10 ene 2026
      expect(startOfMonth(1)).toBe(new Date(2025, 11, 1).getTime());
    });
  });

  describe("endOfMonth", () => {
    it("devuelve el último día del mes a 23:59:59.999", () => {
      expect(endOfMonth()).toBe(
        new Date(2026, 5, 30, 23, 59, 59, 999).getTime(),
      );
    });

    it("respeta la longitud del mes (febrero no bisiesto)", () => {
      jest.setSystemTime(new Date(2026, 1, 10)); // 10 feb 2026
      expect(endOfMonth()).toBe(
        new Date(2026, 1, 28, 23, 59, 59, 999).getTime(),
      );
    });

    it("con offset 1 cae en el último día del mes anterior", () => {
      // Desde junio, offset 1 => último día de MAYO (el "día 0" de junio).
      expect(endOfMonth(1)).toBe(
        new Date(2026, 4, 31, 23, 59, 59, 999).getTime(),
      );
    });
  });
});
