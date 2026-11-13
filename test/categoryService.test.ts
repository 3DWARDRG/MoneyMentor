// test/categoryService.test.ts
import type { Category } from "../database/models/mlCategory";
import { DEFAULT_CATEGORIES } from "../constants/defaultCategories";
import { runBatch } from "@/database/batch";
import { CategoryRepository } from "@/repositories/categories";
import {
  ensureAhorroCategory,
  ensureDefaultCategoriesForUser,
  getCategoriesMap,
} from "../services/categoryService";

jest.mock("@/database/batch", () => ({ runBatch: jest.fn() }));
jest.mock("@/repositories/categories", () => ({
  CategoryRepository: {
    buildByUserIdQuery: jest.fn(),
    prepareUpdate: jest.fn(),
    prepareCreate: jest.fn(),
    create: jest.fn(),
  },
}));

const makeCategory = (overrides: Partial<Category> = {}) =>
  ({
    id: "c1",
    name: "Comida",
    type: "expense",
    iconImage: "food",
    ...overrides,
  } as unknown as Category);

const buildQuery = jest.mocked(CategoryRepository.buildByUserIdQuery);
const prepareUpdate = jest.mocked(CategoryRepository.prepareUpdate);
const prepareCreate = jest.mocked(CategoryRepository.prepareCreate);
const createCategory = jest.mocked(CategoryRepository.create);
const runBatchMock = jest.mocked(runBatch);

// Simula `CategoryRepository.buildByUserIdQuery(userId).fetch()`.
function mockFetch(records: Category[]) {
  buildQuery.mockReturnValue({
    fetch: jest.fn().mockResolvedValue(records),
  } as unknown as ReturnType<typeof CategoryRepository.buildByUserIdQuery>);
}

beforeEach(() => {
  jest.resetAllMocks();
  prepareUpdate.mockImplementation(
    (record, data) => ({ ...data, id: record.id } as unknown as Category),
  );
  prepareCreate.mockImplementation(
    (data) => ({ ...data, id: `new-${data.name}` } as unknown as Category),
  );
  createCategory.mockResolvedValue({ id: "new-ahorro" } as unknown as Category);
});

describe("categoryService.getCategoriesMap", () => {
  it("mapea id -> { name, icon } y usa 📁 para null o vacío", async () => {
    mockFetch([
      makeCategory({ id: "c1", name: "Comida", iconImage: "food" }),
      makeCategory({ id: "c2", name: "Otros", iconImage: null as any }),
      makeCategory({ id: "c3", name: "Vacía", iconImage: "" as any }),
    ]);

    const map = await getCategoriesMap("u1");

    expect(map).toEqual({
      c1: { name: "Comida", icon: "food" },
      c2: { name: "Otros", icon: "📁" },
      c3: { name: "Vacía", icon: "📁" },
    });
    expect(buildQuery).toHaveBeenCalledWith("u1");
  });
});

describe("categoryService.ensureAhorroCategory", () => {
  it("elige la Ahorro de tipo expense (ignora señuelos)", async () => {
    mockFetch([
      makeCategory({ id: "cat-comida", name: "Comida", type: "expense" }),
      makeCategory({ id: "cat-ahorro-inc", name: "Ahorro", type: "income" }),
      makeCategory({ id: "cat-ahorro", name: "Ahorro", type: "expense" }),
    ]);

    const id = await ensureAhorroCategory("u1");

    expect(id).toBe("cat-ahorro");
    expect(createCategory).not.toHaveBeenCalled();
    expect(buildQuery).toHaveBeenCalledWith("u1");
  });

  it("la crea si no existe", async () => {
    mockFetch([]);

    const id = await ensureAhorroCategory("u1");

    expect(createCategory).toHaveBeenCalledWith({
      userId: "u1",
      name: "Ahorro",
      iconImage: "goal",
      type: "expense",
    });
    expect(id).toBe("new-ahorro");
    expect(buildQuery).toHaveBeenCalledWith("u1");
  });
});

describe("categoryService.ensureDefaultCategoriesForUser", () => {
  it("migra íconos legacy y crea faltantes en UN solo runBatch", async () => {
    // "Comida" ya existe pero con emoji legacy 🍔.
    const legacy = makeCategory({
      id: "legacy1",
      name: "Comida",
      type: "expense",
      iconImage: "🍔",
    });
    mockFetch([legacy]);

    await ensureDefaultCategoriesForUser("u1");

    expect(buildQuery).toHaveBeenCalledWith("u1");

    expect(prepareUpdate).toHaveBeenCalledTimes(1);
    expect(prepareUpdate).toHaveBeenCalledWith(legacy, { iconImage: "food" });

    // "Comida" se excluye; el resto de defaults se crea con el userId.
    expect(prepareCreate).toHaveBeenCalledTimes(DEFAULT_CATEGORIES.length - 1);
    expect(prepareCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        name: "Salario",
        type: "income",
        iconImage: "salary",
      }),
    );

    // Atomicidad: un único runBatch con updates + creates.
    expect(runBatchMock).toHaveBeenCalledTimes(1);
    expect(runBatchMock.mock.calls[0]).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it("no llama runBatch si no hay cambios", async () => {
    // Todas las defaults ya existen con íconos premium (sin legacy).
    mockFetch(
      DEFAULT_CATEGORIES.map((cat, i) =>
        makeCategory({
          id: `c${i}`,
          name: cat.name,
          type: cat.type,
          iconImage: cat.iconImage,
        }),
      ),
    );

    await ensureDefaultCategoriesForUser("u1");

    expect(buildQuery).toHaveBeenCalledWith("u1");
    expect(prepareUpdate).not.toHaveBeenCalled();
    expect(prepareCreate).not.toHaveBeenCalled();
    expect(runBatchMock).not.toHaveBeenCalled();
  });

  it("no lanza si falla la lectura (solo loguea)", async () => {
    buildQuery.mockReturnValue({
      fetch: jest.fn().mockRejectedValue(new Error("db down")),
    } as unknown as ReturnType<typeof CategoryRepository.buildByUserIdQuery>);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      ensureDefaultCategoriesForUser("u1"),
    ).resolves.toBeUndefined();

    expect(buildQuery).toHaveBeenCalledWith("u1");
    expect(errorSpy).toHaveBeenCalled();
    expect(runBatchMock).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
