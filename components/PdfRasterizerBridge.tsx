// components/PdfRasterizerBridge.tsx
//
// WebView OCULTO que rasteriza páginas de PDF con pdf.js (ver
// services/ai/pdfRenderer.ts). Se monta en las pantallas que pueden importar
// extractos; mientras no se use, no consume recursos relevantes.
//
// El WebView se mantiene en 1×1 (el canvas se crea en JS a tamaño real de la
// página, así que su tamaño no afecta el render). Se coloca muy lejos de la
// pantalla y con pointerEvents="none" para que jamás interfiera visualmente
// ni capture toques (la opacidad sola no es confiable en Android).

import { WebView } from "react-native-webview";
import React, { useEffect, useRef, useState } from "react";
import {
  getRendererHtml,
  handleBridgeMessage,
  registerBridge,
} from "@/services/ai/pdfRenderer";
import { View } from "lucide-react-native";

export default function PdfRasterizerBridge() {
  const webViewRef = useRef<WebView>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    getRendererHtml()
      .then((h) => {
        if (mounted) setHtml(h);
      })
      .catch((err) => {
        console.warn("❌ pdfRenderer: no se pudo cargar pdf.js:", err?.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Cuando el WebView está listo (cargó el HTML real con pdf.js), registramos
  // el puente. Si el HTML no se pudo construir (fallo al leer los assets),
  // nunca se registra: rasterizePdf() rechaza y pdf.ts cae al respaldo.
  useEffect(() => {
    if (!ready || !html || !webViewRef.current) return;
    registerBridge({
      render: (base64, scale) => {
        webViewRef.current?.injectJavaScript(
          `window.postMessage(${JSON.stringify({
            type: "render",
            base64,
            scale,
          })}, "*"); true;`,
        );
      },
    });
    return () => registerBridge(null);
  }, [ready, html]);

  const onMessage = (event: any) => {
    const raw = event?.nativeEvent?.data;
    if (typeof raw !== "string") return;
    handleBridgeMessage(raw);
  };

  return (
    <View       style={{
        display: "none",
        position: "absolute",
        top: -3000,
        left: -3000,
        width: 1,
        height: 1,
        opacity: 0,
        zIndex: -9999,
      }}>
    <WebView
    className="hidden"
      ref={webViewRef}
      originWhitelist={["*"]}
      source={{ html: html ?? "<html><body></body></html>" }}
      onLoadEnd={() => setReady(true)}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      androidLayerType="none"
      pointerEvents="none"
      style={{
        display: "none",
        position: "absolute",
        top: -3000,
        left: -3000,
        width: 1,
        height: 1,
        opacity: 0,
        zIndex: -9999,
      }}
    />
    </View>
  );
}
