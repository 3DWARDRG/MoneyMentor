// test/userService.test.ts
//
// Verifica defaults, trim, fallback de email y validación de nombre
// en la capa service (repositorio mockeado).

import type { User } from "../database/models/mlUser";
import { UserRepository } from "@/repositories/users";
import {
  createLocalUser,
  getUserById,
  updateUserProfile,
} from "../services/userService";

jest.mock("@/repositories/users", () => ({
  UserRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  },
}));

const createUser = jest.mocked(UserRepository.create);
const findUser = jest.mocked(UserRepository.findById);
const updateUser = jest.mocked(UserRepository.update);

const userSentinel = { id: "u1" } as unknown as User;

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.setSystemTime(new Date(2026, 5, 15, 10, 30, 0));
  jest.resetAllMocks();
  createUser.mockResolvedValue(userSentinel);
  findUser.mockResolvedValue(userSentinel);
  updateUser.mockResolvedValue(userSentinel);
});

describe("userService.createLocalUser", () => {
  it("aplica defaults: password vacío, confirmado, fechas y email de respaldo", async () => {
    const now = Date.now();

    const result = await createLocalUser({ names: "Ana" });

    expect(result).toBe(userSentinel);
    expect(createUser).toHaveBeenCalledWith({
      names: "Ana",
      lastName: "",
      email: `local_${now}@moneymentor.local`,
      password: "",
      confirmEmail: true,
      creationDate: now,
      lastAccess: now,
    });
  });

  it("hace trim y usa fallback si el email es solo espacios", async () => {
    const now = Date.now();

    await createLocalUser({ names: "  Ana ", lastName: "  ", email: "   " });

    expect(createUser).toHaveBeenCalledWith({
      names: "Ana",
      lastName: "",
      email: `local_${now}@moneymentor.local`,
      password: "",
      confirmEmail: true,
      creationDate: now,
      lastAccess: now,
    });
  });

  it("hace trim de los valores provistos", async () => {
    await createLocalUser({
      names: "  Ana ",
      lastName: " Pérez ",
      email: " ana@x.com ",
    });

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        names: "Ana",
        lastName: "Pérez",
        email: "ana@x.com",
      }),
    );
  });

  it("lanza si names queda vacío tras el trim y NO escribe", async () => {
    await expect(createLocalUser({ names: "   " })).rejects.toThrow(
      "El nombre es obligatorio",
    );

    expect(createUser).not.toHaveBeenCalled();
  });
});

describe("userService.getUserById", () => {
  it("devuelve el usuario si existe", async () => {
    findUser.mockResolvedValue(userSentinel);

    await expect(getUserById("u1")).resolves.toBe(userSentinel);
    expect(findUser).toHaveBeenCalledWith("u1");
  });

  it("devuelve null si findById falla (y sí consultó el repo)", async () => {
    findUser.mockRejectedValue(new Error("not found"));

    await expect(getUserById("missing")).resolves.toBeNull();
    expect(findUser).toHaveBeenCalledWith("missing");
  });
});

describe("userService.updateUserProfile", () => {
  it("hace trim de names, lastName y email", async () => {
    await updateUserProfile("u1", {
      names: "  Ana ",
      lastName: " Pérez ",
      email: " ana@x.com ",
    });

    expect(updateUser).toHaveBeenCalledWith("u1", {
      names: "Ana",
      lastName: "Pérez",
      email: "ana@x.com",
    });
  });

  it("usa email de respaldo si queda vacío tras el trim", async () => {
    const now = Date.now();

    await updateUserProfile("u1", {
      names: "Ana",
      lastName: "Pérez",
      email: "   ",
    });

    expect(updateUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ email: `local_${now}@moneymentor.local` }),
    );
  });

  it("devuelve el usuario actualizado", async () => {
    await expect(
      updateUserProfile("u1", {
        names: "Ana",
        lastName: "",
        email: "a@b.c",
      }),
    ).resolves.toBe(userSentinel);
  });

  it("lanza si names queda vacío tras el trim y NO actualiza", async () => {
    await expect(
      updateUserProfile("u1", {
        names: "   ",
        lastName: "Pérez",
        email: "a@b.c",
      }),
    ).rejects.toThrow("El nombre es obligatorio");

    expect(updateUser).not.toHaveBeenCalled();
  });
});
