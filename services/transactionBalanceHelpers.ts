// Shim temporal: delega al nuevo transactionService.
// Se elimina cuando los consumidores migren a `@/services/transactionService`.
export {
  createTransaction as createTransactionRecord,
  updateTransaction as updateTransactionRecord,
  deleteTransaction as deleteTransactionRecord,
} from "@/services/transactionService";
