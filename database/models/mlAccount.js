import { Model } from '@nozbe/watermelondb'
import { field, relation } from '@nozbe/watermelondb/decorators'

export class Account extends Model {
  static table = 'accounts'

  static associations = {
    users: { type: 'belongs_to', key: 'user_id' },
    // categories: muchos a muchos, manejar con tabla intermedia aparte
  }
  @field('user_id') user_id  
  @field('name') name
  @field('icon_image') iconImage
  @field('balance') balance

  @relation('users', 'user_id') user
}
