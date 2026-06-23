import { database } from "@/database";
import { Account } from "@/database/models/mlAccount";
import { Transaction } from "@/database/models/mlTransaction";

type TxType = "income" | "expense" | "transfer";

type FeeType =
  | "maintenance"
  | "annual_fee"
  | "late_fee"
  | "cash_advance_fee"
  | "atm_fee"
  | "other_fee"
  | null;

type TransactionLike = {
  id?: string;
  type: TxType;
  amount: number;
  accountId: string | null;
  destinationAccountId: string | null;
  categoryId?: string | null;
  transferTarget?: "own" | "person" | "bank" | null;
  feeType?: FeeType;
};

export const isCreditCardAccount = (account?: Account | null) =>
  !!account &&
  account.type === "credit" &&
  account.creditSubtype === "credit_card";

export const getExpenseOrIncomeDelta = ({
  account,
  txType,
  amount,
}: {
  account: Account;
  txType: "income" | "expense";
  amount: number;
}) => {
  if (isCreditCardAccount(account)) {
    return txType === "expense" ? amount : -amount;
  }

  return txType === "income" ? amount : -amount;
};

export const getTransferDestinationDelta = ({
  destinationAccount,
  amount,
}: {
  destinationAccount: Account;
  amount: number;
}) => {
  if (isCreditCardAccount(destinationAccount)) {
    return -amount;
  }

  return amount;
};

export const applyTransactionEffect = async ({
  transaction,
  sourceAccount,
  destinationAccount,
}: {
  transaction: TransactionLike;
  sourceAccount: Account | null;
  destinationAccount: Account | null;
}) => {
  if (transaction.type === "transfer") {
    if (!sourceAccount) throw new Error("Cuenta origen requerida");
    if (transaction.transferTarget === "own" && !destinationAccount) {
      throw new Error("Cuenta destino requerida");
    }

    await sourceAccount.update((record) => {
      record.balance = Number(record.balance ?? 0) - transaction.amount;
    });

    if (transaction.transferTarget === "own" && destinationAccount) {
      const destinationDelta = getTransferDestinationDelta({
        destinationAccount,
        amount: transaction.amount,
      });

      await destinationAccount.update((record) => {
        record.balance = Number(record.balance ?? 0) + destinationDelta;
      });
    }

    return;
  }

  if (!sourceAccount) throw new Error("Cuenta requerida");

  const nonTransferType = transaction.type as "income" | "expense";

  const delta = getExpenseOrIncomeDelta({
    account: sourceAccount,
    txType: nonTransferType,
    amount: transaction.amount,
  });

  await sourceAccount.update((record) => {
    record.balance = Number(record.balance ?? 0) + delta;
  });
};

export const revertTransactionEffect = async ({
  transaction,
  sourceAccount,
  destinationAccount,
}: {
  transaction: TransactionLike;
  sourceAccount: Account | null;
  destinationAccount: Account | null;
}) => {
  if (transaction.type === "transfer") {
    if (!sourceAccount) throw new Error("Cuenta origen requerida");
    if (transaction.transferTarget === "own" && !destinationAccount) {
      throw new Error("Cuenta destino requerida");
    }

    await sourceAccount.update((record) => {
      record.balance = Number(record.balance ?? 0) + transaction.amount;
    });

    if (transaction.transferTarget === "own" && destinationAccount) {
      const destinationDelta = getTransferDestinationDelta({
        destinationAccount,
        amount: transaction.amount,
      });

      await destinationAccount.update((record) => {
        record.balance = Number(record.balance ?? 0) - destinationDelta;
      });
    }

    return;
  }

  if (!sourceAccount) throw new Error("Cuenta requerida");

  const nonTransferType = transaction.type as "income" | "expense";

  const delta = getExpenseOrIncomeDelta({
    account: sourceAccount,
    txType: nonTransferType,
    amount: transaction.amount,
  });

  await sourceAccount.update((record) => {
    record.balance = Number(record.balance ?? 0) - delta;
  });
};

