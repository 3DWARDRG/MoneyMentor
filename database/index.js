import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { migrations } from "./migrations"; // ✅ con llaves
import { Account } from "./models/mlAccount";
import { Category } from "./models/mlCategory";
import { Event } from "./models/mlEvent";
import { FinancialGoal } from "./models/mlFinancialGoal";
import { Notification } from "./models/mlNotification";
import { Transaction } from "./models/mlTransaction";
import { User } from "./models/mlUser";
import { schema } from "./schema"; // ✅ con llaves
// import tus modelos aquí
// import Transaction from './Transaction'

const adapter = new SQLiteAdapter({
  schema,
    // migrations,   // ← Comenta o elimina esta línea
  jsi: false,
});

export const database = new Database({
  adapter,
  modelClasses: [
    Account,
    Category,
    Event,
    FinancialGoal,
    Notification,
    Transaction,
    User,
  ],
});
