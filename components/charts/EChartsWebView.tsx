// components/charts/EChartsWebView.tsx
//
// Wrapper nativo (iOS/Android) que renderiza una gráfica Apache ECharts dentro
// de un WebView. Recibe el `option` (objeto serializable, ver
// echartsOptions.ts) y lo aplica en el HTML de services/charts/echartsWebView.
//
// Es transparente al contenido: el contenedor externo controla tamaño/posición
// y el WebView simplemente sigue su ancho/alto (onLayout -> resize).

import { WebView } from "react-native-webview";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getEChartsHtml } from "@/services/charts/echartsWebView";

interface Props {
  option: Record<string, unknown> | null;
  height: number;
}

export default function EChartsWebView({ option, height }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const send = (message: unknown) => {
    webViewRef.current?.injectJavaScript(
      `window.postMessage(${JSON.stringify(message)}, "*"); true;`,
    );
  };

  useEffect(() => {
    let mounted = true;
    getEChartsHtml()
      .then((h) => {
        if (mounted) setHtml(h);
      })
      .catch((err) => {
        console.warn("❌ echartsWebView: no se pudo cargar echarts:", err?.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !option) return;
    send({ type: "setOption", option, notMerge: true });
  }, [option, loaded]);

  const handleLayout = (e: any) => {
    const { width, height: h } = e.nativeEvent.layout;
    if (loaded) {
      send({ type: "resize", width, height: h });
    }
  };

  return (
    <View style={[styles.container, { height }]} onLayout={handleLayout}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: html ?? "<html><body style='background:transparent'></body></html>" }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        onLoadEnd={() => setLoaded(true)}
        onMessage={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
