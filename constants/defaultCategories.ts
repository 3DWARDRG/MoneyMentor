export type CategoryType = "income" | "expense";

export interface DefaultCategory {
  name: string;
  iconImage: string;
  type: CategoryType;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Gastos
  { name: "Comida", iconImage: "food", type: "expense" },
  { name: "Restaurante", iconImage: "restaurant", type: "expense" },
  { name: "Supermercado", iconImage: "supermarket", type: "expense" },
  { name: "Café", iconImage: "coffee", type: "expense" },
  { name: "Domicilios", iconImage: "grocery_delivery", type: "expense" },
  { name: "Bebida", iconImage: "drink", type: "expense" },
  { name: "Transporte", iconImage: "transport", type: "expense" },
  { name: "Gasolina", iconImage: "fuel", type: "expense" },
  { name: "Arriendo", iconImage: "rent", type: "expense" },
  { name: "Hogar", iconImage: "home", type: "expense" },
  { name: "Servicios", iconImage: "utilities", type: "expense" },
  { name: "Impuestos", iconImage: "taxes", type: "expense" },
  { name: "Celular", iconImage: "phone", type: "expense" },
  { name: "Internet", iconImage: "internet", type: "expense" },
  { name: "Salud", iconImage: "health", type: "expense" },
  { name: "Gimnasio", iconImage: "gym", type: "expense" },
  { name: "Educación", iconImage: "education", type: "expense" },
  { name: "Entretenimiento", iconImage: "entertainment", type: "expense" },
  { name: "Suscripciones", iconImage: "subscription", type: "expense" },
  { name: "Eventos", iconImage: "events", type: "expense" },
  { name: "Entradas", iconImage: "ticket", type: "expense" },
  { name: "Compras", iconImage: "shopping", type: "expense" },
  { name: "Ropa", iconImage: "clothing", type: "expense" },
  { name: "Mascotas", iconImage: "pets", type: "expense" },
  { name: "Viajes", iconImage: "travel", type: "expense" },
  { name: "Otros gastos", iconImage: "other_expense", type: "expense" },
  // Ingresos
  { name: "Salario", iconImage: "salary", type: "income" },
  { name: "Bonificación", iconImage: "bonus", type: "income" },
  { name: "Freelance", iconImage: "freelance", type: "income" },
  { name: "Inversión", iconImage: "investment", type: "income" },
  { name: "Dividendos", iconImage: "dividends", type: "income" },
  { name: "Intereses", iconImage: "interest", type: "income" },
  { name: "Cripto", iconImage: "crypto", type: "income" },
  { name: "Regalo", iconImage: "gift", type: "income" },
  { name: "Premio", iconImage: "award", type: "income" },
  { name: "Reembolso", iconImage: "refund", type: "income" },
  { name: "Venta", iconImage: "sale", type: "income" },
  { name: "Otros ingresos", iconImage: "other_income", type: "income" },
];
