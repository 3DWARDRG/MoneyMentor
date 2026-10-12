import { Account } from "@/database/models/mlAccount";
import { AccountRepository } from "@/repositories/accounts";

export interface AccountSummaryData {
  totalBalance: number;
  activeAccounts: number;
  creditAccounts: number;
  totalAccounts: number;
}

/** Resumen agregado de las cuentas del usuario. */
export async function getAccountSummary(
  userId: string
): Promise<AccountSummaryData> {
  const accounts = await AccountRepository.buildByUserIdQuery(userId).fetch();

  let totalBalance = 0;
  let activeAccounts = 0;
  let creditAccounts = 0;

  for (const account of accounts) {
    if (account.isActive !== false) activeAccounts += 1;
    if (account.type === "credit") creditAccounts += 1;
    totalBalance += account.balance ?? 0;
  }

  return {
    totalBalance,
    activeAccounts,
    creditAccounts,
    totalAccounts: accounts.length,
  };
}

/** Lista de cuentas del usuario (lectura one-shot para código no-React). */
export async function getAccounts(userId: string): Promise<Account[]> {
  return await AccountRepository.buildByUserIdQuery(userId).fetch();
}

/** ¿Es una tarjeta de crédito? (el signo del balance se invierte) */
export function isCreditCardAccount(account?: Account | null): boolean {
  return (
    !!account &&
    account.type === "credit" &&
    account.creditSubtype === "credit_card"
  );
}

/** Delta de balance que produce un ingreso/gasto en una cuenta. */
export function getExpenseOrIncomeDelta({
  account,
  txType,
  amount,
}: {
  account: Account;
  txType: "income" | "expense";
  amount: number;
}): number {
  if (isCreditCardAccount(account)) {
    return txType === "expense" ? amount : -amount;
  }

  return txType === "income" ? amount : -amount;
}

/** Delta de balance que produce recibir una transferencia en la cuenta destino. */
export function getTransferDestinationDelta({
  destinationAccount,
  amount,
}: {
  destinationAccount: Account;
  amount: number;
}): number {
  if (isCreditCardAccount(destinationAccount)) {
    return -amount;
  }

  return amount;
}
