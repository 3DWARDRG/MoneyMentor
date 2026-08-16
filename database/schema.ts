// schema.js
import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 8,
  tables: [
    tableSchema({
      name: "users",
      columns: [
        { name: "names", type: "string" },
        { name: "last_name", type: "string" },
        { name: "email", type: "string", isIndexed: true },
        { name: "confirm_email", type: "boolean", isOptional: true },
        { name: "password", type: "string" },
        { name: "creation_date", type: "number" },
        { name: "last_access", type: "number" },
      ],
    }),

    tableSchema({
      name: "accounts",
      columns: [
        { name: "user_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "icon_image", type: "string" },
        { name: "balance", type: "number", isOptional: true },
        { name: "type", type: "string", isOptional: true },
        { name: "institution", type: "string", isOptional: true },
        { name: "currency", type: "string", isOptional: true },
        { name: "is_active", type: "boolean", isOptional: true },
        { name: "credit_limit", type: "number", isOptional: true },
        { name: "interest_rate", type: "number", isOptional: true },
        { name: "payment_due_day", type: "number", isOptional: true },
        { name: "statement_closing_day", type: "number", isOptional: true },
        { name: "apr_annual", type: "number", isOptional: true },
        { name: "apr_monthly", type: "number", isOptional: true },
        { name: "card_last4", type: "string", isOptional: true },
        { name: "credit_subtype", type: "string", isOptional: true },
        { name: "maintenance_fee_amount", type: "number", isOptional: true },
        { name: "maintenance_fee_frequency", type: "string", isOptional: true },
      ],
    }),

    tableSchema({
      name: "categories",
      columns: [
        { name: "user_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "icon_image", type: "string" },
        { name: "type", type: "string" },
      ],
    }),

    tableSchema({
      name: "transactions",
      columns: [
        { name: "user_id", type: "string", isIndexed: true },
        {
          name: "account_id",
          type: "string",
          isIndexed: true,
          isOptional: true,
        },
        {
          name: "destination_account_id",
          type: "string",
          isIndexed: true,
          isOptional: true,
        },
        {
          name: "category_id",
          type: "string",
          isIndexed: true,
          isOptional: true,
        },
        {
          name: "goal_id",
          type: "string",
          isIndexed: true,
          isOptional: true,
        },
        { name: "date", type: "number", isIndexed: true },
        { name: "amount", type: "number" },
        { name: "description", type: "string" },
        { name: "type", type: "string" },
        { name: "installments_total", type: "number", isOptional: true },
        { name: "installments_paid", type: "number", isOptional: true },
        { name: "transfer_target", type: "string", isOptional: true },
        { name: "fee_type", type: "string", isOptional: true },
      ],
    }),

tableSchema({
      name: "notifications",
      columns: [
        { name: "user_id", type: "string", isIndexed: true },
        { name: "event_id", type: "string", isOptional: true, isIndexed: true }, // Nuevo, opcional e indexado por ser relación
        { name: "goal_id", type: "string", isOptional: true, isIndexed: true },
        { name: "expo_notification_id", type: "string" }, // Nuevo
        { name: "type", type: "string" },
        { name: "message", type: "string" },
        { name: "send_date", type: "number" },
        { name: "send_status", type: "boolean" },
        { name: "is_read", type: "boolean" }, // Nuevo
      ],
    }),

    tableSchema({
      name: "financial_goals",
      columns: [
        { name: "user_id", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "amount", type: "number" },
        { name: "deadline", type: "number" },
        { name: "creation_date", type: "number" },
        { name: "progress", type: "number", isOptional: true },
        { name: "saved_amount", type: "number", isOptional: true },
      ],
    }),

    tableSchema({
      name: "events",
      columns: [
        { name: "user_id", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "start_date", type: "number" },
        { name: "end_date", type: "number" },
        { name: "creation_date", type: "number" },
        { name: "calendar_event_id", type: "string", isOptional: true }, // Renombrado y ahora opcional
        { name: "category", type: "string" },
        { name: "amount", type: "number" }, // Nuevo
        { name: "status", type: "string" }, // Nuevo
        { name: "recurrence", type: "string", isOptional: true }, // Nuevo
        // Nota: Se eliminó 'notification'
      ],
    }),
  ],
});
