// components/ui/LoadingOverlay.tsx
//
// Velo de carga: cubre toda la pantalla con un fondo oscuro translúcido y un
// spinner centrado con el mensaje opcional. Se controla desde el store global:
//
//   showLoading("Guardando…");
//   hideLoading();
//
// Si `cancelable` se activa aparece un botón "Cancelar" (para procesos largos
// que se puedan abortar, p.ej. la importación de un extracto).

import { useColorScheme } from "nativewind";
import React from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { useOverlayStore } from "@/store/useOverlayStore";

export default function LoadingOverlay() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const loading = useOverlayStore((s) => s.loading);
  const message = useOverlayStore((s) => s.loadingMessage);
  const cancelable = useOverlayStore((s) => s.loadingCancelable);
  const onCancel = useOverlayStore((s) => s.loadingOnCancel);
  const hideLoading = useOverlayStore((s) => s.hideLoading);

  const cancel = () => {
    onCancel?.();
    hideLoading();
  };

  return (
    <Modal
      visible={loading}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (cancelable) cancel();
      }}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <View
          className="items-center rounded-3xl border border-black/10 bg-panel px-9 py-7 dark:border-white/10 dark:bg-panel-dark"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 16,
          }}
        >
          <ActivityIndicator
            size="large"
            color={isDark ? "#4b9aff" : "#2563eb"}
          />
          {message ? (
            <Text className="mt-4 text-center text-sm font-medium text-ink dark:text-ink-dark">
              {message}
            </Text>
          ) : null}
          {cancelable ? (
            <Pressable
              onPress={cancel}
              className="mt-4 rounded-xl border border-black/10 px-5 py-2 dark:border-white/10"
            >
              <Text className="text-sm font-medium text-muted dark:text-muted-dark">
                Cancelar
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
