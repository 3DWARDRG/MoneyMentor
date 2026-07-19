import { database } from "@/database";
import { ensureDefaultCategoriesForUser } from "@/services/ensureDefaultCategories";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

type LocalUser = {
  id: string;
  names: string;
  lastName?: string;
  email?: string;
};

interface AuthState {
  isUnlocked: boolean;
  isHydrating: boolean;
  userId: string | null;
  selectedUserId: string | null;
  users: LocalUser[];

  hydrateAuth: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  selectUser: (userId: string) => void;

  createLocalUser: (data: {
    names: string;
    lastName?: string;
    email?: string;
  }) => Promise<string | null>;

  setupPinForSelectedUser: (pin: string) => Promise<boolean>;
  verifyPinForSelectedUser: (pin: string) => Promise<boolean>;
  authenticateBiometricsForSelectedUser: () => Promise<boolean>;

  logout: () => void;
  clearSelection: () => void;
}

const pinKey = (userId: string) => `pin_${userId}`;

export const useAuthStore = create<AuthState>((set, get) => ({
  isUnlocked: false,
  isHydrating: true,
  userId: null,
  selectedUserId: null,
  users: [],

  hydrateAuth: async () => {
    try {
      console.log("Paso 1: Iniciando hydrateAuth");
      set({ isHydrating: true });
      console.log("Paso 2: Ejecutando refreshUsers...");
      await get().refreshUsers();
console.log("Paso 2: Ejecutando refreshUsers...");
      const lastSelectedUserId =
        await SecureStore.getItemAsync("lastSelectedUserId");
console.log("Paso 4: SecureStore leído. Usuario:", lastSelectedUserId);
      if (lastSelectedUserId) {
        const exists = get().users.some((u) => u.id === lastSelectedUserId);
        if (exists) {
          set({ selectedUserId: lastSelectedUserId });
        }
      }
    } catch (error) {
      console.error("❌ Error en hydrateAuth:", error);
    } finally {
      console.log("Paso 5: Finalizando hydrateAuth (apagando loading)");
      set({ isHydrating: false });
    }
  },

  refreshUsers: async () => {
    try {
      const usersCollection = database.get("users");
      const rows = await usersCollection.query().fetch();

      const users: LocalUser[] = rows.map((u: any) => ({
        id: u.id,
        names: u.names ?? "Usuario",
        lastName: u.lastName ?? "",
        email: u.email ?? "",
      }));

      set({ users });
      console.log("👥 Usuarios locales:", users.length);
    } catch (error) {
      console.error("❌ Error refrescando usuarios:", error);
      set({ users: [] });
    }
  },

  selectUser: (userId: string) => {
    set({
      selectedUserId: userId,
      isUnlocked: false,
      userId: null,
    });
  },

  createLocalUser: async ({ names, lastName = "", email = "" }) => {
    try {
      const usersCollection = database.get("users");
      let createdId: string | null = null;

      await database.write(async () => {
        const newUser = await usersCollection.create((record: any) => {
          record.names = names;
          record.last_name = lastName;
          record.email = email || `local_${Date.now()}@moneymentor.local`;
          record.password = "";
          record.confirm_email = true;
          record.creation_date = Date.now();
          record.last_access = Date.now();
        });

        createdId = newUser.id;
      });

      await get().refreshUsers();

      if (createdId) {
        set({ selectedUserId: createdId });
        await SecureStore.setItemAsync("lastSelectedUserId", createdId);
        console.log("✅ Usuario local creado:", createdId);
      }

      return createdId;
    } catch (error) {
      console.error("❌ Error creando usuario local:", error);
      return null;
    }
  },

  setupPinForSelectedUser: async (pin: string) => {
    try {
      const { selectedUserId } = get();
      if (!selectedUserId) return false;

      await SecureStore.setItemAsync(pinKey(selectedUserId), pin);
      await SecureStore.setItemAsync("lastSelectedUserId", selectedUserId);

      await ensureDefaultCategoriesForUser(selectedUserId); // ← aquí

      set({ userId: selectedUserId, isUnlocked: true });

      console.log("✅ PIN y categorías listas para:", selectedUserId);
      return true;
    } catch (error) {
      console.error("❌ Error en setupPinForSelectedUser:", error);
      return false;
    }
  },

  verifyPinForSelectedUser: async (pin: string) => {
    try {
      const { selectedUserId, users } = get();
      if (!selectedUserId) return false;

      const exists = users.some((u) => u.id === selectedUserId);
      if (!exists) {
        console.log("⚠️ El usuario seleccionado ya no existe");
        return false;
      }

      const storedPin = await SecureStore.getItemAsync(pinKey(selectedUserId));
      if (storedPin !== pin) return false;

      await SecureStore.setItemAsync("lastSelectedUserId", selectedUserId);
      await ensureDefaultCategoriesForUser(selectedUserId);
      set({
        userId: selectedUserId,
        isUnlocked: true,
      });

      console.log("✅ PIN correcto para usuario:", selectedUserId);
      return true;
    } catch (error) {
      console.error("❌ Error en verifyPinForSelectedUser:", error);
      return false;
    }
  },

  authenticateBiometricsForSelectedUser: async () => {
    try {
      const { selectedUserId, users } = get();
      if (!selectedUserId) return false;

      const exists = users.some((u) => u.id === selectedUserId);
      if (!exists) return false;

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquea MoneyMentor",
        fallbackLabel: "Usar PIN",
      });

      if (!result.success) return false;

      await SecureStore.setItemAsync("lastSelectedUserId", selectedUserId);

      set({
        userId: selectedUserId,
        isUnlocked: true,
      });

      console.log("✅ Biometría correcta para usuario:", selectedUserId);
      return true;
    } catch (error) {
      console.error(
        "❌ Error en authenticateBiometricsForSelectedUser:",
        error,
      );
      return false;
    }
  },

  logout: () => {
    set({
      isUnlocked: false,
      userId: null,
    });
  },

  clearSelection: () => {
    set({
      selectedUserId: null,
      isUnlocked: false,
      userId: null,
    });
  },
}));
