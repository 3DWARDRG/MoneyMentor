// test/accountService.test.ts
//
// Unit test de la capa service: lógica PURA de balances (sin DB).
// Mockeamos el repositorio para que no se cargue la DB nativa (SQLite).

import type { Account } from "../database/models/mlAccount";
import {
  getExpenseOrIncomeDelta,
  getTransferDestinationDelta,
  isCreditCardAccount,
} from "../services/accountService";

jest.mock("@/repositories/accounts", () => ({
  AccountRepository: {},
}));

// Las funciones solo leen `type` y `creditSubtype`, así que "fingimos"
// un Account con un objeto parcial.
const makeAccount = (type: string | null, creditSubtype: string | null) =>
  ({ type, creditSubtype } as unknown as Account);

const ahorros = makeAccount("savings", null);
const tarjeta = makeAccount("credit", "credit_card");
const hipotecario = makeAccount("credit", "mortgage");

describe("accountService (lógica de balances)", () => {
  describe("isCreditCardAccount", () => {
    it("true para crédito con subtipo credit_card", () => {
      expect(isCreditCardAccount(tarjeta)).toBe(true);
    });

    it("false para crédito con otro subtipo (hipotecario)", () => {
      expect(isCreditCardAccount(hipotecario)).toBe(false);
    });

    it("false para una cuenta de ahorros", () => {
      expect(isCreditCardAccount(ahorros)).toBe(false);
    });

    it("false para null/undefined", () => {
      expect(isCreditCardAccount(null)).toBe(false);
      expect(isCreditCardAccount(undefined)).toBe(false);
    });
  });

  describe("getExpenseOrIncomeDelta", () => {
    it("ahorros + income suma al balance", () => {
      expect(
        getExpenseOrIncomeDelta({
          account: ahorros,
          txType: "income",
          amount: 100,
        }),
      ).toBe(100);
    });

    it("ahorros + expense resta al balance", () => {
      expect(
        getExpenseOrIncomeDelta({
          account: ahorros,
          txType: "expense",
          amount: 100,
        }),
      ).toBe(-100);
    });

    it("tarjeta de crédito + expense AUMENTA la deuda (delta positivo)", () => {
      expect(
        getExpenseOrIncomeDelta({
          account: tarjeta,
          txType: "expense",
          amount: 100,
        }),
      ).toBe(100);
    });

    it("tarjeta de crédito + income REDUCE la deuda (delta negativo)", () => {
      expect(
        getExpenseOrIncomeDelta({
          account: tarjeta,
          txType: "income",
          amount: 100,
        }),
      ).toBe(-100);
    });
  });

  describe("getTransferDestinationDelta", () => {
    it("cuenta normal recibe el monto (delta positivo)", () => {
      expect(
        getTransferDestinationDelta({
          destinationAccount: ahorros,
          amount: 250,
        }),
      ).toBe(250);
    });

    it("tarjeta de crédito recibe un pago (delta negativo: reduce deuda)", () => {
      expect(
        getTransferDestinationDelta({
          destinationAccount: tarjeta,
          amount: 250,
        }),
      ).toBe(-250);
    });
  });
});
