import {
  schemaMigrations,
  createTable,
} from '@nozbe/watermelondb/Schema/migrations'

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        // USERS
        createTable({
          name: 'users',
          columns: [
            { name: 'names', type: 'string' },
            { name: 'last_name', type: 'string' },
            { name: 'email', type: 'string', isIndexed: true },
            { name: 'confirm_email', type: 'boolean', isOptional: true },
            { name: 'password', type: 'string' },
            { name: 'creation_date', type: 'number' },
            { name: 'last_access', type: 'number' },
          ],
        }),

        // ACCOUNTS
        createTable({
          name: 'accounts',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'icon_image', type: 'string' },
            { name: 'balance', type: 'number', isOptional: true },
          ],
        }),

        // CATEGORIES
        createTable({
          name: 'categories',
          columns: [
             { name: 'user_id', type: 'string', isIndexed: true }, // ← nuevo
            { name: 'account_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'icon_image', type: 'string' },
            { name: 'type', type: 'string' },
          ],
        }),

        // TRANSACTIONS
        createTable({
          name: 'transactions',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'date', type: 'number' },
            { name: 'amount', type: 'number' },
            { name: 'description', type: 'string' },
            { name: 'category_id', type: 'string', isIndexed: true },
            { name: 'type', type: 'string' },
          ],
        }),

        // NOTIFICATIONS
        createTable({
          name: 'notifications',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'type', type: 'string' },
            { name: 'message', type: 'string' },
            { name: 'send_date', type: 'number' },
            { name: 'send_status', type: 'boolean' },
          ],
        }),

        // FINANCIAL GOALS
        createTable({
          name: 'financial_goals',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'amount', type: 'number' },
            { name: 'deadline', type: 'number' },
            { name: 'creation_date', type: 'number' },
            { name: 'progress', type: 'number', isOptional: true },
          ],
        }),

        // EVENTS
        createTable({
          name: 'events',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'start_date', type: 'number' },
            { name: 'end_date', type: 'number' },
            { name: 'creation_date', type: 'number' },
            { name: 'google_event_id', type: 'string' },
            { name: 'category', type: 'string' },
            { name: 'notification', type: 'boolean' },
          ],
        }),
      ],
    },
  ],
})
