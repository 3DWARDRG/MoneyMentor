import { Model } from '@nozbe/watermelondb'
import { field, relation } from '@nozbe/watermelondb/decorators'

export class Event extends Model {
  static table = 'events'

  static associations = {
    users: { type: 'belongs_to', key: 'user_id' },
  }

  @field('title') title
  @field('description') description
  @field('start_date') startDate
  @field('end_date') endDate
  @field('creation_date') creationDate
  @field('google_event_id') googleEventId
  @field('category') category
  @field('notification') notification

  @relation('users', 'user_id') user
}
