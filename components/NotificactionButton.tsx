import { requestPushPermissions } from "@/services/pushNotifications";
import { useSettingsStore } from "@/store/useSettingsStore"; // Ajusta tu ruta
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Switch, Text, View } from "react-native";

// Asumimos que el componente recibe el userId del usuario que tiene la sesión iniciada
export const NotificationButton = ({ userId }: { userId: string }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  // 1. Extrae las acciones de tu Zustand store usando el hook
  const getUserPermissions  = useSettingsStore((s) => s.getUserPermissions);
  const setPermission = useSettingsStore((s) => s.setPermission)

  // 2. Obtén los permisos actuales para este usuario
  const userSettings = getUserPermissions(userId);

  // 2. Sincronización al montar el componente (Solución a la desincronización)
  useEffect(() => {
    const checkRealStatus = async () => {
      const currentState = await Notifications.getPermissionsAsync();

      currentState.status !== "granted" &&
      userSettings.pushNotifications === true
        ? setPermission(userId, "pushNotifications", false)
        : null;

      // Pregunta al OS cuál es el estado REAL del permiso usando Notifications.getPermissionsAsync()
      // Si el OS dice que NO hay permiso (status !== 'granted'), pero en Zustand dice que SÍ (userSettings.pushNotifications === true):
      // Usa setPermission para cambiar Zustand a false y sincronizarlos.
    };
    checkRealStatus();
  }, []); // El array vacío significa "ejecuta esto solo cuando la pantalla aparece"

  // 3. Crea la función que reaccionará cuando el usuario toque el Switch
  const handleTogglePush = async (newValue: boolean) => {
    setIsProcessing(true);

    try {
      if (newValue) {
        // 1. EL USUARIO QUIERE ENCENDER (newValue es true)
        const hasPermission = await requestPushPermissions();

        if (hasPermission) {
          // Guarda en Zustand el true
          setPermission(userId, "pushNotifications", true);
        } else {
          // El usuario rechazó el permiso en la ventana del sistema.
          // Asegúrate de guardar false en Zustand
          setPermission(userId, "pushNotifications", false);
        }
      } else {
        Alert.alert(
          "Desactivar Permisos",
          "Hemos pausado los recordatorios. Si deseas revocar el permiso por completo, debes hacerlo desde los ajustes de tu dispositivo.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Ir a Ajustes",
              onPress: () => {
                // Escribe el código para abrir los ajustes aquí usando Linking
                Linking.openSettings();
              },
            },
          ],
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View className="p-4 flex-1">
      <View className="flex-row items-center justify-between p-4 bg-deepSoft dark:bg-deepSoft-dark rounded-xl border border-black/10 dark:border-white/10">
        <Text className="text-sm font-medium text-ink dark:text-ink-dark">
          Notificaciones de Pagos
        </Text>

        <Switch
          // 4. Conecta el valor actual (true o false) leyendo desde tu userSettings
          value={userSettings.pushNotifications}
          onValueChange={handleTogglePush}
          // 5. Conecta el evento de cambio a tu función handleTogglePush
          // onValueChange={...}

          trackColor={{ false: "#5c6b84", true: "#4be0a6" }}
          thumbColor="#ffffff"
          disabled={isProcessing}
        />
      </View>
    </View>
  );
};
