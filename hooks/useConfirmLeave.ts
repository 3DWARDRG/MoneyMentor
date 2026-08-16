import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";

interface UseConfirmLeaveOptions {
  enabled: boolean;
  title?: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onDiscard?: () => void;
}

export function useConfirmLeave({
  enabled,
  title = "¿Salir sin guardar?",
  message = "Tienes cambios sin guardar.\n\n• Conservar: vuelves al formulario y sigues editando.\n• Descartar: sales y se pierden los cambios.",
  cancelLabel = "Conservar",
  confirmLabel = "Descartar",
  onDiscard,
}: UseConfirmLeaveOptions) {
  const navigation = useNavigation();

  const optionsRef = useRef({
    enabled,
    title,
    message,
    cancelLabel,
    confirmLabel,
    onDiscard,
  });
  optionsRef.current = { enabled, title, message, cancelLabel, confirmLabel, onDiscard };

  const allowLeaveRef = useRef(false);
  const alertOpenRef = useRef(false);

  const allowLeave = useCallback(() => {
    allowLeaveRef.current = true;
    setTimeout(() => {
      allowLeaveRef.current = false;
    }, 500);
  }, []);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current) return;

      const opts = optionsRef.current;
      if (!opts.enabled) return;

      e.preventDefault();

      if (alertOpenRef.current) return;

      alertOpenRef.current = true;

      Alert.alert(
        opts.title,
        opts.message,
        [
          {
            text: opts.cancelLabel,
            style: "cancel",
            onPress: () => {
              alertOpenRef.current = false;
            },
          },
          {
            text: opts.confirmLabel,
            style: "destructive",
            onPress: () => {
              alertOpenRef.current = false;
              opts.onDiscard?.();
              allowLeaveRef.current = true;
              requestAnimationFrame(() => {
                router.back();
              });
            },
          },
        ],
        { cancelable: false },
      );
    });

    return unsubscribe;
  }, [navigation]);

  return { allowLeave };
}
