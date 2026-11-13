// utils/screenUtils.ts

// 1. Tipamos estrictamente las entidades permitidas
export type EntityType = "transactions" | "reminders" | "accounts" | "goals";

// 2. Tipamos el modo de la pantalla.
// Usamos 'form' para la pantalla que crea/edita, y 'details' para [id].tsx
export type ScreenMode = "form" | "details";

// 3. Diccionario para manejar traducciones y géneros correctamente
const entityDictionary: Record<
  EntityType,
  { new: string; edit: string; details: string }
> = {
  transactions: {
    new: "Nueva transacción",
    edit: "Editar transacción",
    details: "Detalle de transacción",
  },
  reminders: {
    new: "Nuevo recordatorio",
    edit: "Editar recordatorio",
    details: "Detalle de recordatorio",
  },
  accounts: {
    new: "Nueva cuenta",
    edit: "Editar cuenta",
    details: "Detalle de cuenta",
  },
  goals: {
    new: "Nueva meta",
    edit: "Editar meta",
    details: "Detalle de meta",
  },
};

/**
 * Retorna el título dinámico para el header basado en la entidad y los parámetros.
 */
export function getScreenTitle(
  entity: EntityType,
  mode: ScreenMode,
  params?: Record<string, string | string[]>, // Recibe el objeto de useLocalSearchParams
): string {
  const dictionary = entityDictionary[entity];

  // Si es la pantalla de detalles, devolvemos el título directamente
  if (mode === "details") {
    return dictionary.details;
  }

  // Si es la pantalla de formulario ('form'), validamos los params por dentro
  const isEditing = !!params?.id;

  return isEditing ? dictionary.edit : dictionary.new;
}
