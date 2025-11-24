import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import schema from './schema'
import migrations from './migrations'
import { Account } from './models/mlAccount'
import { Category } from './models/mlCategory'
import { Event } from './models/mlEvent'
import { FinancialGoal } from './models/mlFinancialGoal'
import { Notification } from './models/mlNotification'
import { Transaction } from './models/mlTransaction'
import { User } from './models/mlUser'
// import tus modelos aquí
// import Transaction from './Transaction'

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
})

export const database = new Database({
  adapter,
  modelClasses: [
    Account,
    Category,
    Event,
    FinancialGoal,
    Notification,
    Transaction,
    User
  ]
})
