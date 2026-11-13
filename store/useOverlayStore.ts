// store/useOverlayStore.ts
//
// Estado global de overlays: velo de carga (spinner a pantalla completa) y
// alertas personalizadas (confirmación, informativa, éxito, error, advertencia).
// Cualquier pantalla puede dispararlos sin montar componentes locales:
//
//   showLoading("Guardando…");
//   hideLoading();
//
//   showAlert({ type: "confirm", title: "¿Borrar transacción?", danger: true, onConfirm: borrar });
//
// El provider <AppOverlay /> se monta una sola vez en app/_layout.tsx.

import { create } from "zustand";

export type AlertType = "confirm" | "info" | "success" | "error" | "warning";

export interface AlertOptions {
  type?: AlertType;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** En tipo confirm: pinta el botón principal en rojo (borrar, salir). */
  danger?: boolean;
  /** Permite cerrar con el botón atrás / tocar fuera. En confirm por defecto true. */
  cancelable?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface ActiveAlert extends AlertOptions {
  id: string;
  type: AlertType;
}

export interface LoadingOptions {
  message?: string;
  /** Muestra un botón "Cancelar" dentro del velo (para abortar procesos largos). */
  cancelable?: boolean;
  onCancel?: () => void;
}

interface OverlayState {
  loading: boolean;
  loadingMessage: string;
  loadingCancelable: boolean;
  loadingOnCancel: (() => void) | null;
  alerts: ActiveAlert[];

  showLoading: (message?: string, options?: LoadingOptions) => void;
  hideLoading: () => void;
  showAlert: (options: AlertOptions) => string;
  closeAlert: (id: string) => void;
  closeAllAlerts: () => void;
}

let alertSeq = 0;

export const useOverlayStore = create<OverlayState>((set) => ({
  loading: false,
  loadingMessage: "Cargando…",
  loadingCancelable: false,
  loadingOnCancel: null,
  alerts: [],

  showLoading: (message = "Cargando…", options) =>
    set({
      loading: true,
      loadingMessage: message,
      loadingCancelable: options?.cancelable ?? false,
      loadingOnCancel: options?.onCancel ?? null,
    }),

  hideLoading: () =>
    set({
      loading: false,
      loadingMessage: "Cargando…",
      loadingCancelable: false,
      loadingOnCancel: null,
    }),

  showAlert: (options) => {
    const id = `alert-${++alertSeq}`;
    const alert: ActiveAlert = { ...options, id, type: options.type ?? "info" };
    set((s) => ({ alerts: [...s.alerts, alert] }));
    return id;
  },

  closeAlert: (id) =>
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

  closeAllAlerts: () => set({ alerts: [] }),
}));

// Helpers de un solo llamado (sin usar el hook) para disparar overlays desde
// cualquier función async o callback.
export const showLoading = (message?: string, options?: LoadingOptions) =>
  useOverlayStore.getState().showLoading(message, options);

export const hideLoading = () => useOverlayStore.getState().hideLoading();

export const showAlert = (options: AlertOptions) =>
  useOverlayStore.getState().showAlert(options);

export const closeAlert = (id: string) =>
  useOverlayStore.getState().closeAlert(id);

