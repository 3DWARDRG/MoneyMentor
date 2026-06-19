import { Model } from '@nozbe/watermelondb';
import { field, relation, children } from '@nozbe/watermelondb/decorators';

export class Category extends Model {
  static table = 'categories';

  static associations = {
    accounts: { type: 'belongs_to', key: 'account_id' },
    transactions: { type: 'has_many', foreignKey: 'category_id' },
  };
  @field('user_id') user_id      // ← agregar esto
  @field('category_id') category_id
  @field('name') name;
  @field('icon_image') iconImage;
  @field('type') type;

  @relation('accounts', 'account_id') account;
  @children('transactions') transactions;
}
