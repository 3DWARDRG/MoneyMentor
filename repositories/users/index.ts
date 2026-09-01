import { database } from "@/database";
import { User } from "@/database/models/mlUser";
import { Q } from "@nozbe/watermelondb";
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
  static async create(data: UserCreateInput): Promise<User> {
    assertValidKeys(data, WRITABLE_FIELDS, "UserRepository");
    assertRequiredFields(data, REQUIRED_FIELDS, "UserRepository");

    return await database.write(async () => {
      const collection = database.collections.get<User>("users");
      return await collection.create((user) => {
        applyCreate(user, data, WRITABLE_FIELDS);
      });
    });
  }

  static async update(id: string, data: UserUpdateInput): Promise<User> {
    assertValidKeys(data, WRITABLE_FIELDS, "UserRepository");

    return await database.write(async () => {
      const collection = database.collections.get<User>("users");
      const user = await collection.find(id);
      return await user.update((u) => {
        applyUpdate(u, data, WRITABLE_FIELDS);
      });
    });
  }

  static async delete(id: string): Promise<void> {
    return await database.write(async () => {
      const collection = database.collections.get<User>("users");
      const user = await collection.find(id);
      await user.markAsDeleted();
    });
  }

  static async findById(id: string): Promise<User> {
    const collection = database.collections.get<User>("users");
    return await collection.find(id);
  }

  static async findByEmail(email: string): Promise<User | null> {
    const collection = database.collections.get<User>("users");
    const users = await collection.query(Q.where("email", email)).fetch();
    return users[0] || null;
  }

  static async findAll(): Promise<User[]> {
    const collection = database.collections.get<User>("users");
    return await collection.query().fetch();
  }
}
