// components/ui/AppOverlay.tsx
//
// Punto único de montaje de los overlays globales: velo de carga + alertas
// personalizadas. Se agrega UNA vez en app/_layout.tsx dentro de la raíz.

import React from "react";
import AlertDialog from "./AlertDialog";
import LoadingOverlay from "./LoadingOverlay";

export default function AppOverlay() {
  return (
    <>
      <LoadingOverlay />
      <AlertDialog />
    </>
  );
}
