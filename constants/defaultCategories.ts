export type CategoryType = "income" | "expense";

export interface DefaultCategory {
  name: string;
  iconImage: string;
  type: CategoryType;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Gastos
  { name: "Comida", iconImage: "food", type: "expense" },
  { name: "Transporte", iconImage: "transport", type: "expense" },
  { name: "Entretenimiento", iconImage: "entertainment", type: "expense" },
  { name: "Salud", iconImage: "health", type: "expense" },
  { name: "Educación", iconImage: "education", type: "expense" },
  { name: "Servicios", iconImage: "utilities", type: "expense" },
  { name: "Ropa", iconImage: "clothing", type: "expense" },
  { name: "Supermercado", iconImage: "supermarket", type: "expense" },
  { name: "Café", iconImage: "coffee", type: "expense" },
  { name: "Gimnasio", iconImage: "gym", type: "expense" },
  // Ingresos
  { name: "Salario", iconImage: "salary", type: "income" },
  { name: "Freelance", iconImage: "freelance", type: "income" },
  { name: "Regalo", iconImage: "gift", type: "income" },
  { name: "Inversión", iconImage: "investment", type: "income" },
  { name: "Reembolso", iconImage: "refund", type: "income" },
  { name: "Venta", iconImage: "sale", type: "income" },
  { name: "Otros ingresos", iconImage: "other_income", type: "income" },
];
