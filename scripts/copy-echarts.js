// scripts/copy-echarts.js
//
// Copia Apache ECharts (build standalone) desde node_modules hacia
// assets/echarts con extensión de ASSET (.jsbundle). Así Metro lo empaqueta
// como texto y la app puede leer su contenido en tiempo de ejecución para
// inyectarlo en el WebView que renderiza las gráficas en iOS/Android.
//
// Nota: este asset NO forma parte del bundle JS de la app: el WebView lo
// ejecuta en su propio contexto aislado, por lo que no infla el bundle y
// no interfiere con el tree-shaking de la versión web (echarts/core).
//
// Se ejecuta en `postinstall` (junto a copy-pdfjs).
/* global __dirname */

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "echarts", "dist", "echarts.min.js");
const destDir = path.join(__dirname, "..", "assets", "echarts");
const dest = path.join(destDir, "echarts.min.jsbundle");

if (!fs.existsSync(src)) {
  console.error(`copy-echarts: no existe ${src}`);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`copy-echarts: echarts.min.js -> ${path.relative(process.cwd(), dest)}`);
