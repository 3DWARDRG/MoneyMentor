import {
  addColumns,
  schemaMigrations,
} from "@nozbe/watermelondb/Schema/migrations";

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: "accounts",
          columns: [
            { name: "statement_closing_day", type: "number", isOptional: true },
            { name: "apr_annual", type: "number", isOptional: true },
            { name: "apr_monthly", type: "number", isOptional: true },
            { name: "card_last4", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: "accounts",
          columns: [
            { name: "credit_subtype", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: "transactions",
          columns: [
            {
              name: "destination_account_id",
              type: "string",
              isOptional: true,
              isIndexed: true,
            },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: "transactions",
          columns: [
            { name: "installments_total", type: "number", isOptional: true },
            { name: "installments_paid", type: "number", isOptional: true },
            { name: "transfer_target", type: "string", isOptional: true },
            { name: "fee_type", type: "string", isOptional: true },
          ],
        }),
        addColumns({
          table: "accounts",
          columns: [
            {
              name: "maintenance_fee_amount",
              type: "number",
              isOptional: true,
            },
            {
              name: "maintenance_fee_frequency",
              type: "string",
              isOptional: true,
            },
          ],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: "events",
          columns: [
            { name: "amount", type: "number" },
            { name: "status", type: "string" },
            { name: "recurrence", type: "string", isOptional: true },
            { name: "calendar_event_id", type: "string", isOptional: true },
          ],
        }),
        addColumns({
          table: "notifications",
          columns: [
            {
              name: "event_id",
              type: "string",
              isOptional: true,
              isIndexed: true,
            },
            { name: "expo_notification_id", type: "string" },
            { name: "is_read", type: "boolean" },
          ],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: "notifications",
          columns: [
            {
              name: "goal_id",
              type: "string",
              isOptional: true,
              isIndexed: true,
            },
          ],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: "financial_goals",
          columns: [
            { name: "saved_amount", type: "number", isOptional: true },
          ],
        }),
        addColumns({
          table: "transactions",
          columns: [
            {
              name: "goal_id",
              type: "string",
              isOptional: true,
              isIndexed: true,
            },
          ],
        }),
      ],
    },
  ],
});
