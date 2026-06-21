export type CategoryType = "income" | "expense";

export interface DefaultCategory {
  name: string;
  iconImage: string;
  type: CategoryType;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Gastos
  { name: "Comida", iconImage: "🍔", type: "expense" },
  { name: "Transporte", iconImage: "🚗", type: "expense" },
  { name: "Entretenimiento", iconImage: "🎬", type: "expense" },
  { name: "Salud", iconImage: "🏥", type: "expense" },
  { name: "Educación", iconImage: "📚", type: "expense" },
  { name: "Servicios", iconImage: "💡", type: "expense" },
  { name: "Ropa", iconImage: "👕", type: "expense" },
  { name: "Supermercado", iconImage: "🛒", type: "expense" },
  { name: "Café", iconImage: "☕", type: "expense" },
  { name: "Gimnasio", iconImage: "💪", type: "expense" },
  // Ingresos
  { name: "Salario", iconImage: "💰", type: "income" },
  { name: "Freelance", iconImage: "💻", type: "income" },
  { name: "Regalo", iconImage: "🎁", type: "income" },
  { name: "Inversión", iconImage: "📈", type: "income" },
  { name: "Reembolso", iconImage: "🔄", type: "income" },
  { name: "Venta", iconImage: "🏷️", type: "income" },
  { name: "Otros ingresos", iconImage: "💵", type: "income" },
];
