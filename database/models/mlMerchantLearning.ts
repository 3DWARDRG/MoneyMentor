import { Model } from "@nozbe/watermelondb";
import { field, relation } from "@nozbe/watermelondb/decorators";

// Diccionario aprendido por el usuario: asocia un comercio (clave normalizada)
// con la descripción, categoría y tipo que el usuario le asignó en la
// verificación de importaciones. Se usa para pre-llenar movimientos futuros
// del mismo comercio (machine learning simulado, 100% local).
export class MerchantLearning extends Model {
  static table = "merchant_learnings";

  static associations = {
    users: { type: "belongs_to", key: "user_id" },
  } as const;

  @field("user_id") userId!: string;
  /** Clave normalizada del comercio (minúsculas, sin acentos ni códigos). */
  @field("merchant_key") merchantKey!: string;
  /** Texto original con el que se aprendió (para mostrarlo en el diccionario). */
  @field("merchant_label") merchantLabel!: string;
  /** Descripción que el usuario asignó (o "cambiar" no aplica). */
  @field("description") description!: string | null;
  /** Categoría asignada (null si el usuario la dejó sin categoría o es transferencia). */
  @field("category_id") categoryId!: string | null;
  /** Tipo asignado: "income" | "expense" | "transfer". */
  @field("type") type!: string | null;
  /** Cuántas veces se ha confirmado/aprendido este comercio. */
  @field("occurrences") occurrences!: number;
  @field("updated_at") updatedAt!: number;

  @relation("users", "user_id") user: any;
}
