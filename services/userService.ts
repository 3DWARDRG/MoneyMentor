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

  const cleanNames = names.trim();
  if (!cleanNames) {
    throw new Error("El nombre es obligatorio");
  }

  return await UserRepository.create({
    names: cleanNames,
    lastName: lastName.trim(),
    email: email.trim() || `local_${Date.now()}@moneymentor.local`,
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

export interface UpdateUserProfileInput {
  names: string;
  lastName: string;
  email: string;
}

/** Actualiza el perfil del usuario (trim + email de respaldo). */
export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput
): Promise<User> {
  const cleanNames = input.names.trim();
  if (!cleanNames) {
    throw new Error("El nombre es obligatorio");
  }

  return await UserRepository.update(userId, {
    names: cleanNames,
    lastName: input.lastName.trim(),
    email: input.email.trim() || `local_${Date.now()}@moneymentor.local`,
  });
}
