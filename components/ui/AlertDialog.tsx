// components/ui/AlertDialog.tsx
//
// Alerta personalizada controlada por el store global. Tipos disponibles:
//   confirm  → botones Cancelar/Aceptar (rojo si `danger`, p.ej. borrar/salir).
//   info     → un botón "Entendido" (informativas: guardado, retroceder…).
//   success  → un botón "Aceptar" en verde (operación completada).
//   error    → un botón "Entendido" en rojo (no se pudo guardar…).
//   warning  → un botón "Entendido" en ámbar.
//
// Si hay varias alertas encoladas se muestran una tras otra. El botón
// principal soporta `onConfirm` asíncrono (muestra un spinner mientras corre).

import { useColorScheme } from "nativewind";
import {
  CircleAlert,
  CircleCheckBig,
  CircleX,
  Info,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import {
  useOverlayStore,
  type AlertType,
} from "@/store/useOverlayStore";

interface TypeStyle {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: (isDark: boolean) => string;
  iconBg: string;
  primaryBg: string;
  primaryText: string;
}

const ACCENT = (isDark: boolean) => (isDark ? "#4b9aff" : "#2563eb");

const TYPE_STYLES: Record<AlertType, TypeStyle> = {
  confirm: {
    icon: CircleAlert,
    iconColor: ACCENT,
    iconBg: "bg-accent/10 dark:bg-accent-dark/10",
    primaryBg: "bg-accent dark:bg-accent-dark",
    primaryText: "text-white",
  },
  info: {
    icon: Info,
    iconColor: ACCENT,
    iconBg: "bg-accent/10 dark:bg-accent-dark/10",
    primaryBg: "bg-accent dark:bg-accent-dark",
    primaryText: "text-white",
  },
  success: {
    icon: CircleCheckBig,
    iconColor: () => "#16a34a",
    iconBg: "bg-income/10 dark:bg-income-dark/10",
    primaryBg: "bg-income dark:bg-income-dark",
    primaryText: "text-white",
  },
  error: {
    icon: CircleX,
    iconColor: () => "#dc2626",
    iconBg: "bg-expense/10 dark:bg-expense-dark/10",
    primaryBg: "bg-expense dark:bg-expense-dark",
    primaryText: "text-white",
  },
  warning: {
    icon: TriangleAlert,
    iconColor: () => "#d97706",
    iconBg: "bg-amber-500/10",
    primaryBg: "bg-amber-500",
    primaryText: "text-white",
  },
};

const DANGER_STYLE: TypeStyle = {
  icon: ShieldAlert,
  iconColor: () => "#dc2626",
  iconBg: "bg-expense/10 dark:bg-expense-dark/10",
  primaryBg: "bg-expense dark:bg-expense-dark",
  primaryText: "text-white",
};

const DEFAULT_LABELS: Record<AlertType, { confirm: string; cancel: string }> = {
  confirm: { confirm: "Aceptar", cancel: "Cancelar" },
  info: { confirm: "Entendido", cancel: "Cancelar" },
  success: { confirm: "Aceptar", cancel: "Cancelar" },
  error: { confirm: "Entendido", cancel: "Cancelar" },
  warning: { confirm: "Entendido", cancel: "Cancelar" },
};

export default function AlertDialog() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const alerts = useOverlayStore((s) => s.alerts);
  const closeAlert = useOverlayStore((s) => s.closeAlert);
  const showAlert = useOverlayStore((s) => s.showAlert);
  const alert = alerts[0];

  const [pending, setPending] = useState(false);

  // Al pasar a la siguiente alerta de la cola se reinicia el spinner.
  useEffect(() => {
    setPending(false);
  }, [alert?.id]);

  if (!alert) return null;

  const type: AlertType = alert.type;
  const danger = alert.danger ?? false;
  const style = type === "confirm" && danger ? DANGER_STYLE : TYPE_STYLES[type];
  const Icon = style.icon;
  const labels = DEFAULT_LABELS[type];
  const cancelable = alert.cancelable ?? type === "confirm";
  const confirmLabel = alert.confirmLabel ?? labels.confirm;
  const cancelLabel = alert.cancelLabel ?? labels.cancel;

  const handleConfirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      await alert.onConfirm?.();
    } catch (error: any) {
      console.error("Error en confirmación:", error);
      showAlert({
        type: "error",
        title: "Algo salió mal",
        message: error?.message ?? "Ocurrió un error inesperado.",
      });
    } finally {
      setPending(false);
      closeAlert(alert.id);
    }
  };

  const handleCancel = () => {
    if (pending) return;
    alert.onCancel?.();
    closeAlert(alert.id);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (cancelable && !pending) handleCancel();
      }}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <View
          className="w-full max-w-sm rounded-3xl border border-black/10 bg-panel p-6 dark:border-white/10 dark:bg-panel-dark"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.28,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 14 },
            elevation: 16,
          }}
        >
          <View className="items-center">
            <View
              className={`h-14 w-14 items-center justify-center rounded-full ${style.iconBg}`}
            >
              <Icon size={28} color={style.iconColor(isDark)} />
            </View>
            <Text className="mt-4 text-center text-lg font-bold text-ink dark:text-ink-dark">
              {alert.title}
            </Text>
            {alert.message ? (
              <Text className="mt-2 text-center text-sm leading-relaxed text-muted dark:text-muted-dark">
                {alert.message}
              </Text>
            ) : null}
          </View>

          <View className="mt-6 flex-row gap-3">
            {cancelable ? (
              <Pressable
                onPress={handleCancel}
                disabled={pending}
                className="flex-1 items-center justify-center rounded-xl border border-black/10 py-3 dark:border-white/10"
              >
                <Text className="text-sm font-semibold text-muted dark:text-muted-dark">
                  {cancelLabel}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleConfirm}
              disabled={pending}
              className={`flex-1 flex-row items-center justify-center rounded-xl py-3 ${style.primaryBg} ${
                pending ? "opacity-60" : ""
              }`}
            >
              {pending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className={`text-sm font-bold ${style.primaryText}`}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
