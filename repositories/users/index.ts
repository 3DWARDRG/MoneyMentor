import { database } from "@/database";
import { User } from "@/database/models/mlUser";
import { Q, Query } from "@nozbe/watermelondb";
import { Observable } from "@nozbe/watermelondb/utils/rx";
import {
  applyCreate,
  applyUpdate,
  assertRequiredFields,
  assertValidKeys,
} from "@/utils/repositoryHelpers";

const WRITABLE_FIELDS = [
  "names",
  "lastName",
  "email",
  "confirmEmail",
  "password",
  "creationDate",
  "lastAccess",
] as const;

const REQUIRED_FIELDS = [
  "names",
  "lastName",
  "email",
  "password",
  "creationDate",
  "lastAccess",
] as const;

type WritableKey = (typeof WRITABLE_FIELDS)[number];
type UserWritable = Pick<User, WritableKey>;
type RequiredUserFields = Pick<UserWritable, (typeof REQUIRED_FIELDS)[number]>;
type OptionalUserFields = Partial<
  Omit<UserWritable, (typeof REQUIRED_FIELDS)[number]>
>;

export type UserCreateInput = RequiredUserFields & OptionalUserFields;
export type UserUpdateInput = Partial<UserWritable>;

export class UserRepository {
  // Columnas (snake_case) que pueden cambiar y deben re-emitir en observaciones.
  static readonly OBSERVABLE_COLUMNS: string[] = [
    "names",
    "last_name",
    "email",
  ];

  // ── READ (radar)
  static buildAllQuery(): Query<User> {
    return database.collections.get<User>("users").query();
  }

  // ── READ puntual
  static async findById(id: string): Promise<User> {
    return await database.collections.get<User>("users").find(id);
  }

  // ── READ reactivo de un registro (reacciona a TODOS sus campos)
  static observeById(id: string): Observable<User> {
    return database.collections.get<User>("users").findAndObserve(id);
  }

  static async findByEmail(email: string): Promise<User | null> {
    const users = await database.collections
      .get<User>("users")
      .query(Q.where("email", email))
      .fetch();
    return users[0] || null;
  }

  // ── WRITE (empaquetador)
  static prepareCreate(data: UserCreateInput): User {
    assertValidKeys(data, WRITABLE_FIELDS, "UserRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "UserRepository");

    return database.collections
      .get<User>("users")
      .prepareCreate((user) => {
        applyCreate(user, data, WRITABLE_FIELDS);
      });
  }

  static prepareUpdate(record: User, data: UserUpdateInput): User {
    assertValidKeys(data, WRITABLE_FIELDS, "UserRepository");

    return record.prepareUpdate((user) => {
      applyUpdate(user, data, WRITABLE_FIELDS);
    });
  }

  static prepareDelete(record: User): User {
    return record.prepareDestroyPermanently();
  }

  // ── Conveniencia
  static create(data: UserCreateInput): Promise<User> {
    return database.write(async () => {
      const record = this.prepareCreate(data);
      await database.batch(record);
      return record;
    });
  }

  static async update(id: string, data: UserUpdateInput): Promise<User> {
    return await database.write(async () => {
      const record = await this.findById(id);
      const prepared = this.prepareUpdate(record, data);
      await database.batch(prepared);
      return prepared;
    });
  }

  static async delete(id: string): Promise<void> {
    await database.write(async () => {
      const record = await this.findById(id);
      const prepared = this.prepareDelete(record);
      await database.batch(prepared);
    });
  }
}
