// scripts/copy-pdfjs.js
//
// Copia pdf.js (libería + worker) desde node_modules hacia assets/pdfjs con una
// extensión de ASSET (.jsbundle). Así Metro las empaqueta como texto y la app
// puede leer su contenido en tiempo de ejecución para inyectarlo en el WebView
// que rasteriza las páginas del PDF (los bancos dibujan el texto como vectores,
// no como imágenes incrustadas).
//
// Se ejecuta en `postinstall` (junto a patch-package).
/* global __dirname */

const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build");
const destDir = path.join(__dirname, "..", "assets", "pdfjs");

const copies = [
  { from: "pdf.mjs", to: "lib.jsbundle" },
  { from: "pdf.worker.mjs", to: "worker.jsbundle" },
];

fs.mkdirSync(destDir, { recursive: true });

for (const c of copies) {
  const src = path.join(srcDir, c.from);
  const dest = path.join(destDir, c.to);
  if (!fs.existsSync(src)) {
    console.error(`copy-pdfjs: no existe ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
  console.log(`copy-pdfjs: ${c.from} -> ${path.relative(process.cwd(), dest)}`);
}
