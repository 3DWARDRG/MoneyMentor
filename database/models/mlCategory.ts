import { Model } from "@nozbe/watermelondb";
import { children, field } from "@nozbe/watermelondb/decorators";

export class Category extends Model {
  static table = "categories";

  static associations = {
    transactions: { type: "has_many", foreignKey: "category_id" },
  } as const;

  @field("user_id") userId!: string;
  @field("name") name!: string;
  @field("icon_image") iconImage!: string;
  @field("type") type!: string;

  @children("transactions") transactions!: any;
}
