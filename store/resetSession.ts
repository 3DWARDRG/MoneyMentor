import { useImportStore } from "./useImportStore";
import { useOverlayStore } from "./useOverlayStore";

export const resetGlobalSession = () => {
  // 1. Matar procesos asíncronos pendientes
  useImportStore.getState().cancel();

  // 2. Limpiar UI colgada
  useOverlayStore.getState().closeAllAlerts();
  useOverlayStore.getState().hideLoading();
};