export const updateTransactionRecord = async ({
  transactionId,
  nextValues,
}: {
  transactionId: string;
  nextValues: {
    type: TxType;
    amount: number;
    description: string;
    date: number;
    accountId: string | null;
    destinationAccountId: string | null;
    categoryId: string | null;
    transferTarget: "own" | "person" | "bank" | null;
    installmentsTotal: number | null;
    installmentsPaid: number | null;
    feeType: FeeType;
  };
}) => {
  await database.write(async () => {
    const txCollection = database.get<Transaction>("transactions");
    const accCollection = database.get<Account>("accounts");

    const transaction = await txCollection.find(transactionId);

    const prevSourceAccount: Account | null = transaction.accountId
      ? await accCollection.find(transaction.accountId)
      : null;

    const prevDestinationAccount: Account | null =
      transaction.type === "transfer" &&
      transaction.transferTarget === "own" &&
      transaction.destinationAccountId
        ? await accCollection.find(transaction.destinationAccountId)
        : null;

    await revertTransactionEffect({
      transaction: {
        type: transaction.type,
        amount: transaction.amount,
        accountId: transaction.accountId,
        destinationAccountId: transaction.destinationAccountId,
        transferTarget: transaction.transferTarget,
        feeType: transaction.feeType,
      },
      sourceAccount: prevSourceAccount,
      destinationAccount: prevDestinationAccount,
    });

    await transaction.update((record) => {
      record.type = nextValues.type;
      record.amount = nextValues.amount;
      record.description = nextValues.description.trim() || "Sin descripción";
      record.date = nextValues.date;
      record.accountId = nextValues.accountId;
      record.destinationAccountId = nextValues.destinationAccountId;
      record.categoryId = nextValues.categoryId;
      record.transferTarget = nextValues.transferTarget;
      record.installmentsTotal = nextValues.installmentsTotal;
      record.installmentsPaid = nextValues.installmentsPaid;
      record.feeType = nextValues.feeType;
    });

    const nextSourceAccount: Account | null = nextValues.accountId
      ? await accCollection.find(nextValues.accountId)
      : null;

    const nextDestinationAccount: Account | null =
      nextValues.type === "transfer" &&
      nextValues.transferTarget === "own" &&
      nextValues.destinationAccountId
        ? await accCollection.find(nextValues.destinationAccountId)
        : null;

    await applyTransactionEffect({
      transaction: {
        type: nextValues.type,
        amount: nextValues.amount,
        accountId: nextValues.accountId,
        destinationAccountId: nextValues.destinationAccountId,
        transferTarget: nextValues.transferTarget,
        feeType: nextValues.feeType,
      },
      sourceAccount: nextSourceAccount,
      destinationAccount: nextDestinationAccount,
    });
  });
};

export const deleteTransactionRecord = async (transactionId: string) => {
  await database.write(async () => {
    const txCollection = database.get<Transaction>("transactions");
    const accCollection = database.get<Account>("accounts");

    const transaction = await txCollection.find(transactionId);

    const sourceAccount: Account | null = transaction.accountId
      ? await accCollection.find(transaction.accountId)
      : null;

    const destinationAccount: Account | null =
      transaction.type === "transfer" &&
      transaction.transferTarget === "own" &&
      transaction.destinationAccountId
        ? await accCollection.find(transaction.destinationAccountId)
        : null;

    await revertTransactionEffect({
      transaction: {
        type: transaction.type,
        amount: transaction.amount,
        accountId: transaction.accountId,
        destinationAccountId: transaction.destinationAccountId,
        transferTarget: transaction.transferTarget,
        feeType: transaction.feeType,
      },
      sourceAccount,
      destinationAccount,
    });

    await transaction.markAsDeleted();
    await transaction.destroyPermanently();
  });
};

export const createTransactionRecord = async ({
  userId,
  date,
  amount,
  description,
  type,
  accountId,
  destinationAccountId,
  categoryId,
  transferTarget,
  installmentsTotal,
  installmentsPaid,
  feeType,
}: {
  userId: string;
  date: number;
  amount: number;
  description: string;
  type: TxType;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  transferTarget: "own" | "person" | "bank" | null;
  installmentsTotal: number | null;
  installmentsPaid: number | null;
  feeType: FeeType;
}) => {
  await database.write(async () => {
    const txCollection = database.get<Transaction>("transactions");
    const accCollection = database.get<Account>("accounts");

    const sourceAccount = await accCollection.find(accountId);

    await txCollection.create((record) => {
      record.userId = userId;
      record.date = date;
      record.amount = amount;
      record.description =
        description ||
        (type === "transfer" ? "Transferencia interna" : "Sin descripción");
      record.type = type;
      record.accountId = accountId;
      record.destinationAccountId = destinationAccountId;
      record.categoryId = categoryId;
      record.transferTarget = transferTarget;
      record.installmentsTotal = installmentsTotal;
      record.installmentsPaid = installmentsPaid;
      record.feeType = feeType;
    });

    if (type === "transfer") {
      if (!destinationAccountId) throw new Error("Cuenta destino requerida");

      const targetAccount = await accCollection.find(destinationAccountId);

      await applyTransactionEffect({
        transaction: {
          type: "transfer",
          amount,
          accountId,
          destinationAccountId,
          transferTarget,
          feeType,
        },
        sourceAccount,
        destinationAccount: targetAccount,
      });
    } else {
      await applyTransactionEffect({
        transaction: {
          type,
          amount,
          accountId,
          destinationAccountId: null,
          transferTarget: null,
          feeType,
        },
        sourceAccount,
        destinationAccount: null,
      });
    }
  });
};
