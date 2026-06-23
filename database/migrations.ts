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
  ],
});
