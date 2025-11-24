import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export class Transaction extends Model {
  static table = 'transactions';

  static associations = {
    users: { type: 'belongs_to', key: 'user_id' },
    categories: { type: 'belongs_to', key: 'category_id' },
  };

  @field('date') date;
  @field('amount') amount;
  @field('description') description;
  @field('type') type;

  @relation('users', 'user_id') user;
  @relation('categories', 'category_id') category;
}
