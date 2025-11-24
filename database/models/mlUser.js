import { Model } from '@nozbe/watermelondb'
import { field, children } from '@nozbe/watermelondb/decorators'

export class User extends Model {
  static table = 'users'

  static associations = {
    notifications: { type: 'has_many', foreignKey: 'user_id' },
    events: { type: 'has_many', foreignKey: 'user_id' },
    accounts: { type: 'has_many', foreignKey: 'user_id' },
    financial_goals: { type: 'has_many', foreignKey: 'user_id' },
  }

  @field('names') names
  @field('last_name') lastName
  @field('email') email
  @field('confirm_email') confirmEmail
  @field('password') password
  @field('creation_date') creationDate
  @field('last_access') lastAccess

  @children('notifications') notifications
  @children('events') events
  @children('accounts') accounts
  @children('financial_goals') financialGoals
}
