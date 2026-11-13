// test/transactionService.test.ts
//
// Unit test del flujo de dinero. Mockeamos repos + runBatch (frontera con la DB)
// pero usamos la lógica REAL de accountService (signos de balance).

import type { Account } from "../database/models/mlAccount";
import type { Transaction } from "../database/models/mlTransaction";
import { runBatch } from "@/database/batch";
import { AccountRepository } from "@/repositories/accounts";
import { TransactionRepository } from "@/repositories/transactions";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type CreateTransactionInput,
} from "../services/transactionService";

jest.mock("@/database/batch", () => ({ runBatch: jest.fn() }));
jest.mock("@/services/categoryService", () => ({ getCategoriesMap: jest.fn() }));
jest.mock("@/repositories/accounts", () => ({
  AccountRepository: { findById: jest.fn(), prepareUpdate: jest.fn() },
}));
jest.mock("@/repositories/transactions", () => ({
  TransactionRepository: {
    findById: jest.fn(),
    prepareCreate: jest.fn(),
    prepareUpdate: jest.fn(),
    prepareDelete: jest.fn(),
  },
}));

const makeAccount = (
  id: string,
  type: string | null,
  creditSubtype: string | null,
  balance: number,
) => ({ id, type, creditSubtype, balance } as unknown as Account);

const makeTransaction = (overrides: Partial<Transaction> = {}) =>
  ({
    id: "tx1",
    type: "expense",
    amount: 100,
    accountId: "acc1",
    destinationAccountId: null,
    transferTarget: null,
    description: "old",
    date: 1000,
    ...overrides,
  } as unknown as Transaction);

const baseInput = (
  overrides: Partial<CreateTransactionInput> = {},
): CreateTransactionInput => ({
  userId: "u1",
  date: 1000,
  amount: 100,
  description: "Compra",
  type: "expense",
  accountId: "acc1",
  destinationAccountId: null,
  categoryId: "cat1",
  transferTarget: null,
  installmentsTotal: null,
  installmentsPaid: null,
  feeType: null,
  ...overrides,
});

const findAccount = jest.mocked(AccountRepository.findById);
const prepareAccountUpdate = jest.mocked(AccountRepository.prepareUpdate);
const findTransaction = jest.mocked(TransactionRepository.findById);
const prepareCreate = jest.mocked(TransactionRepository.prepareCreate);
const prepareTxUpdate = jest.mocked(TransactionRepository.prepareUpdate);
const prepareDelete = jest.mocked(TransactionRepository.prepareDelete);
const runBatchMock = jest.mocked(runBatch);

const txCreateSentinel = { id: "tx-create" } as unknown as Transaction;
const txUpdateSentinel = { id: "tx-update" } as unknown as Transaction;
const txDeleteSentinel = { id: "tx-delete" } as unknown as Transaction;

beforeEach(() => {
  jest.resetAllMocks();
  prepareCreate.mockReturnValue(txCreateSentinel);
  prepareTxUpdate.mockReturnValue(txUpdateSentinel);
  prepareDelete.mockReturnValue(txDeleteSentinel);
  prepareAccountUpdate.mockImplementation(
    (account) => ({ id: `upd-${account.id}` } as unknown as Account),
  );
});

