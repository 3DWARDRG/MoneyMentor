import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export class Notification extends Model {
  static table = 'notifications';

  static associations = {
    users: { type: 'belongs_to', key: 'user_id' },
  };

  @field('type') type;
  @field('message') message;
  @field('send_date') sendDate;
  @field('send_status') sendStatus;

  @relation('users', 'user_id') user;
}
