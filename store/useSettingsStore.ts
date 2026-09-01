import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// 1. Nuestro "Diccionario" de permisos (Super escalable)
export interface AppPermissions {
  pushNotifications: boolean;
  // En el futuro, simplemente agregas aquí:
  // calendarSync: boolean;
  // biometrics: boolean;
}

// 2. Permisos por defecto para usuarios nuevos
const DEFAULT_PERMISSIONS: AppPermissions = {
  pushNotifications: false,
};

export type AppTheme = "system" | "light" | "dark";

// 3. La interfaz de nuestro Store
interface SettingsState {
  // El récord que vincula el ID del usuario con sus permisos
  preferencesByUser: Record<string, AppPermissions>;

  // Tema visual de la app: sigue al sistema por defecto
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;

  // Nuestras acciones
  setPermission: (
    userId: string,
    permissionKey: keyof AppPermissions,
    value: boolean,
  ) => void;
  getUserPermissions: (userId: string) => AppPermissions;
}

// 4. Creación del Store con el middleware de persistencia
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Estado inicial vacío
      preferencesByUser: {},
      theme: "system",

      setTheme: (theme) => set({ theme }),

      // Acción para actualizar un permiso específico de un usuario específico
      setPermission: (userId, permissionKey, value) => {
        set((state) => {
          // Si el usuario ya tiene permisos guardados, los usamos. Si no, usamos los de por defecto.
          const currentUserSettings =
            state.preferencesByUser[userId] || DEFAULT_PERMISSIONS;

          return {
            preferencesByUser: {
              ...state.preferencesByUser, // Mantenemos intactos a los demás usuarios
              [userId]: {
                ...currentUserSettings, // Mantenemos intactos los demás permisos de ESTE usuario
                [permissionKey]: value, // Actualizamos solo el permiso que nos pidieron
              },
            },
          };
        });
      },

      // Acción de conveniencia para leer los permisos de un usuario
      getUserPermissions: (userId) => {
        return get().preferencesByUser[userId] || DEFAULT_PERMISSIONS;
      },
    }),
    {
      name: "money-mentor-user-settings", // El nombre del archivo interno donde AsyncStorage guardará esto
      version:0,
      storage: createJSONStorage(() => AsyncStorage), // Le decimos a Zustand que use AsyncStorage en React Native
    },
  ),
);