describe("transactionService — createTransaction", () => {
  it("gasto en ahorros: prepara la tx y resta el balance", async () => {
    const account = makeAccount("acc1", "savings", null, 500);
    findAccount.mockResolvedValue(account);

    const result = await createTransaction(baseInput());

    expect(result).toBe(txCreateSentinel);
    expect(findAccount).toHaveBeenCalledWith("acc1");
    expect(prepareCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        amount: 100,
        type: "expense",
        accountId: "acc1",
        goalId: null,
      }),
    );
    expect(prepareAccountUpdate).toHaveBeenCalledTimes(1);
    expect(prepareAccountUpdate).toHaveBeenCalledWith(account, { balance: 400 });
    expect(runBatchMock).toHaveBeenCalledWith(txCreateSentinel, {
      id: "upd-acc1",
    });
  });

  it("transferencia propia: resta origen y suma destino", async () => {
    const source = makeAccount("acc1", "savings", null, 500);
    const dest = makeAccount("acc2", "savings", null, 200);
    findAccount.mockResolvedValueOnce(source).mockResolvedValueOnce(dest);

    await createTransaction(
      baseInput({
        type: "transfer",
        transferTarget: "own",
        accountId: "acc1",
        destinationAccountId: "acc2",
        amount: 100,
      }),
    );

    expect(prepareAccountUpdate).toHaveBeenCalledTimes(2);
    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(1, source, {
      balance: 400,
    });
    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(2, dest, {
      balance: 300,
    });
    expect(runBatchMock).toHaveBeenCalledWith(
      txCreateSentinel,
      { id: "upd-acc1" },
      { id: "upd-acc2" },
    );
  });

  it("transferencia a tercero: ignora destinationAccountId y no toca destino", async () => {
    const source = makeAccount("acc1", "savings", null, 500);
    findAccount.mockResolvedValue(source);

    await createTransaction(
      baseInput({
        type: "transfer",
        transferTarget: "person",
        accountId: "acc1",
        destinationAccountId: "acc2", // basura: debe ignorarse
        amount: 100,
      }),
    );

    expect(findAccount).toHaveBeenCalledTimes(1); // no busca destino
    expect(prepareAccountUpdate).toHaveBeenCalledTimes(1);
    expect(prepareAccountUpdate).toHaveBeenCalledWith(source, { balance: 400 });
    expect(prepareCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        transferTarget: "person",
        destinationAccountId: null, // se normaliza al guardar
      }),
    );
    expect(runBatchMock).toHaveBeenCalledWith(txCreateSentinel, {
      id: "upd-acc1",
    });
  });

  it("gasto en tarjeta de crédito: la deuda AUMENTA", async () => {
    const card = makeAccount("card", "credit", "credit_card", 0);
    findAccount.mockResolvedValue(card);

    await createTransaction(baseInput({ accountId: "card", amount: 100 }));

    expect(prepareAccountUpdate).toHaveBeenCalledWith(card, { balance: 100 });
  });

  it("pago de tarjeta: origen baja y la deuda de la tarjeta baja", async () => {
    const source = makeAccount("acc1", "savings", null, 500);
    const card = makeAccount("card", "credit", "credit_card", 100); // deuda 100
    findAccount.mockResolvedValueOnce(source).mockResolvedValueOnce(card);

    await createTransaction(
      baseInput({
        type: "transfer",
        transferTarget: "own",
        accountId: "acc1",
        destinationAccountId: "card",
        amount: 100,
      }),
    );

    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(1, source, {
      balance: 400,
    });
    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(2, card, {
      balance: 0,
    });
  });
});

describe("transactionService — updateTransaction", () => {
  const nextValues = {
    type: "expense" as const,
    amount: 150,
    description: "nueva",
    date: 2000,
    accountId: "acc1",
    destinationAccountId: null,
    categoryId: "cat1",
    transferTarget: null,
    installmentsTotal: null,
    installmentsPaid: null,
    feeType: null,
  };

  it("misma cuenta: mergea revert+apply y prepara UNA sola actualización", async () => {
    const account = makeAccount("acc1", "savings", null, 400);
    const original = makeTransaction();
    findTransaction.mockResolvedValue(original);
    findAccount.mockResolvedValue(account);

    await updateTransaction({ transactionId: "tx1", nextValues });

    // revert +100, apply -150 => neto -50 => 400 - 50 = 350
    expect(prepareAccountUpdate).toHaveBeenCalledTimes(1);
    expect(prepareAccountUpdate).toHaveBeenCalledWith(account, { balance: 350 });
    expect(prepareTxUpdate).toHaveBeenCalledWith(
      original,
      expect.objectContaining({ amount: 150, description: "nueva", date: 2000 }),
    );
    expect(runBatchMock).toHaveBeenCalledWith(txUpdateSentinel, {
      id: "upd-acc1",
    });
  });

  it("cambio de cuenta: revierte en la vieja y aplica en la nueva", async () => {
    const oldAccount = makeAccount("acc1", "savings", null, 400);
    const newAccount = makeAccount("acc2", "savings", null, 200);
    findTransaction.mockResolvedValue(makeTransaction());
    findAccount
      .mockResolvedValueOnce(oldAccount)
      .mockResolvedValueOnce(newAccount);

    await updateTransaction({
      transactionId: "tx1",
      nextValues: { ...nextValues, accountId: "acc2", amount: 100 },
    });

    expect(prepareAccountUpdate).toHaveBeenCalledTimes(2);
    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(1, oldAccount, {
      balance: 500,
    });
    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(2, newAccount, {
      balance: 100,
    });
  });

  it("update de transferencia: revierte y aplica en origen y destino", async () => {
    const source = makeAccount("acc1", "savings", null, 400);
    const dest = makeAccount("acc2", "savings", null, 300);
    const original = makeTransaction({
      type: "transfer",
      amount: 100,
      accountId: "acc1",
      destinationAccountId: "acc2",
      transferTarget: "own",
    });
    findTransaction.mockResolvedValue(original);
    findAccount
      .mockResolvedValueOnce(source) // prev origen
      .mockResolvedValueOnce(dest) // prev destino
      .mockResolvedValueOnce(source) // next origen
      .mockResolvedValueOnce(dest); // next destino

    await updateTransaction({
      transactionId: "tx1",
      nextValues: {
        type: "transfer",
        amount: 150,
        description: "nueva",
        date: 2000,
        accountId: "acc1",
        destinationAccountId: "acc2",
        categoryId: null,
        transferTarget: "own",
        installmentsTotal: null,
        installmentsPaid: null,
        feeType: null,
      },
    });

    // revert(+100/-100) + apply(-150/+150) => neto (-50/+50)
    expect(prepareAccountUpdate).toHaveBeenCalledTimes(2);
    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(1, source, {
      balance: 350,
    });
    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(2, dest, {
      balance: 350,
    });
  });
});

