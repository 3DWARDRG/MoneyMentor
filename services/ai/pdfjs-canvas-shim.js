// pdfjs-canvas-shim.js
//
// Metro no puede empaquetar el binario nativo de @napi-rs/canvas, que pdfjs
// solo requiere en la ruta de NODE (nunca se ejecuta en React Native).
// Este stub permite que Metro resuelva la importación sin cargar código nativo.
module.exports = {};
