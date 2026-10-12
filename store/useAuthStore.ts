import { ensureDefaultCategoriesForUser } from "@/services/categoryService";
import * as userService from "@/services/userService";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { create } from "zustand";


interface AuthState {
  isUnlocked: boolean;
  isHydrating: boolean;
  userId: string | null;
  selectedUserId: string | null;

  hydrateAuth: () => Promise<void>;
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

const hashPin = (userId: string, pin: string): Promise<string> =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${userId}:${pin}`
  );

export const useAuthStore = create<AuthState>((set, get) => ({
  isUnlocked: false,
  isHydrating: true,
  userId: null,
  selectedUserId: null,

  hydrateAuth: async () => {
    try {
      set({ isHydrating: true });
      const lastSelectedUserId =
        await SecureStore.getItemAsync("lastSelectedUserId");
      if (lastSelectedUserId) {
        const exists = await userService.getUserById(lastSelectedUserId);
        if (exists) {
          set({ selectedUserId: lastSelectedUserId });
        }
      }
    } catch (error) {
      console.error("❌ Error en hydrateAuth:", error);
    } finally {
      set({ isHydrating: false });
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
      const user = await userService.createLocalUser({ names, lastName, email });

      set({ selectedUserId: user.id });
      await SecureStore.setItemAsync("lastSelectedUserId", user.id);
      console.log("✅ Usuario local creado:", user.id);

      return user.id;
    } catch (error) {
      console.error("❌ Error creando usuario local:", error);
      return null;
    }
  },

  setupPinForSelectedUser: async (pin: string) => {
    try {
      const { selectedUserId } = get();
      if (!selectedUserId) return false;

      await SecureStore.setItemAsync(pinKey(selectedUserId), await hashPin(selectedUserId, pin));
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
      const { selectedUserId } = get();
      if (!selectedUserId) return false;

      const exists = await userService.getUserById(selectedUserId);
      if (!exists) {
        console.log("⚠️ El usuario seleccionado ya no existe");
        return false;
      }

      const storedPin = await SecureStore.getItemAsync(pinKey(selectedUserId));
      if (storedPin !== (await hashPin(selectedUserId, pin))) return false;

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
      const { selectedUserId } = get();
      if (!selectedUserId) return false;

      const exists = await userService.getUserById(selectedUserId);
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
