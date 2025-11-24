import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export class FinancialGoal extends Model {
  static table = 'financial_goals';

  static associations = {
    users: { type: 'belongs_to', key: 'user_id' },
  };

  @field('title') title;
  @field('description') description;
  @field('amount') amount;
  @field('deadline') deadline;
  @field('creation_date') creationDate;
  @field('progress') progress;

  @relation('users', 'user_id') user;
}
