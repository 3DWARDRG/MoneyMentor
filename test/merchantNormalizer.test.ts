// test/merchantNormalizer.test.ts
//
// Unit test de normalización de comercios. Es una función PURA
// (utils/merchantNormalizer.ts), así que no requiere mocks de DB.

import { normalizeMerchant } from "../utils/merchantNormalizer";

describe("merchantNormalizer.normalizeMerchant", () => {
  describe("limpia ruido y devuelve la clave del comercio", () => {
    it.each<[string, string]>([
      ["PAGO DE COMPRA EN D1 SUPERMERCADO", "d1 supermercado"],
      ["Café Juan Valdez", "cafe juan valdez"],
      ["COMPRA EN AMAZON.COM REF 1234 *5255", "amazon com"],
      ["COMPRA TIENDA 4X1000", "tienda"],
      ["NETFLIX INTERNET", "netflix"],
      // ── Bordes ──────────────────────────────────────────────────────────
      // Frontera de longitud: 2 caracteres SÍ son válidos (< 2 => null).
      ["D1", "d1"],
      ["AA", "aa"],
      // Espacios múltiples se colapsan.
      ["D1    SUPERMERCADO", "d1 supermercado"],
      // Stopword en medio y al final.
      ["TIENDA DE BARRIO", "tienda barrio"],
      ["COMPRA EN EXITO DE", "exito"],
      // Números de 2 dígitos se conservan; 3+ se consideran referencias.
      ["TIENDA 24 HORAS", "tienda 24 horas"],
      ["SUPERMERCADO LA 14", "supermercado 14"],
      ["TIENDA 123", "tienda"],
    ])("normaliza %s -> %s", (input, esperado) => {
      expect(normalizeMerchant(input)).toBe(esperado);
    });
  });

  describe("descarta descripciones inútiles", () => {
    it.each<string>(["MOVIMIENTO", "EFECTIVO", "PAGO", "A", "   ", ""])(
      "devuelve null para %p",
      (input) => {
        expect(normalizeMerchant(input)).toBeNull();
      }
    );
  });
});