describe("transactionService — deleteTransaction", () => {
  it("revierte el balance y borra la transacción", async () => {
    const account = makeAccount("acc1", "savings", null, 400);
    const original = makeTransaction();
    findTransaction.mockResolvedValue(original);
    findAccount.mockResolvedValue(account);

    await deleteTransaction("tx1");

    expect(prepareDelete).toHaveBeenCalledWith(original);
    expect(prepareAccountUpdate).toHaveBeenCalledWith(account, { balance: 500 });
    expect(runBatchMock).toHaveBeenCalledWith(txDeleteSentinel, {
      id: "upd-acc1",
    });
  });

  it("delete de transferencia: revierte origen y destino", async () => {
    const source = makeAccount("acc1", "savings", null, 400);
    const dest = makeAccount("acc2", "savings", null, 300);
    const original = makeTransaction({
      type: "transfer",
      amount: 100,
      accountId: "acc1",
      destinationAccountId: "acc2",
      transferTarget: "own",
    });
    findTransaction.mockResolvedValue(original);
    findAccount.mockResolvedValueOnce(source).mockResolvedValueOnce(dest);

    await deleteTransaction("tx1");

    expect(prepareAccountUpdate).toHaveBeenCalledTimes(2);
    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(1, source, {
      balance: 500,
    });
    expect(prepareAccountUpdate).toHaveBeenNthCalledWith(2, dest, {
      balance: 200,
    });
    expect(runBatchMock).toHaveBeenCalledWith(
      txDeleteSentinel,
      { id: "upd-acc1" },
      { id: "upd-acc2" },
    );
  });
});

describe("transactionService — errores", () => {
  it("update/delete rechazan si la transacción no existe y NO escriben", async () => {
    findTransaction.mockRejectedValue(new Error("not found"));

    await expect(
      updateTransaction({
        transactionId: "missing",
        nextValues: {
          type: "expense",
          amount: 100,
          description: "x",
          date: 1000,
          accountId: "acc1",
          destinationAccountId: null,
          categoryId: null,
          transferTarget: null,
          installmentsTotal: null,
          installmentsPaid: null,
          feeType: null,
        },
      }),
    ).rejects.toThrow("not found");

    await expect(deleteTransaction("missing")).rejects.toThrow("not found");

    expect(runBatchMock).not.toHaveBeenCalled();
  });

  it("create rechaza si la cuenta no existe y NO escribe", async () => {
    findAccount.mockRejectedValue(new Error("account not found"));

    await expect(createTransaction(baseInput())).rejects.toThrow(
      "account not found",
    );
    expect(runBatchMock).not.toHaveBeenCalled();
  });
});
