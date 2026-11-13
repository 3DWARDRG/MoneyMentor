// services/charts/echartsWebView.ts
//
// Render de gráficas Apache ECharts en iOS/Android usando un WebView, siguiendo
// el mismo patrón que services/ai/pdfRenderer.ts (librería empaquetada como
// asset .jsbundle e inyectada en un HTML local).
//
// ECharts necesita DOM/canvas, que no existen en el runtime nativo de React
// Native. El WebView provee ese DOM aislado: la app le manda el `option`
// (JSON) y el HTML lo aplica con echarts.min.js. Nada sale del dispositivo
// y el bundle JS de la app no se infla (el asset es texto aparte).

// ---------------------------------------------------------------------------
// Construcción del HTML del WebView (con echarts inyectado)
// ---------------------------------------------------------------------------

const readAssetContent = async (module: number): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Asset } = require("expo-asset") as typeof import("expo-asset");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readAsStringAsync } = require("expo-file-system") as typeof import("expo-file-system");
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error("No se pudo leer el bundle de echarts.");
  return readAsStringAsync(uri);
};

let libContent: string | null = null;

const getEchartsContents = async (): Promise<string> => {
  if (libContent) return libContent;
  libContent = await readAssetContent(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../assets/echarts/echarts.min.jsbundle"),
  );
  return libContent;
};

const buildChartHtml = (lib: string): string => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
</head>
<body style="margin:0;padding:0;background:transparent;overflow:hidden">
<div id="chart" style="width:100%;height:100%"></div>
<script>
${lib}
</script>
<script>
(function () {
  "use strict";
  var chart = null;
  function post(obj) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
  }
  function formatCOP(v) {
    v = Number(v) || 0;
    return "$" + v.toLocaleString("es-CO");
  }
  function formatCompact(v) {
    var a = Math.abs(v);
    if (a >= 1e9) return "$" + (v / 1e9).toFixed(1) + "Md";
    if (a >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return "$" + (v / 1e3).toFixed(0) + "k";
    return "$" + Math.round(v);
  }
  // Re-aplica los formatters que llegan como funciones y no pueden cruzar el
  // puente JSON (se descartan al serializar en RN).
  function applyFormatters(opt) {
    if (opt.tooltip) {
      opt.tooltip.formatter = function (params) {
        var p = Array.isArray(params) ? params[0] : params;
        if (!p) return "";
        var percent = p.percent != null
          ? '<br/><span style="color:#94a3b8">' + p.percent + "%</span>"
          : "";
        return '<span style="color:#94a3b8">' + p.name + "</span><br/>" +
          '<b style="font-size:14px">' + formatCOP(p.value) + "</b>" + percent;
      };
    }
    if (opt.yAxis) {
      opt.yAxis.axisLabel = opt.yAxis.axisLabel || {};
      opt.yAxis.axisLabel.formatter = function (v) {
        return formatCompact(v);
      };
    }
    return opt;
  }
  function render(option) {
    var el = document.getElementById("chart");
    if (!el) return;
    if (!chart) {
      chart = echarts.init(el, null, { renderer: "canvas" });
    }
    chart.setOption(applyFormatters(option), { notMerge: true });
    chart.resize();
  }
  window.addEventListener("message", function (e) {
    var data = e && e.data;
    if (!data) return;
    if (data.type === "setOption") {
      render(data.option);
    } else if (data.type === "resize" && chart) {
      chart.resize({ width: data.width, height: data.height });
    }
  });
  post({ type: "ready" });
})();
</script>
</body>
</html>`;

let htmlPromise: Promise<string> | null = null;

/**
 * Devuelve el HTML del WebView de gráficas (construido una sola vez, cacheado).
 */
export const getEChartsHtml = (): Promise<string> => {
  htmlPromise ??= getEchartsContents().then(buildChartHtml);
  return htmlPromise;
};
