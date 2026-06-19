// schema.js
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'names', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'email', type: 'string', isIndexed: true },
        { name: 'confirm_email', type: 'boolean', isOptional: true },
        { name: 'password', type: 'string' },
        { name: 'creation_date', type: 'number' }, // timestamp
        { name: 'last_access', type: 'number' },   // timestamp
      ],
    }),
    tableSchema({
      name: 'accounts',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true }, // referencia a usuario
        { name: 'name', type: 'string' },
        { name: 'icon_image', type: 'string' },
        { name: 'balance', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true }, // ← nuevo
        { name: 'account_id', type: 'string', isIndexed: true }, // referencia a cuenta
        { name: 'name', type: 'string' },
        { name: 'icon_image', type: 'string' },
        { name: 'type', type: 'string' }, // "expense" o "income"
      ],
    }),
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },      // referencia a usuario
        { name: 'date', type: 'number' },                          // timestamp Unix
        { name: 'amount', type: 'number' },
        { name: 'description', type: 'string' },
        { name: 'category_id', type: 'string', isIndexed: true },  // referencia a categoría
        { name: 'type', type: 'string' },                          // "expense" o "income"
      ],
    }),
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true }, // referencia al usuario
        { name: 'type', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'send_date', type: 'number' },  // timestamp Unix
        { name: 'send_status', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'financial_goals',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },  // referencia al usuario
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'deadline', type: 'number' },       // timestamp Unix
        { name: 'creation_date', type: 'number' }, // timestamp Unix
        { name: 'progress', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'events',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true }, // referencia al usuario
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'start_date', type: 'number' },  // Unix timestamp
        { name: 'end_date', type: 'number' },    // Unix timestamp
        { name: 'creation_date', type: 'number' }, // Unix timestamp
        { name: 'google_event_id', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'notification', type: 'boolean' },
      ],
    }),
  ],
})
