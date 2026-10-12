import { User } from "@/database/models/mlUser";
import { UserRepository } from "@/repositories/users";

export interface CreateLocalUserInput {
  names: string;
  lastName?: string;
  email?: string;
}

/**
 * Crea un usuario local con los defaults de la app (email de respaldo,
 * password vacío, confirmado, fechas). La autenticación real es por PIN
 * en SecureStore, no por este registro.
 */
export async function createLocalUser(
  input: CreateLocalUserInput
): Promise<User> {
  const { names, lastName = "", email = "" } = input;

  return await UserRepository.create({
    names,
    lastName,
    email: email || `local_${Date.now()}@moneymentor.local`,
    password: "",
    confirmEmail: true,
    creationDate: Date.now(),
    lastAccess: Date.now(),
  });
}

/** Lee un usuario por id; devuelve null si no existe (para validaciones). */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    return await UserRepository.findById(userId);
  } catch {
    return null;
  }
}
